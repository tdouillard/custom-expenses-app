import { test, expect } from '@playwright/test';
import { fakeSupabase, login } from './fake-supabase.js';

test('shows the login form and rejects bad credentials', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.fill('input[name=email]', 'me@example.com');
  await page.fill('input[name=password]', 'wrongpass');
  await page.click('button[type=submit]');
  await expect(page.getByRole('alert')).toContainText('Incorrect');
});

test('switches the interface language from the sign-in page and remembers it', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.selectOption('select[name=language]', 'fr');
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
});

test('changes the language from the user menu and keeps it on reload', async ({ page }) => {
  await fakeSupabase(page);
  await login(page);
  await expect(page.locator('.dashboard')).toBeVisible();
  await page.click('#profile-btn');
  await page.selectOption('#language-select', 'de');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('#add-expense')).toHaveText('+ Ausgabe hinzufügen');
  await page.reload();
  await expect(page.locator('.dashboard')).toBeVisible();
  await expect(page.locator('#add-expense')).toHaveText('+ Ausgabe hinzufügen');
});

test('does not offer account creation', async ({ page }) => {
  await fakeSupabase(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('#toggle-mode')).toHaveCount(0);
  await expect(page.getByText('Create an account')).toHaveCount(0);
  await expect(page.locator('input[name=password]')).toHaveAttribute('autocomplete', 'current-password');
});

test('logs in to an empty dashboard and loads without console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await fakeSupabase(page);
  await login(page);
  await expect(page.locator('.dashboard')).toBeVisible();
  await expect(page.locator('table').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('imports data persisted in storage', async ({ page }) => {
  const db = await fakeSupabase(page);
  db.state = {
    members: ['Alice', 'Bob'], events: [{ name: 'Trip', date: '2024-05-01', recipients: ['Alice', 'Bob'] }],
    expenses: [{ id: 'e1', label: 'Hotel', event: 'Trip', paidBy: 'Alice', amount: 100, due: false, order: 'na', split: { Alice: 50, Bob: 50 }, comment: '' }],
    settlements: [],
  };
  await login(page);
  await expect(page.getByText('Hotel')).toBeVisible();
  await expect(page.locator('.bal').first()).toBeVisible();
});

test('sign out returns to the login form', async ({ page }) => {
  await fakeSupabase(page);
  await login(page);
  await expect(page.locator('.dashboard')).toBeVisible();
  await page.click('#profile-btn');
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
