/**
 * Visual Regression Tests — Golden Baseline Screenshots
 *
 * First run creates baseline screenshots. Subsequent runs compare against them.
 * To update baselines after approved UI changes:
 *   npx playwright test tests/visual-regression.spec.ts --update-snapshots
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers (same login pattern as design-system.spec.ts)
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto('/');
  await page.waitForTimeout(1500);
  const emailInput = page.locator('#login-email');
  if (!(await emailInput.isVisible().catch(() => false))) return;
  await emailInput.fill(process.env.AF_TEST_EMAIL!);
  await page.locator('#login-password').fill(process.env.AF_TEST_PASSWORD!);
  await page.locator('button[type=submit]').click();
  await page.waitForTimeout(3000);
}

async function navigateToEditor(page: Page) {
  await login(page);
  await page.waitForTimeout(1500);
  const card = page.locator('.rounded-lg.bg-card.border.border-border.cursor-pointer').first();
  if (await card.isVisible().catch(() => false)) {
    await card.click();
    await page.waitForTimeout(2000);
  }
}

// ---------------------------------------------------------------------------
// GOLDEN BASELINE TESTS
// ---------------------------------------------------------------------------

test.describe('Visual Regression', () => {
  test('visual regression: login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });

  test('visual regression: library page', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('library-page.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });

  test('visual regression: settings page', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);
    const settingsBtn = page.locator('button', { hasText: 'Settings' });
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
    } else {
      await page.goto('/settings');
    }
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('settings-page.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });

  test('visual regression: editor page', async ({ page }) => {
    await navigateToEditor(page);
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('editor-page.png', {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });
});
