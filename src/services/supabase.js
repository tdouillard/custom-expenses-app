import { t } from '../core/i18n.js';

const SESSION_KEY = 'expenses.session';
const EXPIRY_SKEW_SECONDS = 60;

/* Maps Supabase error codes to translation keys (see i18n dictionaries). */
const KNOWN_ERRORS = {
  invalid_credentials: 'error.invalid_credentials',
  email_not_confirmed: 'error.email_not_confirmed',
  user_already_exists: 'error.user_already_exists',
  weak_password: 'error.weak_password',
  over_email_send_rate_limit: 'error.over_email_send_rate_limit',
  signup_disabled: 'error.signup_disabled',
  validation_failed: 'error.validation_failed',
  same_password: 'error.same_password',
  reauthentication_needed: 'error.reauthentication_needed',
  reauthentication_not_valid: 'error.reauthentication_not_valid',
  email_exists: 'error.email_exists',
  email_address_invalid: 'error.email_address_invalid',
  not_signed_in: 'error.notSignedIn',
  recent_login_required: 'error.recent_login_required',
  last_admin: 'error.last_admin',
};

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function messageOf(data, status) {
  for (const code of [data?.error_code, data?.code, data?.message]) {
    if (KNOWN_ERRORS[code]) return t(KNOWN_ERRORS[code]);
  }
  if (/invalid login credentials/i.test(data?.msg || data?.message || '')) return t(KNOWN_ERRORS.invalid_credentials);
  return data?.msg || data?.message || data?.error_description || data?.error || `Error ${status}`;
}

/* Tiny Supabase client: GoTrue email/password auth and PostgREST calls over fetch, with a persisted session. */
export class SupabaseClient {
  constructor({ url, key, storage = globalThis.localStorage, fetchFn = (...a) => globalThis.fetch(...a), now = Date.now }) {
    Object.assign(this, { url: url.replace(/\/$/, ''), key, storage, fetchFn, now });
    this.session = this.#readSession();
  }

  get user() { return this.session?.user ?? null; }

  #readSession() {
    try { return JSON.parse(this.storage?.getItem(SESSION_KEY)) || null; } catch { return null; }
  }

  #writeSession(session) {
    this.session = session;
    if (!this.storage) return;
    if (session) this.storage.setItem(SESSION_KEY, JSON.stringify(session));
    else this.storage.removeItem(SESSION_KEY);
  }

  async #call(path, { method = 'GET', body, token, headers = {} } = {}) {
    let res;
    const raw = body instanceof Blob;
    try {
      res = await this.fetchFn(this.url + path, {
        method,
        headers: { apikey: this.key, 'Content-Type': raw ? body.type : 'application/json', Authorization: 'Bearer ' + (token || this.key), ...headers },
        body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(t('error.network'));
    }
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { message: text }; }
    }
    if (!res.ok) throw new ApiError(messageOf(data, res.status), res.status);
    return data;
  }

  #storeTokens(data) {
    const expiresAt = data.expires_at || Math.floor(this.now() / 1000) + (data.expires_in || 3600);
    this.#writeSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
      user: data.user,
    });
  }

  async signIn(email, password) {
    this.#storeTokens(await this.#call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }));
    return this.user;
  }

  /* Creates an account without touching the current session (used by admins). Returns the new user id. */
  async createUser(email, password) {
    const data = await this.#call('/auth/v1/signup', { method: 'POST', body: { email, password } });
    const id = data?.user?.id || data?.id;
    if (!id) throw new ApiError(t('error.createAccount'));
    return id;
  }

  async resetPasswordForEmail(email, options = {}) {
    await this.#call('/auth/v1/recover', { method: 'POST', body: { email, ...options } });
  }

  async signOut() {
    const token = this.session?.access_token;
    this.#writeSession(null);
    if (token) await this.#call('/auth/v1/logout', { method: 'POST', token }).catch(() => {});
  }

  /* Ends every other session of the signed-in user; this browser stays signed in. */
  async signOutOthers() {
    await this.#call('/auth/v1/logout?scope=others', { method: 'POST', token: await this.accessToken() });
  }

  /* Drops the local session without calling the server (used once the account no longer exists). */
  forgetSession() {
    this.#writeSession(null);
  }

  async refresh() {
    const refreshToken = this.session?.refresh_token;
    if (!refreshToken) throw new ApiError(t('error.sessionExpired'), 401);
    try {
      this.#storeTokens(await this.#call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: refreshToken } }));
    } catch (e) {
      if (e.status >= 400 && e.status < 500) this.#writeSession(null);
      throw e;
    }
  }

  async accessToken() {
    if (!this.session) throw new ApiError(t('error.notSignedIn'), 401);
    if (this.session.expires_at - EXPIRY_SKEW_SECONDS <= this.now() / 1000) await this.refresh();
    return this.session.access_token;
  }

  /* Session handed over in the URL hash after an email confirmation link. Returns true when one was consumed. */
  async consumeHashSession(hash) {
    const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    const token = params.get('access_token');
    if (!token || !params.get('refresh_token')) return false;
    const user = await this.#call('/auth/v1/user', { token });
    this.#storeTokens({
      access_token: token,
      refresh_token: params.get('refresh_token'),
      expires_in: Number(params.get('expires_in')) || 3600,
      user,
    });
    return true;
  }

  /* Updates the signed-in user (email, password, user_metadata). An email change only applies once the
     confirmation link(s) are opened; until then the returned user carries `new_email`. */
  async updateUser(attributes, { redirectTo } = {}) {
    const token = await this.accessToken();
    const query = redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : '';
    const user = await this.#call('/auth/v1/user' + query, { method: 'PUT', token, body: attributes });
    this.#writeSession({ ...this.session, user });
    return user;
  }

  /* Emails a one-time code (nonce) that confirms a sensitive change such as a password update. */
  async reauthenticate() {
    await this.#call('/auth/v1/reauthenticate', { token: await this.accessToken() });
  }

  /* PostgREST call authenticated as the signed-in user; refreshes the token once on a 401. */
  async rest(path, options = {}) {
    return this.#authorized(`/rest/v1${path}`, options);
  }

  /* Storage API call authenticated as the signed-in user; refreshes the token once on a 401. */
  async storageCall(path, options = {}) {
    return this.#authorized(`/storage/v1${path}`, options);
  }

  /* Private objects of the signed-in user: upload (replaces an existing file), short-lived link, removal. */
  async uploadObject(bucket, path, blob) {
    await this.storageCall(`/object/${bucket}/${path}`, { method: 'POST', body: blob, headers: { 'x-upsert': 'true' } });
  }

  async signedUrl(bucket, path, expiresIn) {
    const { signedURL } = await this.storageCall(`/object/sign/${bucket}/${path}`, { method: 'POST', body: { expiresIn } });
    return `${this.url}/storage/v1${signedURL}`;
  }

  async removeObject(bucket, path) {
    await this.storageCall(`/object/${bucket}`, { method: 'DELETE', body: { prefixes: [path] } });
  }

  async #authorized(path, options) {
    try {
      return await this.#call(path, { ...options, token: await this.accessToken() });
    } catch (e) {
      if (e.status !== 401 || !this.session) throw e;
      await this.refresh();
      return this.#call(path, { ...options, token: this.session.access_token });
    }
  }
}
