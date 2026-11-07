/* Root component: loads the user's data once signed in and clears it on sign-out. */
export const appShell = () => ({
  init() {
    const start = () => { this.$store.data.load(); this.$store.admin.init(); };
    this.$watch('$store.auth.user', (user) => {
      if (user) return start();
      this.$store.data.reset();
      this.$store.admin.reset();
    });
    if (this.$store.auth.user) start();
  },
});
