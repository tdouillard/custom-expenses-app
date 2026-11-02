/* Column definitions drive both the table header and its cells.
   `cell` selects the cell template; `filter` makes the header a dropdown filter fed by `options`. */
export const EXPENSE_COLUMNS = [
  { key: 'select', label: '', cell: 'select' },
  { key: 'label', label: 'Libellé', cell: 'text' },
  { key: 'event', label: 'Événement', cell: 'text', filter: { key: 'event', options: 'events' } },
  { key: 'recipient', label: 'Pour', cell: 'text', filter: { key: 'recipient', options: 'recipients' } },
  { key: 'paidBy', label: 'Payé par', cell: 'text', filter: { key: 'paidBy', options: 'members' } },
  { key: 'amount', label: 'Prix', cell: 'money' },
  { key: 'split', label: 'Répartition', cell: 'split' },
  { key: 'comment', label: 'Commentaire', cell: 'comment' },
  { key: 'due', label: 'Paiement', cell: 'payment', filter: { key: 'due', options: 'payment' } },
  { key: 'order', label: 'Commande', cell: 'order', filter: { key: 'order', options: 'order' } },
  { key: 'actions', label: '', cell: 'actions' },
];
