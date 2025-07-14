import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://x.com/');
  await page.getByTestId('loginButton').click();
  await page.getByRole('textbox', { name: 'Phone, email, or username' }).click();
  await page.getByRole('textbox', { name: 'Phone, email, or username' }).fill('gradyharwood@gmail.com');
  await page.getByRole('textbox', { name: 'Phone, email, or username' }).press('Enter');
  await page.getByRole('textbox', { name: 'Password Reveal password' }).fill('2bsoc00l');
  await page.getByRole('textbox', { name: 'Password Reveal password' }).press('Enter');
});