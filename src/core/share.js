import { balanceLabel, eur, fmtDate, signedEur } from './format.js';
import { computeBalances, computeTotals, suggestTransfers } from './logic.js';
import { filterExpenses, rowStatus, sumAmounts } from './expenses.js';
import { eventDate } from './state.js';

const STATUS_ICON = { 'row-paid': '🟢', 'row-warn': '🟠', 'row-due': '🔴' };

/* Messengers render narrow / no-break spaces as odd glyphs, so use plain spaces. */
const plain = (text) => text.replace(/[\u202f\u00a0]/g, ' ');

/* Condensed, plain-text copy of the dashboard (balances, transfers, settlements, totals, expenses by event)
   that pastes cleanly into Signal, WhatsApp, Discord… The members and events lists are left out. */
export function buildShareMessage(state) {
  const balances = computeBalances(state, { projected: true });
  const transfers = suggestTransfers(balances);
  const { rows, total } = computeTotals(state);
  const lines = ['💸 Dépenses & remboursements', ''];

  lines.push('📊 Balances');
  if (!state.members.length) lines.push('• Aucun membre');
  state.members.forEach((m) => lines.push(`• ${m} : ${signedEur(balances[m])} (${balanceLabel(balances[m])})`));

  lines.push('', '🔁 Pour tout régler');
  if (!transfers.length) lines.push('• Tout est réglé 🎉');
  transfers.forEach((t) => lines.push(`• ${t.from} → ${t.to} : ${eur(t.amount)}`));

  const settlements = state.settlements || [];
  if (settlements.length) {
    lines.push('', '✅ Remboursements déjà effectués');
    settlements.forEach((s) => lines.push(`• ${s.from} → ${s.to} : ${eur(s.amount)}${s.date ? ` (${fmtDate(s.date)})` : ''}`));
  }

  lines.push('', '👥 Totaux par membre (payé / part)');
  rows.forEach((r) => lines.push(`• ${r.member} : ${eur(r.paid)} / ${eur(r.share)}`));
  lines.push(`• Total : ${eur(total.paid)} / ${eur(total.share)}`);

  const expenses = filterExpenses(state);
  lines.push('', '🧾 Dépenses');
  if (!expenses.length) lines.push('• Aucune dépense');
  const byEvent = new Map();
  expenses.forEach((e) => byEvent.set(e.event, [...(byEvent.get(e.event) || []), e]));
  byEvent.forEach((list, event) => {
    const date = eventDate(state, event);
    lines.push('', `🗓️ ${event}${date ? ` (${fmtDate(date)})` : ''} — ${eur(sumAmounts(list))}`);
    list.forEach((e) => {
      const who = [e.paidBy && `payé par ${e.paidBy}`, e.recipient && `pour ${e.recipient}`].filter(Boolean).join(', ');
      const repartition = Object.entries(e.split || {}).map(([m, v]) => `${m} ${eur(v)}`).join(' · ');
      lines.push(`${STATUS_ICON[rowStatus(e)]} ${e.label} — ${eur(e.amount)}${repartition ? ` (${repartition})` : ''}${who ? ` — ${who}` : ''}`);
    });
  });
  lines.push('', '🟢 payé · 🟠 commande en attente · 🔴 à payer');
  return plain(lines.join('\n'));
}
