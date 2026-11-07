/* In-memory fake of the Supabase endpoints the app calls (auth + shared tables).
   `db.state` exposes the tables in the app's state shape, for seeding and assertions. */
export async function fakeSupabase(page, { admin = false } = {}) {
  const t = { members: [], events: [], expenses: [], settlements: [], event_access: [] };
  const db = { saves: 0 };
  const user = { id: 'u1', email: 'me@example.com' };
  const session = { access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user };
  let seq = 0;

  Object.defineProperty(db, 'tables', { value: t });
  Object.defineProperty(db, 'state', {
    get() {
      const names = new Map(t.events.map((e) => [e.id, e.name]));
      return {
        members: t.members.map((m) => m.name),
        events: t.events.map(({ id, ...e }) => e),
        expenses: t.expenses.map((x) => ({ ...x.data, id: x.id, event: names.get(x.event_id) })),
        settlements: t.settlements.map((x) => x.data),
      };
    },
    set(state) {
      const ids = new Map();
      t.members = (state.members || []).map((name) => ({ name }));
      t.events = (state.events || []).map((e) => {
        const ev = typeof e === 'string' ? { name: e, date: '', recipients: [] } : { date: '', recipients: [], ...e };
        ids.set(ev.name, `ev${++seq}`);
        return { ...ev, id: ids.get(ev.name) };
      });
      t.expenses = (state.expenses || []).map(({ id, event, ...data }) => ({ id, event_id: ids.get(event), data }));
      t.settlements = (state.settlements || []).map((data, i) => ({ id: `s${i}`, data }));
    },
  });

  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url();
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/token')) {
      const body = route.request().postDataJSON();
      if (body.password === 'wrongpass') return json(400, { error_code: 'invalid_credentials' });
      return json(200, session);
    }
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      return json(200, { ...user, user_metadata: { ...user.user_metadata, ...body.data } });
    }
    return json(204, null);
  });

  await page.route('**/rest/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const table = url.pathname.split('/').pop();
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'GET') {
      if (table === 'profiles') return json(200, [{ ...user, is_admin: admin }]);
      return json(200, t[table] || []);
    }
    db.saves += 1;
    if (req.method() === 'POST') {
      const key = table === 'members' ? 'name' : 'id';
      for (const row of req.postDataJSON()) {
        const i = t[table].findIndex((r) => r[key] === row[key]);
        if (i >= 0) t[table][i] = row; else t[table].push(row);
      }
    } else if (req.method() === 'DELETE') {
      const [column, filter] = [...url.searchParams.entries()][0];
      const values = [...filter.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
      t[table] = t[table].filter((r) => !values.includes(r[column]));
    }
    return route.fulfill({ status: 204, body: '' });
  });
  return db;
}

export async function login(page) {
  await page.goto('/');
  await page.fill('input[name=email]', 'me@example.com');
  await page.fill('input[name=password]', 'secret123');
  await page.click('button[type=submit]');
}
