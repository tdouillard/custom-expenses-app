import { avatarPath } from '../core/avatar.js';

/* Authentication state shared by every component. `client` is a SupabaseClient. */
export function createAuthStore(client, { location = globalThis.location, history = globalThis.history } = {}) {
  return {
    user: null,
    ready: false,
    email: '',
    password: '',
    error: '',
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

    async submit() {
      this.error = '';
      this.busy = true;
      try {
        await client.signIn(this.email.trim(), this.password);
        this.user = client.user;
        if (this.user) this.password = '';
      } catch (e) {
        this.error = e.message;
      } finally {
        this.busy = false;
      }
    },

    get meta() { return this.user?.user_metadata || {}; },
    get displayName() { return this.meta.username || (this.user?.email || '').split('@')[0]; },
    get initials() {
      const parts = this.displayName.split(/[._\-+\s]+/).filter(Boolean);
      return (parts.length > 1 ? parts[0][0] + parts[1][0] : this.displayName.slice(0, 2) || '?').toUpperCase();
    },

    /* Each of these throws an ApiError with a readable message on failure. */
    async saveProfile({ username, language }) {
      this.user = await client.updateUser({ data: { username: username.trim(), language } });
    },
    /* Emails a one-time code to the current address; the code must be given back to changeEmail. */
    async requestEmailCode() { await client.reauthenticate(); },
    async changeEmail(email, code) {
      this.user = await client.updateUser({ email: email.trim(), nonce: code }, { redirectTo: location?.origin + location?.pathname });
    },
    async signOutOthers() { await client.signOutOthers(); },
    async sendPasswordCode() { await client.reauthenticate(); },
    async changePassword(password, nonce) {
      this.user = await client.updateUser(nonce ? { password, nonce } : { password });
    },

    async uploadAvatar(blob) {
      await client.uploadObject('avatars', avatarPath(this.user.id), blob);
    },
    async removeAvatar() {
      await client.removeObject('avatars', avatarPath(this.user.id));
    },
    /* Short-lived link to the photo, or '' when there is none. */
    async avatarUrl() {
      if (!this.user) return '';
      try { return await client.signedUrl('avatars', avatarPath(this.user.id), 3600); } catch { return ''; }
    },

    /* Removes the photo, then the account itself (server-side checks in delete_my_account). */
    async deleteAccount() {
      await client.removeObject('avatars', avatarPath(this.user.id));
      await client.rest('/rpc/delete_my_account', { method: 'POST', body: {} });
      client.forgetSession();
      this.user = null;
    },

    async resetPassword(email) {
      await client.resetPasswordForEmail(email.trim(), {
        redirectTo: location?.origin + location?.pathname + '#/auth/reset-password',
      });
    },

    async signOut() {
      await client.signOut();
      this.user = null;
    },
  };
}
