/* Authentication state shared by every component. `client` is a SupabaseClient. */
export function createAuthStore(client, { location = globalThis.location, history = globalThis.history } = {}) {
  return {
    user: null,
    ready: false,
    mode: 'login',
    email: '',
    password: '',
    error: '',
    info: '',
    busy: false,

    async init() {
      try {
        if (await client.consumeHashSession(location?.hash)) history?.replaceState(null, '', location.pathname + location.search);
      } catch { /* an invalid link just leaves the login form */ }
      if (client.user) {
        try { await client.accessToken(); } catch { /* expired session: fall back to the login form */ }
      }
      this.user = client.user;
      this.ready = true;
    },

    toggleMode() {
      this.mode = this.mode === 'login' ? 'signup' : 'login';
      this.error = '';
      this.info = '';
    },

    async submit() {
      this.error = '';
      this.info = '';
      this.busy = true;
      try {
        if (this.mode === 'signup') {
          const { confirmationRequired } = await client.signUp(this.email.trim(), this.password, location.origin + location.pathname);
          if (confirmationRequired) {
            this.info = 'Compte créé : vérifiez vos emails pour le confirmer, puis connectez-vous.';
            this.mode = 'login';
          }
        } else {
          await client.signIn(this.email.trim(), this.password);
        }
        this.user = client.user;
        if (this.user) this.password = '';
      } catch (e) {
        this.error = e.message;
      } finally {
        this.busy = false;
      }
    },

    async signOut() {
      await client.signOut();
      this.user = null;
    },
  };
}
