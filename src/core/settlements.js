/* Settlement (reimbursement) rules. Writes into `state` only when valid. */
export function addSettlement(state, { from, to, amount, date }) {
  const value = Math.round(parseFloat(amount) * 100) / 100;
  if (!from || !to) return { error: 'Choisissez deux personnes.' };
  if (from === to) return { error: 'Choisissez deux personnes différentes.' };
  if (!(value > 0)) return { error: 'Saisissez un montant positif.' };
  state.settlements.push({ from, to, amount: value, date: date || new Date().toISOString().slice(0, 10) });
  return {};
}

export function removeSettlement(state, index) {
  state.settlements.splice(index, 1);
  return {};
}
