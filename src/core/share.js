import { balanceText, eur, fmtDate, signedEur } from './format.js';
import { computeBalances, computeTotals, suggestTransfers } from './logic.js';
import { filterExpenses, rowStatus, sumAmounts } from './expenses.js';
import { eventDate } from './state.js';
import { t } from './i18n.js';

const STATUS_ICON = { 'row-paid': '🟢', 'row-warn': '🟠', 'row-due': '🔴' };

/* Messengers render narrow / no-break spaces as odd glyphs, so use plain spaces. */
const plain = (text) => text.replace(/[\u202f\u00a0]/g, ' ');

/* Condensed, plain-text copy of the dashboard (balances, transfers, settlements, totals, expenses by event)
   that pastes cleanly into Signal, WhatsApp, Discord… The members and events lists are left out. */
export function buildShareMessage(state) {
  const balances = computeBalances(state, { projected: true });
  const transfers = suggestTransfers(balances);
  const { rows, total } = computeTotals(state);
  const lines = [`💸 ${t('app.title')}`, ''];

  lines.push(`📊 ${t('balances.title')}`);
  if (!state.members.length) lines.push(`• ${t('collections.noMembers')}`);
  state.members.forEach((m) => lines.push(`• ${m} : ${signedEur(balances[m])} (${balanceText(balances[m])})`));

  lines.push('', `🔁 ${t('balances.settleUp')}`);
  if (!transfers.length) lines.push(`• ${t('share.noTransfers')}`);
  transfers.forEach((x) => lines.push(`• ${x.from} → ${x.to} : ${eur(x.amount)}`));

  const settlements = state.settlements || [];
  if (settlements.length) {
    lines.push('', t('share.settledDone'));
    settlements.forEach((s) => lines.push(`• ${s.from} → ${s.to} : ${eur(s.amount)}${s.date ? ` (${fmtDate(s.date)})` : ''}`));
  }

  lines.push('', t('share.totalsPerMember'));
  rows.forEach((r) => lines.push(`• ${r.member} : ${eur(r.paid)} / ${eur(r.share)}`));
  lines.push(`• ${t('expenses.total')} : ${eur(total.paid)} / ${eur(total.share)}`);

  const expenses = filterExpenses(state);
  lines.push('', `🧾 ${t('expenses.title')}`);
  if (!expenses.length) lines.push(`• ${t('expenses.empty')}`);
  const byEvent = new Map();
  expenses.forEach((e) => byEvent.set(e.event, [...(byEvent.get(e.event) || []), e]));
  byEvent.forEach((list, event) => {
    const date = eventDate(state, event);
    lines.push('', `🗓️ ${event}${date ? ` (${fmtDate(date)})` : ''} — ${eur(sumAmounts(list))}`);
    list.forEach((e) => {
      const who = [e.paidBy && t('share.paidBy', { name: e.paidBy }), e.recipient && t('share.forWhom', { name: e.recipient })].filter(Boolean).join(', ');
      const repartition = Object.entries(e.split || {}).map(([m, v]) => `${m} ${eur(v)}`).join(' · ');
      lines.push(`${STATUS_ICON[rowStatus(e)]} ${e.label} — ${eur(e.amount)}${repartition ? ` (${repartition})` : ''}${who ? ` — ${who}` : ''}`);
    });
  });
  lines.push('', t('share.legend'));
  return plain(lines.join('\n'));
}
