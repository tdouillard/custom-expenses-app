import { eventDate } from './state.js';

export const ORDER = {
  na: { label: 'Non nécessaire', cls: 'b-na' },
  waiting: { label: 'En attente', cls: 'b-warn' },
  sent: { label: 'Envoyé', cls: 'b-ok' },
};
export const ORDER_CYCLE = Object.keys(ORDER);
export const PAYMENT = {
  due: { label: 'À payer', cls: 'b-bad' },
  paid: { label: 'Payé', cls: 'b-ok' },
};

const toOptions = (map) => Object.entries(map).map(([value, { label }]) => ({ value, label }));
export const ORDER_OPTIONS = toOptions(ORDER);
export const PAYMENT_OPTIONS = toOptions(PAYMENT);

export const nextOrder = (order) => ORDER_CYCLE[(ORDER_CYCLE.indexOf(order) + 1) % ORDER_CYCLE.length];
export const orderInfo = (order) => ORDER[order] || ORDER.na;
export const paymentInfo = (e) => (e.due ? PAYMENT.due : PAYMENT.paid);

const NO_DATE = '9999-12-31';

const MATCHERS = {
  event: (e, v) => e.event === v,
  recipient: (e, v) => e.recipient === v,
  paidBy: (e, v) => e.paidBy === v,
  due: (e, v) => (v === 'due') === !!e.due,
  order: (e, v) => e.order === v,
};

/* Expenses matching every non-empty filter, sorted by the date of their event. */
export function filterExpenses(state, filters = {}) {
  const active = Object.entries(filters).filter(([k, v]) => v && MATCHERS[k]);
  return state.expenses
    .filter((e) => active.every(([k, v]) => MATCHERS[k](e, v)))
    .sort((a, b) => (eventDate(state, a.event) || NO_DATE).localeCompare(eventDate(state, b.event) || NO_DATE));
}

export const sumAmounts = (list) => Math.round(list.reduce((s, e) => s + e.amount, 0) * 100) / 100;

export const participants = (e, members) => members.filter((m) => (e.split?.[m] || 0) > 0);

export const newId = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
