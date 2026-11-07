import { test, expect } from '@playwright/test';
import { fakeSupabase, login } from './fake-supabase.js';

test('admin adds an event on the administration page and saves it', async ({ page }) => {
  const db = await fakeSupabase(page, { admin: true });
  await login(page);
  await page.click('#nav-admin');
  await expect(page.locator('#admin-users')).toContainText('me@example.com');
  await expect(page.locator('#admin-save')).toBeHidden();

  await page.click('#admin-add-event');
  await page.fill('#admin-dlg input[name=event-name]', 'Trip');
  await page.fill('#admin-dlg input[name=event-date]', '2024-05-01');
  await page.click('#admin-dlg button[type=submit]');
  await expect(page.locator('#admin-events')).toContainText('Trip');
  await expect(page.locator('#admin-save')).toBeVisible();

  await page.click('#admin-save');
  await expect(page.locator('#admin-save')).toBeHidden();
  expect(db.tables.events.map((e) => e.name)).toEqual(['Trip']);
});

test('discarding changes restores the stored events', async ({ page }) => {
  const db = await fakeSupabase(page, { admin: true });
  db.state = { members: [], events: [{ name: 'Trip', date: '2024-05-01', recipients: [] }], expenses: [], settlements: [] };
  await login(page);
  await page.click('#nav-admin');
  await expect(page.locator('#admin-events')).toContainText('Trip');

  await page.click('#admin-add-event');
  await page.fill('#admin-dlg input[name=event-name]', 'Camping');
  await page.click('#admin-dlg button[type=submit]');
  await expect(page.locator('#admin-events')).toContainText('Camping');

  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator('#admin-events')).not.toContainText('Camping');
  await expect(page.locator('#admin-save')).toBeHidden();
  expect(db.tables.events.map((e) => e.name)).toEqual(['Trip']);
});
