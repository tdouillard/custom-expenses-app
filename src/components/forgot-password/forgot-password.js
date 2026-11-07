const idle = () => ({ ok: '', error: '', busy: false });

/* Forgot password flow: email request and password reset. */
export const forgotPasswordPage = () => ({
  step: location.hash.includes('reset') ? 'reset' : 'email',
  email: '',
  password: '',
  confirm: '',
  state: idle(),

  async sendReset() {
    if (!this.email.trim()) { this.state.error = this.$t('forgot.errEmail'); return; }
    const done = await this.run(() => this.$store.auth.resetPassword(this.email),
      () => this.$t('forgot.emailSent'));
    if (done) { this.email = ''; this.step = 'wait'; }
  },

  async reset() {
    if (this.password.length < 6) { this.state.error = this.$t('forgot.errShort'); return; }
    if (this.password !== this.confirm) { this.state.error = this.$t('forgot.errMismatch'); return; }
    const done = await this.run(() => this.$store.auth.changePassword(this.password),
      () => this.$t('forgot.passwordChanged'));
    if (done) { this.password = ''; this.confirm = ''; this.step = 'done'; setTimeout(() => { location.hash = '#'; }, 2000); }
  },

  async run(action, success) {
    Object.assign(this.state, { ok: '', error: '', busy: true });
    try {
      await action();
      this.state.ok = success();
      return true;
    } catch (e) {
      this.state.error = e.message;
      return false;
    } finally {
      this.state.busy = false;
    }
  },
});
