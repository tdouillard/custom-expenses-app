/* Column definitions drive both the table header and its cells.
   `cell` selects the cell template; `filter` makes the header a dropdown filter fed by `options`;
   `sort` makes the header sortable by the expense field of the same key; `width` sets the column width.
   `toolbar` columns are not shown in the table: their filter and sort live above it (the event is the group header).
   `label` is a translation key. */
export const EXPENSE_COLUMNS = [
  { key: 'label', label: 'col.label', cell: 'label', sort: true, width: '19%' },
  { key: 'event', label: 'col.event', cell: 'event', sort: true, filter: { key: 'event', options: 'events' }, toolbar: true },
  { key: 'paidBy', label: 'col.paidBy', cell: 'payer', sort: true, filter: { key: 'paidBy', options: 'members' }, width: '12%' },
  { key: 'recipient', label: 'col.recipient', cell: 'recipient', sort: true, filter: { key: 'recipient', options: 'recipients' }, width: '11%' },
  { key: 'amount', label: 'col.amount', cell: 'money', sort: true, width: '9%' },
  { key: 'split', label: 'col.split', cell: 'split', sort: true, width: '19%' },
  { key: 'due', label: 'col.due', cell: 'payment', sort: true, filter: { key: 'due', options: 'payment' }, width: '10%' },
  { key: 'order', label: 'col.order', cell: 'order', sort: true, filter: { key: 'order', options: 'order' }, width: '13%' },
  { key: 'actions', label: '', cell: 'actions', width: '7%' },
];
