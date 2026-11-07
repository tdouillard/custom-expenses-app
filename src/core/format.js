import { locale, t } from './i18n.js';

export const eur = (n) => Number(n || 0).toLocaleString(locale(), { style: 'currency', currency: 'EUR' });

export const signedEur = (n) => (n > 0 ? '+' : '') + eur(n);

export const fmtDate = (d) => (d
  ? new Date(`${d}T00:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })
  : '');

/* Lower-case, accent-free, trimmed: used to compare names. */
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export const parseList = (s) => [...new Set(String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean))];

/* Translation key: 'balance.owed' | 'balance.owes' | 'balance.settled'. */
export const balanceLabel = (n) => (n > 0 ? 'balance.owed' : n < 0 ? 'balance.owes' : 'balance.settled');

export const balanceText = (n) => t(balanceLabel(n));

export const signClass = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
