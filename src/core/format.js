export const eur = (n) => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export const signedEur = (n) => (n > 0 ? '+' : '') + eur(n);

export const fmtDate = (d) => (d
  ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  : '');

/* Lower-case, accent-free, trimmed: used to compare names. */
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export const parseList = (s) => [...new Set(String(s ?? '').split(',').map((x) => x.trim()).filter(Boolean))];

export const balanceLabel = (n) => (n > 0 ? 'doit recevoir' : n < 0 ? 'doit' : 'à jour');

export const signClass = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
