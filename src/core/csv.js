import { norm } from './format.js';
import { round, splitEqually } from './logic.js';
import { newId } from './expenses.js';
import { t } from './i18n.js';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const firstLine = text.split('\n')[0];
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const endRow = () => {
    row.push(cell);
    cell = '';
    if (row.some((x) => x.trim())) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else cell += c;
  }
  endRow();
  return rows;
}

/* Reads a CSV file buffer as UTF-8, falling back to Windows-1252 (Excel exports), without BOM. */
export function decodeCsv(buffer) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder('windows-1252').decode(buffer);
  }
  return text.replace(/^\uFEFF/, '');
}

export function parseAmount(s) {
  const m = String(s ?? '').replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (!m) return NaN;
  const n = parseFloat(m.includes(',') ? m.replace(/\./g, '').replace(',', '.') : m);
  return Number.isFinite(n) ? n : NaN;
}

function findMember(members, name) {
  const n = norm(name);
  if (!n) return null;
  return members.find((m) => norm(m) === n)
    || members.find((m) => norm(m).startsWith(n) || n.startsWith(norm(m))) || null;
}

const COLUMN_PATTERNS = {
  label: /^(cadeau|libelle|label|depense|gift|bezeichnung|ausgabe)/,
  amount: /^(montant|amount|prix|betrag)/,
  payer: /^(paye par|paid|payeur|bezahlt|zahler)/,
  rest: /^(restant|remaining|rest)/,
  status: /^(statut|status|commentaire|comment|kommentar)/,
};

/* Turns CSV text into new expenses for `event` (split equally among all members).
   Returns { added, skipped } or { error } when the required columns are missing. */
export function importExpenses(state, text, event) {
  const rows = parseCsv(text);
  const head = (rows.shift() || []).map(norm);
  const idx = Object.fromEntries(Object.entries(COLUMN_PATTERNS).map(([k, re]) => [k, head.findIndex((h) => re.test(h))]));
  if (idx.label < 0 || idx.amount < 0 || idx.payer < 0) {
    return { error: t('import.columns') };
  }
  const added = [];
  const skipped = [];
  const exists = (x) => state.expenses.concat(added).some((e) => e.label === x.label && e.amount === x.amount && e.paidBy === x.paidBy && e.event === event);
  rows.forEach((r, n) => {
    const label = (r[idx.label] || '').trim();
    const amount = round(parseAmount(r[idx.amount]));
    const payer = findMember(state.members, r[idx.payer]);
    if (!label || !(amount > 0)) {
      skipped.push(t('csv.skippedLine', { line: n + 2, label: label || '?' }));
      return;
    }
    if (!payer) {
      skipped.push(t('csv.skippedPayer', { line: n + 2, label, name: r[idx.payer] || '' }));
      return;
    }
    if (exists({ label, amount, paidBy: payer })) { skipped.push(t('csv.skippedDuplicate', { line: n + 2, label })); return; }
    const rest = idx.rest >= 0 ? parseAmount(r[idx.rest]) : 0;
    added.push({
      id: newId(), label, event, recipient: '', paidBy: payer, amount,
      split: splitEqually(amount, state.members), due: rest > 0, order: 'na',
      comment: idx.status >= 0 ? (r[idx.status] || '').trim() : '',
    });
  });
  return { added, skipped };
}
