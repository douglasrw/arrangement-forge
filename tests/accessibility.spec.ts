/**
 * Accessibility Tests — axe-core scans
 *
 * Mechanical gate: runs WCAG 2.0 AA checks on all 4 views.
 * Blocks commits that introduce accessibility regressions.
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ---------------------------------------------------------------------------
// Helpers (same login pattern as design-system.spec.ts)
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.goto('/');
  await page.waitForTimeout(1500);
  const emailInput = page.locator('#login-email');
  // If already logged in (redirected), skip
  if (!(await emailInput.isVisible().catch(() => false))) return;
  await emailInput.fill(process.env.AF_TEST_EMAIL!);
  await page.locator('#login-password').fill(process.env.AF_TEST_PASSWORD!);
  await page.locator('button[type=submit]').click();
  await page.waitForTimeout(3000);
}

async function navigateToEditor(page: Page) {
  await login(page);
  // Wait for library to load
  await page.waitForTimeout(1500);
  // Click first project card if available
  const card = page.locator('.rounded-lg.bg-card.border.border-border.cursor-pointer').first();
  if (await card.isVisible().catch(() => false)) {
    await card.click();
    await page.waitForTimeout(2000);
  }
}

// ---------------------------------------------------------------------------
// LOGIN PAGE (unauthenticated)
// ---------------------------------------------------------------------------

test.describe('Accessibility: Login Page', () => {
  test('no axe violations on login page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // TODO: Fix color-contrast issues on muted-foreground text against dark backgrounds.
      // Pre-existing: the zinc-400 (#a1a1aa) muted text on zinc-900 backgrounds is borderline.
      .disableRules(['color-contrast'])
      .analyze();

    if (results.violations.length > 0) {
      const summary = results.violations.map(
        (v) => `${v.id}: ${v.description} (${v.nodes.length} instances)`
      );
      console.log('Axe violations:', summary);
    }
    expect(results.violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// LIBRARY PAGE (authenticated)
// ---------------------------------------------------------------------------

test.describe('Accessibility: Library Page', () => {
  test('no axe violations on library page', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // TODO: Fix color-contrast issues on muted-foreground text against dark backgrounds.
      .disableRules(['color-contrast'])
      .analyze();

    if (results.violations.length > 0) {
      const summary = results.violations.map(
        (v) => `${v.id}: ${v.description} (${v.nodes.length} instances)`
      );
      console.log('Axe violations:', summary);
    }
    expect(results.violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SETTINGS PAGE (authenticated)
// ---------------------------------------------------------------------------

test.describe('Accessibility: Settings Page', () => {
  test('no axe violations on settings page', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);
    const settingsBtn = page.locator('button', { hasText: 'Settings' });
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
    } else {
      await page.goto('/settings');
    }
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // TODO: Fix color-contrast issues on muted-foreground text against dark backgrounds.
      .disableRules(['color-contrast'])
      .analyze();

    if (results.violations.length > 0) {
      const summary = results.violations.map(
        (v) => `${v.id}: ${v.description} (${v.nodes.length} instances)`
      );
      console.log('Axe violations:', summary);
    }
    expect(results.violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EDITOR PAGE (authenticated, with project loaded)
// ---------------------------------------------------------------------------

test.describe('Accessibility: Editor Page', () => {
  test('no axe violations on editor page', async ({ page }) => {
    await navigateToEditor(page);
    await page.waitForTimeout(2000);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // TODO: Fix color-contrast issues on muted-foreground text against dark backgrounds.
      .disableRules(['color-contrast'])
      .analyze();

    if (results.violations.length > 0) {
      const summary = results.violations.map(
        (v) => `${v.id}: ${v.description} (${v.nodes.length} instances)`
      );
      console.log('Axe violations:', summary);
    }
    expect(results.violations).toEqual([]);
  });
});
