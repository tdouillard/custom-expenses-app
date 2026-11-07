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

test('updateUser sends a PUT with the redirect and keeps the pending email in the session', async () => {
  const { c, calls } = client((url) => url.includes('/token')
    ? json(200, { access_token: 't', refresh_token: 'r', expires_in: 3600, user: { email: 'a@b.c' } })
    : json(200, { email: 'a@b.c', new_email: 'n@b.c' }));
  await c.signIn('a@b.c', 'secret1');
  const user = await c.updateUser({ email: 'n@b.c' }, { redirectTo: 'https://app/x' });
  const call = calls.at(-1);
  assert.equal(call.opts.method, 'PUT');
  assert.equal(call.url, 'https://x.supabase.co/auth/v1/user?redirect_to=https%3A%2F%2Fapp%2Fx');
  assert.equal(call.opts.headers.Authorization, 'Bearer t');
  assert.deepEqual(JSON.parse(call.opts.body), { email: 'n@b.c' });
  assert.equal(user.new_email, 'n@b.c');
  assert.equal(c.user.new_email, 'n@b.c');
});

test('password change surfaces the re-authentication requirement and reauthenticate hits GoTrue', async () => {
  const { c, calls } = client((url) => url.includes('/token')
    ? json(200, { access_token: 't', refresh_token: 'r', expires_in: 3600, user: {} })
    : url.includes('/reauthenticate') ? json(200, {}) : json(400, { error_code: 'reauthentication_needed' }));
  await c.signIn('a', 'b');
  await assert.rejects(() => c.updateUser({ password: 'newsecret' }), /code/);
  await c.reauthenticate();
  assert.equal(calls.at(-1).url, 'https://x.supabase.co/auth/v1/reauthenticate');
});

test('invalid credentials map to a French message', async () => {
  const { c } = client(() => json(400, { error_code: 'invalid_credentials' }));
  await assert.rejects(() => c.signIn('a', 'b'), (e) => e instanceof ApiError && /incorrect/.test(e.message));
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

test('repository loads shared rows and saves only what changed', async () => {
  const calls = [];
  const tables = {
    '/members': [{ name: 'Ana' }],
    '/events': [{ id: 'ev1', name: 'Trip', date: '', recipients: [] }],
    '/expenses': [{ id: 'x1', event_id: 'ev1', data: { label: 'Taxi', amount: 10 } }],
    '/settlements': [],
  };
  const api = { rest: async (path, opts) => { calls.push({ path, opts }); return opts ? null : tables[path.split('?')[0]]; } };
  const repo = new StateRepository(api);
  const state = await repo.load();
  assert.equal(state.expenses[0].event, 'Trip');

  calls.length = 0;
  await repo.save(state);
  assert.equal(calls.length, 0);

  state.expenses[0].amount = 12;
  state.events.push({ name: 'Party', date: '', recipients: [] });
  await repo.save(state);
  assert.deepEqual(calls.map((c) => c.path), ['/events?on_conflict=id', '/expenses?on_conflict=id']);
  assert.equal(calls[1].opts.body[0].data.amount, 12);
  assert.ok(!('event' in calls[1].opts.body[0].data));

  state.events.pop();
  calls.length = 0;
  await repo.save(state);
  assert.equal(calls[0].opts.method, 'DELETE');
});


