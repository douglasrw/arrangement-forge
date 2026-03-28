import type { Page } from '@playwright/test';

function requireAuthTestCredentials() {
  const email = process.env.AF_TEST_EMAIL;
  const password = process.env.AF_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Authenticated Playwright tests require AF_TEST_EMAIL and AF_TEST_PASSWORD in the environment.'
    );
  }

  return { email, password };
}

export async function login(page: Page) {
  await page.goto('/');
  await page.waitForTimeout(1500);
  const emailInput = page.locator('#login-email');
  if (!(await emailInput.isVisible().catch(() => false))) return;

  const { email, password } = requireAuthTestCredentials();
  await emailInput.fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('button[type=submit]').click();
  await page.waitForTimeout(3000);
}

export async function navigateToEditor(page: Page) {
  await login(page);
  await page.waitForTimeout(1500);
  const card = page.locator('.rounded-lg.bg-card.border.border-border.cursor-pointer').first();
  if (await card.isVisible().catch(() => false)) {
    await card.click();
    await page.waitForTimeout(2000);
  }
}
