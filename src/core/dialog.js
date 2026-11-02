/* Shared behaviour of every <dialog> component: it must declare x-ref="dlg" and an `error` string. */
export const dialogMixin = {
  error: '',
  openDialog() {
    this.error = '';
    if (!this.$refs.dlg.open) this.$refs.dlg.showModal();
  },
  closeDialog() {
    this.$refs.dlg.close();
  },
};
