import { EXPENSE_COLUMNS } from '../../config/expense-columns.js';
import { ORDER_OPTIONS, PAYMENT_OPTIONS, filterExpenses, nextOrder, orderInfo, participants, paymentInfo, sumAmounts } from '../../core/expenses.js';

const fromList = (list) => list.map((value) => ({ value, label: value }));

export const expenses = () => ({
  columns: EXPENSE_COLUMNS,
  filters: { event: '', recipient: '', paidBy: '', due: '', order: '' },
  selected: [],
  orderInfo,
  paymentInfo,

  init() {
    this.$watch('$store.data.state', () => this.prune());
  },

  get state() { return this.$store.data.state; },
  get rows() { return filterExpenses(this.state, this.filters); },
  get total() { return sumAmounts(this.rows); },
  get amountIndex() { return this.columns.findIndex((c) => c.cell === 'money'); },
  get allSelected() { return this.rows.length > 0 && this.rows.every((e) => this.selected.includes(e.id)); },

  optionsFor(name) {
    const sources = {
      events: () => fromList(this.$store.data.eventNames),
      members: () => fromList(this.state.members),
      recipients: () => fromList([...new Set([...this.state.events.flatMap((e) => e.recipients), ...this.state.expenses.map((e) => e.recipient)].filter(Boolean))]),
      payment: () => PAYMENT_OPTIONS,
      order: () => ORDER_OPTIONS,
    };
    return sources[name]();
  },

  /* Drops filters and selections that no longer match anything after the data changed. */
  prune() {
    this.columns.filter((c) => c.filter).forEach(({ filter }) => {
      if (this.filters[filter.key] && !this.optionsFor(filter.options).some((o) => o.value === this.filters[filter.key])) {
        this.filters[filter.key] = '';
      }
    });
    this.selected = this.selected.filter((id) => this.state.expenses.some((e) => e.id === id));
  },

  participants(e) { return participants(e, this.state.members); },

  toggle(id) {
    this.selected = this.selected.includes(id) ? this.selected.filter((x) => x !== id) : [...this.selected, id];
  },
  toggleAll() {
    const ids = this.rows.map((e) => e.id);
    this.selected = this.allSelected ? this.selected.filter((id) => !ids.includes(id)) : [...new Set([...this.selected, ...ids])];
  },

  togglePayment(e) { return this.$store.data.commit(() => { e.due = !e.due; }); },
  cycleOrder(e) { return this.$store.data.commit(() => { e.order = nextOrder(e.order); }); },
  edit(e) { this.$dispatch('open-expense', { id: e.id }); },

  remove(e) {
    if (!confirm('Supprimer cette dépense ?')) return;
    return this.$store.data.commit((s) => { s.expenses = s.expenses.filter((x) => x.id !== e.id); });
  },
  removeSelected() {
    if (!this.selected.length || !confirm(`Supprimer ${this.selected.length} dépense(s) ?`)) return;
    const ids = this.selected;
    return this.$store.data.commit((s) => { s.expenses = s.expenses.filter((x) => !ids.includes(x.id)); });
  },
});
