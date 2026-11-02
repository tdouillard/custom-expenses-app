/* In-memory fake of the Supabase endpoints the app calls (auth + app_state). */
export async function fakeSupabase(page, { confirmed = true } = {}) {
  const db = { state: null, saves: 0 };
  const user = { id: 'u1', email: 'me@example.com' };
  const session = { access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user };

  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url();
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/token')) {
      const body = route.request().postDataJSON();
      if (body.password === 'wrongpass') return json(400, { error_code: 'invalid_credentials' });
      return json(200, session);
    }
    if (url.includes('/signup')) return json(200, confirmed ? user : session);
    return json(204, null);
  });

  await page.route('**/rest/v1/app_state**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(db.state ? [{ state: db.state }] : []) });
    }
    db.state = req.postDataJSON().state;
    db.saves += 1;
    return route.fulfill({ status: 201, body: '' });
  });
  return db;
}

export async function login(page) {
  await page.goto('/');
  await page.fill('input[name=email]', 'me@example.com');
  await page.fill('input[name=password]', 'secret123');
  await page.click('button[type=submit]');
}
