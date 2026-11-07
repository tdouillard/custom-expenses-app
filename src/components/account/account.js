const idle = () => ({ ok: '', error: '', busy: false });

/* Account page: profile (username, language) and email change. Password reset uses forgot password flow. */
export const accountPage = () => ({
  username: '',
  language: 'fr',
  email: '',
  profile: idle(),
  emailState: idle(),

  init() {
    this.fill();
    this.$watch('$store.auth.user', () => this.fill());
  },

  fill() {
    const auth = this.$store.auth;
    this.username = auth.meta.username || '';
    this.language = auth.language;
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
    await this.run(this.profile, () => this.$store.auth.saveProfile({ username: this.username, language: this.language }), () => 'Profil enregistré.');
    document.documentElement.lang = this.$store.auth.language;
  },

  async changeEmail() {
    const next = this.email.trim();
    if (!next || next.toLowerCase() === this.$store.auth.user.email.toLowerCase()) {
      this.emailState.error = 'Saisissez une nouvelle adresse.';
      return;
    }
    const done = await this.run(this.emailState, () => this.$store.auth.changeEmail(next),
      () => 'Un email de confirmation a été envoyé. Ouvrez le lien pour valider le changement.');
    if (done) this.email = '';
  },
});
