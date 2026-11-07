import { dialogMixin } from '../../core/dialog.js';
import { buildShareMessage } from '../../core/share.js';

/* Popup with a ready-to-paste summary of the dashboard. */
export const shareDialog = () => ({
  ...dialogMixin,
  message: '',
  copied: false,
  canShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',

  open() {
    this.message = buildShareMessage(this.$store.data.state);
    this.copied = false;
    this.openDialog();
  },

  async copy() {
    try {
      await navigator.clipboard.writeText(this.message);
    } catch {
      this.$refs.text.select();
      document.execCommand('copy');
    }
    this.copied = true;
  },

  async share() {
    try { await navigator.share({ text: this.message }); } catch { /* cancelled */ }
  },
});
