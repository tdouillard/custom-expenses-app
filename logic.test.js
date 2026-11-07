const test = require('node:test');
const assert = require('node:assert');
const L = require('./public/logic.js');

test('splitEqually distributes cents', () => {
  const s = L.splitEqually(100, ['a', 'b', 'c']);
  assert.deepStrictEqual(s, { a: 33.34, b: 33.33, c: 33.33 });
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
  assert.deepStrictEqual(L.computeBalances(state), { a: 50, b: -50 });
  assert.deepStrictEqual(L.computeBalances(state, { projected: true }), { a: 30, b: -30 });
});

test('settlements and transfers', () => {
  const state = {
    members: ['a', 'b', 'c'],
    expenses: [{ amount: 90, paidBy: 'a', due: false, split: { a: 30, b: 30, c: 30 } }],
    settlements: [{ from: 'b', to: 'a', amount: 30 }],
  };
  const bal = L.computeBalances(state);
  assert.deepStrictEqual(bal, { a: 30, b: 0, c: -30 });
  assert.deepStrictEqual(L.suggestTransfers(bal), [{ from: 'c', to: 'a', amount: 30 }]);
});
