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
      document.documentElement.lang = this.$store.auth.language;
      this.$store.data.load(); this.$store.admin.init();
    };
    this.$watch('$store.auth.user', (user) => {
      if (user) return start();
      this.$store.data.reset();
      this.$store.admin.reset();
    });
    if (this.$store.auth.user) start();
  },
});
