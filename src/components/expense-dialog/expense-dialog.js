import { dialogMixin } from '../../core/dialog.js';
import { NEW_EVENT, applySplit, formFromExpense, recipientOptions, splitTotal, submitExpense } from '../../core/expense-form.js';
import { round } from '../../core/logic.js';
import { ORDER_OPTIONS } from '../../core/expenses.js';

export const expenseDialog = () => ({
  ...dialogMixin,
  NEW_EVENT,
  orders: ORDER_OPTIONS,
  form: null,

  get state() { return this.$store.data.state; },
  get recipients() { return this.form ? recipientOptions(this.state, this.form) : []; },
  get splitTotal() { return this.form ? splitTotal(this.form) : 0; },
  get amount() { return round(parseFloat(this.form?.amount) || 0); },
  get splitMatches() { return this.splitTotal === this.amount; },

  open({ id } = {}) {
    this.form = formFromExpense(this.state, this.state.expenses.find((e) => e.id === id) ?? null);
    this.openDialog();
  },

  recompute() { applySplit(this.form); },

  onEventChange() {
    this.recompute();
    if (this.form.recipient && !this.recipients.includes(this.form.recipient)) this.form.recipient = '';
  },

  async submit() {
    const result = await this.$store.data.commit((s) => submitExpense(s, this.form));
    if (result.error) this.error = result.error;
    else this.closeDialog();
  },
});
