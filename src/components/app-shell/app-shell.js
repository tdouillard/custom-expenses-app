/* Root component: loads the user's data once signed in and clears it on sign-out. */
export const appShell = () => ({
  init() {
    this.$watch('$store.auth.user', (user) => (user ? this.$store.data.load() : this.$store.data.reset()));
    if (this.$store.auth.user) this.$store.data.load();
  },
});
