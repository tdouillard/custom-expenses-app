export const round = (n) => Math.round(n * 100) / 100;

/* Equal split of `amount` among `people`; the cent remainder goes to the first people. */
export function splitEqually(amount, people) {
  const out = {};
  if (!people.length) return out;
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / people.length);
  let rest = cents - base * people.length;
  people.forEach((p) => {
    out[p] = (base + (rest-- > 0 ? 1 : 0)) / 100;
  });
  return out;
}

/* Net balance per member (positive = is owed money).
   `current` counts only expenses already paid; `projected` counts all of them. */
export function computeBalances(state, { projected = false } = {}) {
  const bal = {};
  state.members.forEach((m) => (bal[m] = 0));
  state.expenses.forEach((e) => {
    if (!projected && e.due) return;
    bal[e.paidBy] = round((bal[e.paidBy] || 0) + e.amount);
    Object.entries(e.split || {}).forEach(([m, v]) => {
      bal[m] = round((bal[m] || 0) - v);
    });
  });
  (state.settlements || []).forEach((s) => {
    bal[s.from] = round((bal[s.from] || 0) + s.amount);
    bal[s.to] = round((bal[s.to] || 0) - s.amount);
  });
  return bal;
}

/* Minimal list of transfers that settles the balances. */
export function suggestTransfers(balances) {
  const cred = [];
  const debt = [];
  Object.entries(balances).forEach(([m, v]) => {
    if (v > 0.004) cred.push([m, v]);
    else if (v < -0.004) debt.push([m, -v]);
  });
  cred.sort((a, b) => b[1] - a[1]);
  debt.sort((a, b) => b[1] - a[1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < cred.length && j < debt.length) {
    const amt = round(Math.min(cred[i][1], debt[j][1]));
    if (amt > 0) out.push({ from: debt[j][0], to: cred[i][0], amount: amt });
    cred[i][1] = round(cred[i][1] - amt);
    debt[j][1] = round(debt[j][1] - amt);
    if (cred[i][1] <= 0.004) i++;
    if (debt[j][1] <= 0.004) j++;
  }
  return out;
}

const TOTAL_KEYS = ['paid', 'share', 'sent', 'received'];

/* Per-member totals (paid, share, settlements sent/received, projected balance) plus a grand total row. */
export function computeTotals(state) {
  const balances = computeBalances(state, { projected: true });
  const rows = {};
  const row = (m) => (rows[m] ??= { member: m, paid: 0, share: 0, sent: 0, received: 0 });
  state.members.forEach(row);
  state.expenses.forEach((e) => {
    row(e.paidBy).paid += e.amount;
    Object.entries(e.split || {}).forEach(([m, v]) => { row(m).share += v; });
  });
  (state.settlements || []).forEach((s) => { row(s.from).sent += s.amount; row(s.to).received += s.amount; });
  const list = Object.values(rows).map((r) => ({ ...r, balance: balances[r.member] ?? 0 }));
  const total = Object.fromEntries(TOTAL_KEYS.map((k) => [k, round(list.reduce((s, r) => s + r[k], 0))]));
  return { rows: list, total };
}
