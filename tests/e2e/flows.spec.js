import { test, expect } from '@playwright/test';
import { fakeSupabase, login } from './fake-supabase.js';

test('manage members and events through the popup, then add and filter expenses', async ({ page }) => {
  const db = await fakeSupabase(page);
  await login(page);
  await expect(page.locator('.dashboard')).toBeVisible();

  // Members
  await page.click('#edit-members');
  for (const name of ['Alice', 'Bob']) {
    await page.click('#manage-add');
    await page.fill('input[name=name]', name);
    await page.click('#manage-dlg button[type=submit]');
  }
  await page.click('#manage-close');
  await expect(page.locator('#members-card')).toContainText('Alice');
  await expect(page.locator('#members-card')).toContainText('Bob');

  // Event
  await page.click('#edit-events');
  await page.click('#manage-add');
  await page.fill('input[name=name]', 'Trip');
  await page.fill('input[name=date]', '2024-05-01');
  await page.fill('input[name=recipients-input]', 'Alice, Bob');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.click('#manage-dlg button[type=submit]');
  await page.click('#manage-close');
  await expect(page.locator('#events-card')).toContainText('Trip');

  // Expenses
  for (const [label, payer, amount] of [['Hotel', 'Alice', '100'], ['Dinner', 'Bob', '40']]) {
    await page.click('#add-expense');
    await page.fill('#expense-dlg input[name=label]', label);
    await page.selectOption('#expense-dlg select[name=event]', 'Trip');
    await page.selectOption('#expense-dlg select[name=paidBy]', payer);
    await page.fill('#expense-dlg input[name=amount]', amount);
    await page.click('#expense-dlg button[type=submit]');
    await expect(page.locator('#rows')).toContainText(label);
  }
  await expect(page.locator('#expenses-total')).toContainText('140');
  expect(db.state.expenses).toHaveLength(2);

  // Header filter
  await page.selectOption('#filter-paidBy', 'Alice');
  await expect(page.locator('#rows [data-del]')).toHaveCount(1);
  await expect(page.locator('#expenses-total')).toContainText('100');
});

test('delete an expense', async ({ page }) => {
  const db = await fakeSupabase(page);
  db.state = {
    members: ['Alice'], events: [{ name: 'Trip', date: '2024-05-01', recipients: ['Alice'] }],
    expenses: [{ id: 'e1', label: 'Hotel', event: 'Trip', paidBy: 'Alice', amount: 10, due: false, order: 'na', split: { Alice: 10 }, comment: '' }],
    settlements: [],
  };
  page.on('dialog', (d) => d.accept());
  await login(page);
  await expect(page.locator('#rows')).toContainText('Hotel');
  await page.click('[data-del=e1]');
  await expect(page.locator('#rows')).not.toContainText('Hotel');
  await expect.poll(() => db.state.expenses.length).toBe(0);
});

