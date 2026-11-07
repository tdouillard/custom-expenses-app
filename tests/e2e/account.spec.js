import { test, expect } from '@playwright/test';
import { fakeSupabase, login } from './fake-supabase.js';

async function openSettings(page) {
  await page.click('#profile-btn');
  await page.click('#nav-settings');
  await expect(page.locator('#account-profile')).toBeVisible();
}

test('settings page shows every section without console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await fakeSupabase(page);
  await login(page);
  await expect(page.locator('.dashboard')).toBeVisible();
  await openSettings(page);
  await expect(page.locator('#account-security')).toBeVisible();
  await expect(page.locator('#account-preferences')).toBeVisible();
  await expect(page.locator('#account-danger')).toBeVisible();
  await expect(page.locator('.savebar')).toBeHidden();
  expect(errors.filter((e) => !e.includes('Failed to load resource'))).toEqual([]);
});

test('username and language are saved together from the save bar', async ({ page }) => {
  await fakeSupabase(page);
  await login(page);
  await openSettings(page);
  await page.fill('input[name=username]', 'Alice');
  await page.getByRole('button', { name: 'Français' }).click();
  await expect(page.locator('.savebar')).toContainText('2');
  const put = page.waitForRequest((r) => r.method() === 'PUT' && r.url().includes('/auth/v1/user'));
  await page.getByRole('button', { name: 'Save changes' }).click();
  expect((await put).postDataJSON()).toEqual({ data: { username: 'Alice', language: 'fr' } });
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('.savebar')).toBeHidden();
});

test('an email change needs the code sent to the current address', async ({ page }) => {
  await fakeSupabase(page);
  await login(page);
  await openSettings(page);
  await page.fill('input[name=new-email]', 'new@example.com');
  const reauth = page.waitForRequest((r) => r.url().includes('/auth/v1/reauthenticate'));
  await page.getByRole('button', { name: 'Send code' }).click();
  await reauth;
  await expect(page.locator('input[name=new-email]')).toHaveAttribute('readonly', 'readonly');
  const put = page.waitForRequest((r) => r.method() === 'PUT' && r.url().includes('/auth/v1/user'));
  await page.fill('input[name=code]', '123456');
  await page.getByRole('button', { name: 'Change email' }).click();
  expect((await put).postDataJSON()).toEqual({ email: 'new@example.com', nonce: '123456' });
});

test('account deletion needs the typed email and a recent sign-in', async ({ page }) => {
  await fakeSupabase(page);
  await page.route('**/rest/v1/rpc/delete_my_account', (route) => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'P0001', message: 'recent_login_required' }),
  }));
  await login(page);
  await openSettings(page);
  const button = page.getByRole('button', { name: 'Delete my account' });
  await expect(button).toBeDisabled();
  await page.fill('input[name=delete-confirm]', 'someone@example.com');
  await expect(button).toBeDisabled();
  await page.fill('input[name=delete-confirm]', 'me@example.com');
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.locator('#account-danger [role=alert]')).toContainText('sign in again');
});
