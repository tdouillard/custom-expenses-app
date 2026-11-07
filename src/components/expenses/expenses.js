import { EXPENSE_COLUMNS } from '../../config/expense-columns.js';
import { ORDER_OPTIONS, PAYMENT_OPTIONS, filterExpenses, orderInfo, participants, paymentInfo, rowStatus, sumAmounts } from '../../core/expenses.js';
import { eventDate } from '../../core/state.js';

const fromList = (list) => list.map((value) => ({ value, label: value }));

export const expenses = () => ({
  columns: EXPENSE_COLUMNS.filter((c) => !c.toolbar),
  eventColumn: EXPENSE_COLUMNS.find((c) => c.toolbar),
  filters: { event: [], recipient: '', paidBy: '', due: '', order: '' },
  sort: null,
  orderInfo,
  paymentInfo,

  init() {
    this.$watch('$store.data.state', () => this.prune());
  },

  get state() { return this.$store.data.state; },
  get rows() { return filterExpenses(this.state, this.filters, this.sort); },
  get total() { return sumAmounts(this.rows); },
  /* Expenses bucketed per event. Events keep their date order (reversed when sorting by event);
     any other sort orders the rows inside each event. */
  get groups() {
    const byEvent = this.sort?.key === 'event';
    const order = filterExpenses(this.state, this.filters, { key: 'event', dir: byEvent ? this.sort.dir : 'asc' });
    const buckets = new Map();
    filterExpenses(this.state, this.filters, byEvent ? null : this.sort).forEach((e) => {
      if (!buckets.has(e.event)) buckets.set(e.event, []);
      buckets.get(e.event).push(e);
    });
    return [...new Set(order.map((e) => e.event))].map((event) => {
      const rows = buckets.get(event);
      return { event, date: eventDate(this.state, event), rows, total: sumAmounts(rows) };
    });
  },
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

  eventSummary() {
    const n = this.filters.event.length;
    return n === 0 ? this.$t('expenses.allEvents') : n === 1 ? this.filters.event[0] : this.$t('expenses.eventsSelected', { count: n });
  },
  toggleEvent(name) {
    const list = this.filters.event;
    this.filters.event = list.includes(name) ? list.filter((x) => x !== name) : [...list, name];
  },

  /* Drops filters that no longer match anything after the data changed. */
  prune() {
    EXPENSE_COLUMNS.filter((c) => c.filter).forEach(({ filter }) => {
      const valid = (v) => this.optionsFor(filter.options).some((o) => o.value === v);
      const current = this.filters[filter.key];
      if (Array.isArray(current)) this.filters[filter.key] = current.filter(valid);
      else if (current && !valid(current)) this.filters[filter.key] = '';
    });
  },

  /* Clicking a header cycles ascending → descending → default order (by event date). */
  toggleSort(key) {
    if (this.sort?.key !== key) this.sort = { key, dir: 'asc' };
    else if (this.sort.dir === 'asc') this.sort = { key, dir: 'desc' };
    else this.sort = null;
  },
  sortDir(key) { return this.sort?.key === key ? this.sort.dir : ''; },
  ariaSort(key) { return { asc: 'ascending', desc: 'descending' }[this.sortDir(key)] || 'none'; },

  participants(e) { return participants(e, this.state.members); },
  rowStatus,
  initials(name) { return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase(); },
  avatarStyle(name) {
    const hue = [...String(name || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
    return `background:linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 50%))`;
  },

  edit(e) { this.$dispatch('open-expense', { id: e.id }); },

  remove(e) {
    if (!confirm(this.$t('expenses.confirmDelete'))) return;
    return this.$store.data.commit((s) => { s.expenses = s.expenses.filter((x) => x.id !== e.id); });
  },
});
