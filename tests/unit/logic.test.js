import test from 'node:test';
import assert from 'node:assert/strict';
import { splitEqually, computeBalances, suggestTransfers } from '../../src/core/logic.js';
import { eur, norm, parseList, balanceLabel, signClass } from '../../src/core/format.js';
import { emptyState, normalizeState, byEventDate } from '../../src/core/state.js';
import { parseCsv, parseAmount } from '../../src/core/csv.js';
import { rowStatus, filterExpenses, sumAmounts, nextOrder } from '../../src/core/expenses.js';
import { linkMember } from '../../src/core/collections.js';

test('splitEqually distributes cents', () => {
  assert.deepEqual(splitEqually(100, ['a', 'b', 'c']), { a: 33.34, b: 33.33, c: 33.33 });
});

test('balances ignore due expenses unless projected', () => {
  const state = {
    members: ['a', 'b'],
    expenses: [
      { amount: 100, paidBy: 'a', due: false, split: { a: 50, b: 50 } },
      { amount: 40, paidBy: 'b', due: true, split: { a: 20, b: 20 } },
    ],
    settlements: [],
  };
  assert.deepEqual(computeBalances(state), { a: 50, b: -50 });
  assert.deepEqual(computeBalances(state, { projected: true }), { a: 30, b: -30 });
});

test('settlements and transfers', () => {
  const state = {
    members: ['a', 'b', 'c'],
    expenses: [{ amount: 90, paidBy: 'a', due: false, split: { a: 30, b: 30, c: 30 } }],
    settlements: [{ from: 'b', to: 'a', amount: 30 }],
  };
  const bal = computeBalances(state);
  assert.deepEqual(bal, { a: 30, b: 0, c: -30 });
  assert.deepEqual(suggestTransfers(bal), [{ from: 'c', to: 'a', amount: 30 }]);
});

test('format helpers', () => {
  assert.equal(norm('  Évènement '), 'evenement');
  assert.deepEqual(parseList('a, b,,a'), ['a', 'b']);
  assert.equal(balanceLabel(0), 'à jour');
  assert.equal(signClass(-1), 'neg');
  assert.match(eur(12.5), /12,50/);
});

test('state normalisation', () => {
  assert.deepEqual(emptyState(), { members: [], events: [], expenses: [], settlements: [], memberUsers: {} });
  const s = normalizeState(null);
  assert.deepEqual(s.members, []);
  assert.ok(byEventDate({ date: '2024-01-01' }, { date: '2024-02-01' }) < 0);
});

test('csv parsing', () => {
  assert.deepEqual(parseCsv('a;b\n"c;d";e').slice(0, 2).map((r) => r.length), [2, 2]);
  assert.equal(parseAmount('12,50'), 12.5);
});

test('expense helpers', () => {
  const list = [{ amount: 10.1 }, { amount: 20.2 }];
  assert.equal(sumAmounts(list), 30.3);
  assert.equal(typeof nextOrder('na'), 'string');
  const state = { members: ['a'], events: [], settlements: [], expenses: [
    { id: 1, event: 'X', paidBy: 'a', amount: 1, due: false, split: { a: 1 } },
    { id: 2, event: 'Y', paidBy: 'a', amount: 2, due: false, split: { a: 2 } },
  ] };
  assert.equal(filterExpenses(state, { event: 'X' }).length, 1);
  assert.equal(filterExpenses(state, {}).length, 2);
});

test('linkMember renames the member to the user and keeps its expenses', () => {
  const s = { members: ['Bob', 'Al'], events: [], settlements: [], memberUsers: {}, expenses: [{ paidBy: 'Bob', split: { Bob: 5, Al: 5 } }] };
  assert.deepEqual(linkMember(s, 'u1', 'Bob', 'Robert'), {});
  assert.deepEqual(s.members, ['Robert', 'Al']);
  assert.deepEqual(s.memberUsers, { Robert: 'u1' });
  assert.equal(s.expenses[0].paidBy, 'Robert');
  assert.deepEqual(linkMember(s, 'u1', 'Al'), {});
  assert.deepEqual(s.memberUsers, { Al: 'u1' });
  assert.deepEqual(linkMember(s, 'u2', 'Al'), {});
  assert.deepEqual(s.memberUsers, { Al: 'u2' });
});

test('filterExpenses sorts by any column, defaulting to event date', () => {
  const s = {
    members: [], settlements: [], memberUsers: {},
    events: [{ name: 'B', date: '2024-01-01', recipients: [] }, { name: 'A', date: '2024-06-01', recipients: [] }],
    expenses: [
      { id: '1', event: 'A', label: 'zeta', amount: 5, paidBy: 'x' },
      { id: '2', event: 'B', label: 'alpha', amount: 50, paidBy: '' },
      { id: '3', event: 'A', label: '', amount: 20, paidBy: 'a' },
    ],
  };
  const ids = (sort) => filterExpenses(s, {}, sort).map((e) => e.id).join('');
  assert.equal(ids(null), '213');
  assert.equal(ids({ key: 'event', dir: 'desc' }), '132');
  assert.equal(ids({ key: 'amount', dir: 'desc' }), '231');
  assert.equal(ids({ key: 'label', dir: 'asc' }), '213');
  assert.equal(ids({ key: 'paidBy', dir: 'asc' }), '312');
});

test('event filter accepts several events', () => {
  const s = { members: [], settlements: [], memberUsers: {}, events: [{ name: 'A', date: '', recipients: [] }, { name: 'B', date: '', recipients: [] }, { name: 'C', date: '', recipients: [] }],
    expenses: [{ id: '1', event: 'A', amount: 1 }, { id: '2', event: 'B', amount: 1 }, { id: '3', event: 'C', amount: 1 }] };
  assert.equal(filterExpenses(s, { event: ['A', 'C'] }).map((e) => e.id).join(''), '13');
  assert.equal(filterExpenses(s, { event: [] }).length, 3);
});

test('rowStatus: orange when order pending, else red when unpaid, else green', () => {
  assert.equal(rowStatus({ due: true, order: 'waiting' }), 'row-warn');
  assert.equal(rowStatus({ due: false, order: 'waiting' }), 'row-warn');
  assert.equal(rowStatus({ due: true, order: 'na' }), 'row-due');
  assert.equal(rowStatus({ due: false, order: 'sent' }), 'row-paid');
  assert.equal(rowStatus({ due: false, order: 'na' }), 'row-paid');
});
