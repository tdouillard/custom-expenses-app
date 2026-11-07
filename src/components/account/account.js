import { avatarProblem, toAvatarBlob } from '../../core/avatar.js';

const idle = () => ({ ok: '', error: '', busy: false });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_COOLDOWN_MS = 60_000;

/* Settings page: photo, username and language (saved together), email change with an emailed code,
   password reset link, sign-out of other devices and account deletion. Server-side checks are in supabase/schema.sql. */
export const accountPage = () => ({
  section: 'profile',
  username: '',
  language: 'en',
  email: '',
  code: '',
  codeSent: false,
  deleteEmail: '',
  photoUrl: '',
  profile: idle(),
  photo: idle(),
  emailState: idle(),
  passwordState: idle(),
  sessionsState: idle(),
  deleteState: idle(),
  resetAt: 0,

  init() {
    this.fill();
    this.$watch('$store.auth.user', () => this.fill());
    this.loadPhoto();
  },

  fill() {
    const auth = this.$store.auth;
    this.username = auth.meta.username || '';
    this.language = this.savedLanguage;
  },

  get savedLanguage() { return this.$store.auth.meta.language || this.$store.i18n.lang; },

  /* Number of profile fields that differ from what is saved. */
  get pending() {
    return (this.username.trim() !== (this.$store.auth.meta.username || '')) + (this.language !== this.savedLanguage);
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

  goTo(id) {
    this.section = id;
    document.getElementById('account-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  discard() {
    this.fill();
    this.profile = idle();
  },

  async saveProfile() {
    const language = this.language;
    const done = await this.run(this.profile, () => this.$store.auth.saveProfile({ username: this.username, language }),
      () => this.$t('account.saved'));
    if (done) this.$store.i18n.set(language);
  },

  async loadPhoto() {
    this.photoUrl = await this.$store.auth.avatarUrl();
  },

  /* The picked file is checked, then redrawn as a JPEG (which drops its metadata) before upload. */
  async uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = avatarProblem(file);
    if (problem) {
      this.photo = { ok: '', error: this.$t(problem), busy: false };
      return;
    }
    this.photo = { ok: '', error: '', busy: true };
    try {
      await this.$store.auth.uploadAvatar(await toAvatarBlob(file));
      this.photoUrl = await this.$store.auth.avatarUrl();
      this.photo.ok = this.$t('account.photoSaved');
    } catch {
      this.photo.error = this.$t('account.photoFailed');
    } finally {
      this.photo.busy = false;
    }
  },

  async removePhoto() {
    if (await this.run(this.photo, () => this.$store.auth.removeAvatar(), () => this.$t('account.photoRemoved'))) {
      this.photoUrl = '';
    }
  },

  /* Step 1: a code is emailed to the current address (re-authentication). */
  async sendCode() {
    const next = this.email.trim();
    if (!EMAIL.test(next)) { this.emailState.error = this.$t('account.emailInvalid'); return; }
    if (next.toLowerCase() === this.$store.auth.user.email.toLowerCase()) { this.emailState.error = this.$t('account.emailSame'); return; }
    const sent = await this.run(this.emailState, () => this.$store.auth.requestEmailCode(),
      () => this.$t('account.codeSent', { email: this.$store.auth.user.email }));
    if (sent) this.codeSent = true;
  },

  cancelEmail() {
    Object.assign(this, { codeSent: false, code: '' });
    this.emailState = idle();
  },

  /* Step 2: the new address is applied with the code. It only takes effect after both confirmation links. */
  async changeEmail() {
    const code = this.code.trim();
    if (!code) { this.emailState.error = this.$t('account.codeEmpty'); return; }
    const done = await this.run(this.emailState, () => this.$store.auth.changeEmail(this.email, code), () => this.$t('account.emailSent'));
    if (done) Object.assign(this, { email: '', code: '', codeSent: false });
  },

  async forgotPassword() {
    if (Date.now() < this.resetAt) { this.passwordState.error = this.$t('account.resetWait'); return; }
    const sent = await this.run(this.passwordState, () => this.$store.auth.resetPassword(this.$store.auth.user.email),
      () => this.$t('account.resetSent'));
    if (sent) this.resetAt = Date.now() + RESET_COOLDOWN_MS;
  },

  signOutOthers() {
    return this.run(this.sessionsState, () => this.$store.auth.signOutOthers(), () => this.$t('account.sessionsEnded'));
  },

  get canDelete() {
    const typed = this.deleteEmail.trim().toLowerCase();
    return typed !== '' && typed === (this.$store.auth.user?.email || '').toLowerCase();
  },

  async deleteAccount() {
    if (!this.canDelete) return;
    await this.run(this.deleteState, () => this.$store.auth.deleteAccount(), () => '');
  },
});
