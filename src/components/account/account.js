const idle = () => ({ ok: '', error: '', busy: false });

/* Account page: profile (username, language) and email change. Password reset uses forgot password flow. */
export const accountPage = () => ({
  username: '',
  language: 'en',
  email: '',
  profile: idle(),
  emailState: idle(),
  passwordState: idle(),

  init() {
    this.fill();
    this.$watch('$store.auth.user', () => this.fill());
  },

  fill() {
    const auth = this.$store.auth;
    this.username = auth.meta.username || '';
    this.language = this.$store.i18n.lang;
  },

  async run(state, action, success) {
    Object.assign(state, { ok: '', error: '', busy: true });
    try {
      await action();
      state.ok = success();
      return true;
    } catch (e) {
      state.error = e.message;
      return false;
    } finally {
      state.busy = false;
    }
  },

  async saveProfile() {
    const language = this.language;
    const done = await this.run(this.profile, () => this.$store.auth.saveProfile({ username: this.username, language }),
      () => this.$t('account.saved'));
    if (done) this.$store.i18n.set(language);
  },

  async changeEmail() {
    const next = this.email.trim();
    if (!next || next.toLowerCase() === this.$store.auth.user.email.toLowerCase()) {
      this.emailState.error = this.$t('account.emailEmpty');
      return;
    }
    const done = await this.run(this.emailState, () => this.$store.auth.changeEmail(next),
      () => this.$t('account.emailSent'));
    if (done) this.email = '';
  },

  async forgotPassword() {
    await this.run(this.passwordState, () => this.$store.auth.resetPassword(this.$store.auth.user.email),
      () => this.$t('forgot.emailSent'));
  },
});
