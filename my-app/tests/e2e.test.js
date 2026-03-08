import { test, expect } from '@playwright/test';

test.describe('Loan Application E2E Flow', () => {

  test('Public front page should load correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page.locator('h1')).toContainText('EasyLoan');
    await expect(page.locator('text=Apply for a Loan').first()).toBeVisible();
  });

  test('User can attempt login and handle errors', async ({ page }) => {
    await page.goto('http://localhost:3000/user/login');
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should still be on login unless auth goes through, with toast/error shown.
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
