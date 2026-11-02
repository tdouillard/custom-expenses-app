import { dialogMixin } from '../../core/dialog.js';
import { addSettlement } from '../../core/settlements.js';

export const settleDialog = () => ({
  ...dialogMixin,
  form: { from: '', to: '', amount: '' },

  open() {
    const members = this.$store.data.state.members;
    this.form = { from: members[0] ?? '', to: members[1] ?? members[0] ?? '', amount: '' };
    this.openDialog();
  },

  async submit() {
    const result = await this.$store.data.commit((s) => addSettlement(s, this.form));
    if (result.error) this.error = result.error;
    else this.closeDialog();
  },
});
