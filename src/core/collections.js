import { norm } from './format.js';

/* Generic add / rename / delete of the collections shown in the manage dialog (members, events).
   Each handler describes how a collection is stored and which expense fields reference it. */
const HANDLERS = {
  members: {
    items: (s) => s.members.map((name) => ({ name })),
    blank: () => ({ name: '' }),
    nameAt: (s, i) => s.members[i],
    names: (s) => s.members,
    usage: (s, name) => s.expenses.filter((e) => e.paidBy === name || (e.split?.[name] || 0) > 0).length
      + s.settlements.filter((x) => x.from === name || x.to === name).length,
    insert: (s, d) => { s.members.push(d.name); },
    update(s, i, d) {
      const old = s.members[i];
      s.members[i] = d.name;
      if (old === d.name) return;
      s.expenses.forEach((e) => {
        if (e.paidBy === old) e.paidBy = d.name;
        if (e.split && old in e.split) { e.split[d.name] = e.split[old]; delete e.split[old]; }
      });
      s.settlements.forEach((x) => {
        if (x.from === old) x.from = d.name;
        if (x.to === old) x.to = d.name;
      });
    },
    remove: (s, i) => { s.members.splice(i, 1); },
  },
  events: {
    items: (s) => s.events.map((e) => ({ ...e, recipients: [...e.recipients] })),
    blank: () => ({ name: '', date: '', recipients: [] }),
    nameAt: (s, i) => s.events[i].name,
    names: (s) => s.events.map((e) => e.name),
    usage: (s, name) => s.expenses.filter((e) => e.event === name).length,
    insert: (s, d) => { s.events.push({ name: d.name, date: d.date || '', recipients: [...d.recipients] }); },
    update(s, i, d) {
      const ev = s.events[i];
      const old = ev.name;
      Object.assign(ev, { name: d.name, date: d.date || '', recipients: [...d.recipients] });
      s.expenses.forEach((e) => {
        if (e.event === old) e.event = d.name;
        if (e.event === d.name && e.recipient && !ev.recipients.includes(e.recipient)) e.recipient = '';
      });
    },
    remove: (s, i) => { s.events.splice(i, 1); },
  },
};

const LABELS = { members: 'membre', events: 'événement' };

export const itemsOf = (state, kind) => HANDLERS[kind].items(state);

/* Items with their position in the state, optionally sorted by a field (empty values last). */
export function listItems(state, kind, sortBy = null) {
  const rows = itemsOf(state, kind).map((item, index) => ({ item, index }));
  if (!sortBy) return rows;
  return rows.sort((a, b) => (a.item[sortBy] || '\uffff').localeCompare(b.item[sortBy] || '\uffff'));
}
export const blankItem = (kind) => HANDLERS[kind].blank();

function validate(state, kind, index, draft) {
  const h = HANDLERS[kind];
  const name = String(draft.name ?? '').trim();
  if (!name) return 'Saisissez un nom.';
  const clash = h.names(state).some((n, i) => i !== index && norm(n) === norm(name));
  return clash ? `Un ${LABELS[kind]} porte déjà ce nom.` : '';
}

/* index -1 adds a new item. Returns { error } without touching the state when invalid. */
export function saveItem(state, kind, index, draft) {
  const clean = { ...draft, name: String(draft.name ?? '').trim() };
  const error = validate(state, kind, index, clean);
  if (error) return { error };
  const h = HANDLERS[kind];
  if (index < 0) h.insert(state, clean); else h.update(state, index, clean);
  return {};
}

export function removeItem(state, kind, index) {
  const h = HANDLERS[kind];
  const name = h.nameAt(state, index);
  const used = h.usage(state, name);
  if (used) return { error: `« ${name} » est utilisé par ${used} élément(s) et ne peut pas être supprimé.` };
  h.remove(state, index);
  return {};
}
