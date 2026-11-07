/* Column definitions drive both the table header and its cells.
   `cell` selects the cell template; `filter` makes the header a dropdown filter fed by `options`;
   `sort` makes the header sortable by the expense field of the same key; `width` sets the column width.
   `toolbar` columns are not shown in the table: their filter and sort live above it (the event is the group header). */
export const EXPENSE_COLUMNS = [
  { key: 'label', label: 'Libellé', cell: 'label', sort: true, width: '19%' },
  { key: 'event', label: 'Événement', cell: 'event', sort: true, filter: { key: 'event', options: 'events' }, toolbar: true },
  { key: 'paidBy', label: 'Payé par', cell: 'payer', sort: true, filter: { key: 'paidBy', options: 'members' }, width: '12%' },
  { key: 'recipient', label: 'Pour', cell: 'recipient', sort: true, filter: { key: 'recipient', options: 'recipients' }, width: '11%' },
  { key: 'amount', label: 'Prix', cell: 'money', sort: true, width: '9%' },
  { key: 'split', label: 'Répartition', cell: 'split', sort: true, width: '19%' },
  { key: 'due', label: 'Paiement', cell: 'payment', sort: true, filter: { key: 'due', options: 'payment' }, width: '10%' },
  { key: 'order', label: 'Commande', cell: 'order', sort: true, filter: { key: 'order', options: 'order' }, width: '13%' },
  { key: 'actions', label: '', cell: 'actions', width: '7%' },
];
