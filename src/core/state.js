import { norm } from './format.js';

export const emptyState = () => ({ members: [], events: [], expenses: [], settlements: [] });

/* Accepts older shapes (events as plain strings, missing dates/settlements) and returns a complete state. */
export function normalizeState(raw) {
  const state = { ...emptyState(), ...(raw || {}) };
  state.members = [...state.members];
  state.expenses = [...state.expenses];
  state.settlements = [...state.settlements];
  state.events = state.events.map((ev) => (typeof ev === 'string'
    ? { name: ev, date: '', recipients: [...new Set(state.expenses.filter((x) => x.event === ev && x.recipient).map((x) => x.recipient))] }
    : { date: '', recipients: [], ...ev }));
  return state;
}

const NO_DATE = '9999-12-31';
export const byEventDate = (a, b) => (a.date || NO_DATE).localeCompare(b.date || NO_DATE);

export const findEvent = (state, name) => state.events.find((e) => norm(e.name) === norm(name));

/* Unique event names, earliest event first (undated last). */
export const eventNames = (state) => [...new Set([...state.events].sort(byEventDate).map((e) => e.name))];

export const eventDate = (state, name) => findEvent(state, name)?.date || '';
