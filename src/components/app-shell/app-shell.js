import { t } from '../../core/i18n.js';

/* Root component: loads the user's data once signed in and clears it on sign-out. */
export const appShell = () => ({
  page: 'login', // 'login' | 'forgot-password'

  init() {
    const updatePage = () => {
      this.page = location.hash.includes('forgot') ? 'forgot-password' : 'login';
    };
    updatePage();
    window.addEventListener('hashchange', updatePage);

    const start = () => {
      const saved = this.$store.auth.meta.language;
      if (saved) this.$store.i18n.set(saved);
      this.$store.data.load(); this.$store.admin.init();
    };
    this.$watch('$store.auth.user', (user) => {
      if (user) return start();
      this.$store.data.reset();
      this.$store.admin.reset();
    });
    if (this.$store.auth.user) start();
  },

  /* Language chosen in the user menu or on the sign-in page: applied at once and saved to the account when signed in. */
  async setLanguage(code) {
    this.$store.i18n.set(code);
    if (!this.$store.auth.user) return;
    try {
      await this.$store.auth.saveProfile({ username: this.$store.auth.meta.username || '', language: code });
    } catch (e) {
      this.$store.data.error = t('language.saveError', { message: e.message });
    }
  },
});
