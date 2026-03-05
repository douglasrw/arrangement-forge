/**
 * Overflow Detection Tests
 *
 * Mechanical gate: catches horizontal overflow on all 4 views.
 * Prevents the "looks fine on my monitor" problem.
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

async function checkNoHorizontalOverflow(page: Page, viewName: string) {
  // Check body-level overflow
  const bodyOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(bodyOverflow, `${viewName}: body has horizontal overflow`).toBe(false);

  // Check key containers for unintended overflow
  const containers = page.locator('[class*="overflow"]');
  const count = await containers.count();
  for (let i = 0; i < count; i++) {
    const el = containers.nth(i);
    const hasOverflow = await el.evaluate((node) => {
      return node.scrollWidth > node.clientWidth + 1; // 1px tolerance
    });
    if (hasOverflow) {
      const classes = await el.getAttribute('class');
      // Only flag if it's not an intentionally scrollable container
      if (
        !classes?.includes('overflow-x-auto') &&
        !classes?.includes('overflow-x-scroll') &&
        !classes?.includes('overflow-y-auto') &&
        !classes?.includes('overflow-y-scroll') &&
        !classes?.includes('overflow-auto') &&
        !classes?.includes('overflow-scroll')
      ) {
        expect(
          hasOverflow,
          `${viewName}: Element with classes "${classes}" has unintended horizontal overflow`
        ).toBe(false);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

test.describe('Overflow Detection', () => {
  test('no horizontal overflow on login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await checkNoHorizontalOverflow(page, 'Login');
  });

  test('no horizontal overflow on library page', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);
    await checkNoHorizontalOverflow(page, 'Library');
  });

  test('no horizontal overflow on settings page', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);
    const settingsBtn = page.locator('button', { hasText: 'Settings' });
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
    } else {
      await page.goto('/settings');
    }
    await page.waitForTimeout(2000);
    await checkNoHorizontalOverflow(page, 'Settings');
  });

  test('no horizontal overflow on editor page', async ({ page }) => {
    await navigateToEditor(page);
    await page.waitForTimeout(2000);
    await checkNoHorizontalOverflow(page, 'Editor');
  });
});
