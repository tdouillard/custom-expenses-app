import { normalizeState } from '../core/state.js';
import { newId } from '../core/expenses.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const byId = (list) => new Map(list.map((x) => [x.id, x]));

/* Loads what the signed-in user may see (RLS filters events and expenses) and saves only what changed. */
export class StateRepository {
  constructor(client) {
    this.client = client;
    this.base = null;
  }

  async load() {
    const [members, events, expenses, settlements] = await Promise.all([
      this.client.rest('/members?select=name&order=created_at,name'),
      this.client.rest('/events?select=id,name,date,recipients&order=created_at,name'),
      this.client.rest('/expenses?select=id,event_id,data&order=updated_at,id'),
      this.client.rest('/settlements?select=id,data&order=created_at,id'),
    ]);
    const names = new Map(events.map((e) => [e.id, e.name]));
    const state = normalizeState({
      members: members.map((m) => m.name),
      events,
      expenses: expenses.filter((x) => names.has(x.event_id)).map((x) => ({ ...x.data, id: x.id, event: names.get(x.event_id) })),
      settlements: settlements.map((x) => ({ ...x.data, id: x.id })),
    });
    this.base = clone(state);
    return state;
  }

  /* Assigns missing ids in place, then diffs `state` against the last loaded/saved copy. */
  async save(state) {
    state.events.forEach((e) => { e.id ||= newId(); });
    state.settlements.forEach((s) => { s.id ||= newId(); });
    const base = this.base || normalizeState();
    const rows = this.#rows(state);
    const old = this.#rows(base);
    const upserts = (key) => rows[key].filter((r) => !same(r, old[key].find((o) => o.id === r.id)));
    const removed = (key, id = 'id') => old[key].filter((o) => !rows[key].some((r) => r[id] === o[id]));

    const post = (table, list, conflict) => list.length && this.client.rest(`/${table}?on_conflict=${conflict}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: list,
    });
    const del = (table, column, values) => values.length && this.client.rest(
      `/${table}?${column}=in.(${values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(',')})`,
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
    );

    await post('members', rows.members.filter((m) => !old.members.some((o) => o.name === m.name)), 'name');
    await post('events', upserts('events'), 'id');
    await post('expenses', upserts('expenses'), 'id');
    await post('settlements', upserts('settlements'), 'id');
    await del('settlements', 'id', removed('settlements').map((x) => x.id));
    await del('expenses', 'id', removed('expenses').map((x) => x.id));
    await del('events', 'id', removed('events').map((x) => x.id));
    await del('members', 'name', removed('members', 'name').map((x) => x.name));
    this.base = clone(state);
  }

  #rows(state) {
    const ids = new Map(state.events.map((e) => [e.name, e.id]));
    return {
      members: state.members.map((name) => ({ name })),
      events: state.events.map((e) => ({ id: e.id, name: e.name, date: e.date || '', recipients: e.recipients || [] })),
      expenses: state.expenses.filter((x) => ids.has(x.event)).map(({ id, event, ...data }) => ({ id, event_id: ids.get(event), data })),
      settlements: state.settlements.map(({ id, ...data }) => ({ id, data })),
    };
  }
}
