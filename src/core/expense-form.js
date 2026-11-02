import { round, splitEqually } from './logic.js';
import { eventNames, findEvent } from './state.js';
import { parseList } from './format.js';
import { newId } from './expenses.js';

export const NEW_EVENT = '__new__';

export function formFromExpense(state, e = null) {
  const on = e ? Object.keys(e.split || {}).filter((m) => e.split[m] > 0) : state.members;
  const form = {
    id: e?.id ?? null,
    label: e?.label ?? '',
    event: e?.event ?? (eventNames(state)[0] ?? NEW_EVENT),
    newEvent: { name: '', date: '', people: '' },
    recipient: e?.recipient ?? '',
    paidBy: e?.paidBy ?? state.members[0] ?? '',
    amount: e?.amount ?? '',
    due: !!e?.due,
    order: e?.order ?? 'na',
    comment: e?.comment ?? '',
    mode: e ? 'custom' : 'equal',
    split: Object.fromEntries(state.members.map((m) => [m, { on: on.includes(m), amount: e?.split?.[m] ?? 0 }])),
  };
  return applySplit(form);
}

/* Keeps the per-member amounts consistent: equal mode recomputes them, unchecked members always get 0. */
export function applySplit(form) {
  const names = Object.keys(form.split).filter((m) => form.split[m].on);
  const equal = form.mode === 'equal' ? splitEqually(parseFloat(form.amount) || 0, names) : null;
  Object.entries(form.split).forEach(([m, s]) => {
    if (!s.on) s.amount = 0;
    else if (equal) s.amount = equal[m] ?? 0;
  });
  return form;
}

export const splitTotal = (form) => round(Object.values(form.split)
  .filter((s) => s.on).reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0));

/* People that can be the gift recipient: those of the chosen (or new) event, plus the current value. */
export function recipientOptions(state, form) {
  const people = form.event === NEW_EVENT
    ? parseList(form.newEvent.people)
    : (state.events.find((x) => x.name === form.event)?.recipients ?? []);
  return form.recipient && !people.includes(form.recipient) ? [...people, form.recipient] : people;
}

/* Validates the form and writes the expense (and a new event when needed) into `state`. */
export function submitExpense(state, form) {
  const isNew = form.event === NEW_EVENT;
  const typed = form.newEvent.name.trim();
  if (isNew && !typed) return { error: 'Saisissez le nom du nouvel événement.' };
  const amount = round(parseFloat(form.amount));
  if (!Number.isFinite(amount)) return { error: 'Saisissez un montant.' };
  const on = Object.keys(form.split).filter((m) => form.split[m].on);
  if (!on.length) return { error: 'Sélectionnez au moins un participant.' };
  const split = Object.fromEntries(Object.entries(form.split)
    .map(([m, s]) => [m, s.on ? round(parseFloat(s.amount) || 0) : 0]));
  const total = round(Object.values(split).reduce((a, b) => a + b, 0));
  if (total !== amount) {
    return { error: `La somme des parts des participants sélectionnés (${fmt(total)}) doit être égale au montant (${fmt(amount)}).` };
  }
  const eventName = isNew ? (findEvent(state, typed)?.name ?? typed) : form.event;
  if (isNew) {
    const people = parseList(form.newEvent.people);
    const existing = findEvent(state, eventName);
    if (existing) existing.recipients = [...new Set([...existing.recipients, ...people])];
    else state.events.push({ name: eventName, date: form.newEvent.date, recipients: people });
  }
  const data = {
    label: form.label.trim(), event: eventName, recipient: form.recipient, paidBy: form.paidBy,
    amount, split, due: form.due, order: form.order, comment: form.comment.trim(),
  };
  const target = form.id && state.expenses.find((x) => x.id === form.id);
  if (target) Object.assign(target, data);
  else state.expenses.push({ id: newId(), ...data });
  return {};
}

const fmt = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
