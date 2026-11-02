import { decodeCsv, importExpenses } from '../../core/csv.js';
import { dialogMixin } from '../../core/dialog.js';

export const importDialog = () => ({
  ...dialogMixin,
  event: '',
  result: null,

  open() {
    this.event = this.$store.data.eventNames[0] ?? '';
    this.result = null;
    this.openDialog();
  },

  async pick(changeEvent) {
    const file = changeEvent.target.files[0];
    changeEvent.target.value = '';
    if (!file) return;
    this.error = '';
    this.result = null;
    const parsed = importExpenses(this.$store.data.state, decodeCsv(await file.arrayBuffer()), this.event);
    if (parsed.error) {
      this.error = parsed.error;
      return;
    }
    if (parsed.added.length) {
      const saved = await this.$store.data.commit((s) => { s.expenses.push(...parsed.added); });
      if (saved.error) {
        this.error = saved.error;
        return;
      }
    }
    this.result = { added: parsed.added.length, skipped: parsed.skipped };
  },
});
