import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseClient, ApiError } from '../../src/services/supabase.js';
import { StateRepository } from '../../src/services/repository.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};
const json = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });

function client(handler) {
  const calls = [];
  const fetchFn = async (url, opts) => { calls.push({ url, opts }); return handler(url, opts); };
  return { c: new SupabaseClient({ url: 'https://x.supabase.co/', key: 'pk', storage: memory(), fetchFn }), calls };
}

test('signIn stores the session and sends the apikey', async () => {
  const { c, calls } = client(() => json(200, { access_token: 't', refresh_token: 'r', expires_in: 3600, user: { email: 'a@b.c' } }));
  await c.signIn('a@b.c', 'secret1');
  assert.equal(c.user.email, 'a@b.c');
  assert.equal(calls[0].opts.headers.apikey, 'pk');
  assert.equal(calls[0].url, 'https://x.supabase.co/auth/v1/token?grant_type=password');
});

test('invalid credentials map to a French message', async () => {
  const { c } = client(() => json(400, { error_code: 'invalid_credentials' }));
  await assert.rejects(() => c.signIn('a', 'b'), (e) => e instanceof ApiError && /incorrect/.test(e.message));
});

test('signUp reports confirmation required', async () => {
  const { c } = client(() => json(200, { id: 'u' }));
  assert.deepEqual(await c.signUp('a@b.c', 'secret1'), { confirmationRequired: true });
});

test('rest refreshes once on 401', async () => {
  let n = 0;
  const { c } = client((url) => {
    if (url.includes('/auth/v1/token')) return json(200, { access_token: 't2', refresh_token: 'r2', expires_in: 3600, user: {} });
    return n++ === 0 ? json(401, { message: 'jwt expired' }) : json(200, [{ ok: 1 }]);
  });
  c.session = { access_token: 't1', refresh_token: 'r1', expires_at: Math.floor(Date.now() / 1000) + 3600, user: {} };
  assert.deepEqual(await c.rest('/app_state'), [{ ok: 1 }]);
  assert.equal(c.session.access_token, 't2');
});

test('signOut clears the session', async () => {
  const { c } = client(() => json(204, null));
  c.session = { access_token: 't', refresh_token: 'r', expires_at: 9e9, user: {} };
  await c.signOut();
  assert.equal(c.user, null);
});

test('repository loads and saves state', async () => {
  const calls = [];
  const api = { user: { id: 'u1' }, rest: async (path, opts) => { calls.push({ path, opts }); return path.startsWith('/app_state?select') ? [] : null; } };
  const repo = new StateRepository(api);
  const state = await repo.load();
  assert.deepEqual(state.expenses, []);
  await repo.save(state);
  assert.equal(calls[1].opts.method, 'POST');
});

