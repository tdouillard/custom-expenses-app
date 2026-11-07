import { locale } from './i18n.js';
import { eventDate } from './state.js';

export const ORDER = {
  na: { label: 'order.na', cls: 'b-na' },
  waiting: { label: 'order.waiting', cls: 'b-warn' },
  sent: { label: 'order.sent', cls: 'b-ok' },
};
export const ORDER_CYCLE = Object.keys(ORDER);
export const PAYMENT = {
  due: { label: 'payment.due', cls: 'b-bad' },
  paid: { label: 'payment.paid', cls: 'b-ok' },
};

const toOptions = (map) => Object.entries(map).map(([value, { label }]) => ({ value, label }));
export const ORDER_OPTIONS = toOptions(ORDER);
export const PAYMENT_OPTIONS = toOptions(PAYMENT);

export const nextOrder = (order) => ORDER_CYCLE[(ORDER_CYCLE.indexOf(order) + 1) % ORDER_CYCLE.length];
export const orderInfo = (order) => ORDER[order] || ORDER.na;
export const paymentInfo = (e) => (e.due ? PAYMENT.due : PAYMENT.paid);

/* Row status: orange = order pending, else red = unpaid, else green (paid, order sent or not needed). */
export const rowStatus = (e) => (e.order === 'waiting' ? 'row-warn' : e.due ? 'row-due' : 'row-paid');

const NO_DATE = '9999-12-31';

const MATCHERS = {
  event: (e, v) => v.includes(e.event),
  recipient: (e, v) => e.recipient === v,
  paidBy: (e, v) => e.paidBy === v,
  due: (e, v) => (v === 'due') === !!e.due,
  order: (e, v) => e.order === v,
};

const byText = (a, b) => String(a || '').localeCompare(String(b || ''), locale(), { sensitivity: 'base', numeric: true });
const byEvent = (state) => (a, b) => (eventDate(state, a.event) || NO_DATE).localeCompare(eventDate(state, b.event) || NO_DATE) || byText(a.event, b.event);
const count = (e) => Object.values(e.split || {}).filter((v) => v > 0).length;

/* One comparator per sortable column key (see config/expense-columns.js). */
const SORTERS = {
  label: (a, b) => byText(a.label, b.label),
  event: (a, b, state) => byEvent(state)(a, b),
  recipient: (a, b) => byText(a.recipient, b.recipient),
  paidBy: (a, b) => byText(a.paidBy, b.paidBy),
  amount: (a, b) => a.amount - b.amount,
  split: (a, b) => count(a) - count(b),
  comment: (a, b) => byText(a.comment, b.comment),
  due: (a, b) => Number(!!b.due) - Number(!!a.due),
  order: (a, b) => ORDER_CYCLE.indexOf(a.order || 'na') - ORDER_CYCLE.indexOf(b.order || 'na'),
};
const TEXT_KEYS = ['label', 'recipient', 'paidBy', 'comment'];

/* Expenses matching every non-empty filter (event takes a list of event names), ordered by `sort` ({ key, dir: 'asc' | 'desc' });
   by event date (then name) by default. Empty text values always come last. */
export function filterExpenses(state, filters = {}, sort = null) {
  const active = Object.entries(filters).filter(([k, v]) => (Array.isArray(v) ? v.length : v) && MATCHERS[k]);
  const { key, dir } = SORTERS[sort?.key] ? sort : { key: 'event', dir: 'asc' };
  const sign = dir === 'desc' ? -1 : 1;
  const empty = (e) => TEXT_KEYS.includes(key) && !e[key];
  return state.expenses
    .filter((e) => active.every(([k, v]) => MATCHERS[k](e, v)))
    .sort((a, b) => {
      if (empty(a) !== empty(b)) return empty(a) ? 1 : -1;
      return sign * SORTERS[key](a, b, state) || byEvent(state)(a, b);
    });
}

export const sumAmounts = (list) => Math.round(list.reduce((s, e) => s + e.amount, 0) * 100) / 100;

export const participants = (e, members) => members.filter((m) => (e.split?.[m] || 0) > 0);

export const newId = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
