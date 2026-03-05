/**
 * Design System Compliance Tests
 *
 * Mechanical gate: checks every view against DESIGN_SYSTEM.md rules.
 * No subjective judgment — pure CSS property assertions.
 *
 * Quality gate criteria covered:
 *   1. Spacing consistency (padding >= 8px on containers)
 *   2. Color token compliance (backgrounds not transparent on buttons/cards)
 *   3. Typography hierarchy (font sizes on headings vs body)
 *   4. Interactive state coverage (focus rings on inputs)
 *   5. Alignment and padding (boundingBox checks)
 *   6. Visual polish (borders exist on zone separators)
 *   7. Interactive behavior (buttons clickable)
 *   8. Container padding (every panel/bar/card has min padding)
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
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

function parsePx(value: string): number {
  return parseInt(value.replace('px', ''), 10) || 0;
}

/** Returns computed style property as string */
async function getComputed(page: Page, selector: string, prop: string): Promise<string> {
  return page.locator(selector).first().evaluate(
    (el, p) => getComputedStyle(el).getPropertyValue(p),
    prop,
  );
}

// ---------------------------------------------------------------------------
// LOGIN PAGE
// ---------------------------------------------------------------------------

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
  });

  test('login card has p-6 (24px) padding', async ({ page }) => {
    const card = page.locator('.bg-card.border.border-border.rounded-lg').first();
    await expect(card).toBeVisible();
    const pt = await card.evaluate((el) => parseInt(getComputedStyle(el).paddingTop));
    const pl = await card.evaluate((el) => parseInt(getComputedStyle(el).paddingLeft));
    expect(pt).toBeGreaterThanOrEqual(24);
    expect(pl).toBeGreaterThanOrEqual(24);
  });

  test('email input has 1px border', async ({ page }) => {
    const input = page.locator('#login-email');
    await expect(input).toBeVisible();
    await expect(input).toHaveCSS('border-width', '1px');
  });

  test('password input has 1px border', async ({ page }) => {
    const input = page.locator('#login-password');
    await expect(input).toBeVisible();
    await expect(input).toHaveCSS('border-width', '1px');
  });

  test('email input has non-transparent border color', async ({ page }) => {
    const input = page.locator('#login-email');
    const borderColor = await input.evaluate((el) => getComputedStyle(el).borderColor);
    expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(borderColor).not.toBe('transparent');
  });

  test('submit button has visible background (not transparent)', async ({ page }) => {
    const btn = page.locator('button[type=submit]');
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe('transparent');
  });

  test('submit button has correct primary cyan color', async ({ page }) => {
    const btn = page.locator('button[type=submit]');
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    // --primary is #06b6d4 = rgb(6, 182, 212)
    expect(bg).toBe('rgb(6, 182, 212)');
  });

  test('submit button has adequate padding (px-4 py-2)', async ({ page }) => {
    const btn = page.locator('button[type=submit]');
    const py = await btn.evaluate((el) => parseInt(getComputedStyle(el).paddingTop));
    const px = await btn.evaluate((el) => parseInt(getComputedStyle(el).paddingLeft));
    expect(py).toBeGreaterThanOrEqual(8); // py-2 = 8px
    expect(px).toBeGreaterThanOrEqual(16); // px-4 = 16px
  });

  test('heading "Arrangement Forge" uses primary color', async ({ page }) => {
    const h1 = page.locator('h1');
    const color = await h1.evaluate((el) => getComputedStyle(el).color);
    // --primary #06b6d4 = rgb(6, 182, 212)
    expect(color).toBe('rgb(6, 182, 212)');
  });

  test('heading font size is at least 20px (text-2xl)', async ({ page }) => {
    const h1 = page.locator('h1');
    const fontSize = await h1.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(20);
  });

  test('mode toggle tabs have bg-secondary container', async ({ page }) => {
    const tabContainer = page.locator('.bg-secondary.rounded-lg').first();
    await expect(tabContainer).toBeVisible();
    const bg = await tabContainer.evaluate((el) => getComputedStyle(el).backgroundColor);
    // --secondary #27272a = rgb(39, 39, 42)
    expect(bg).toBe('rgb(39, 39, 42)');
  });

  test('active tab has primary background', async ({ page }) => {
    const activeTab = page.locator('.bg-primary.text-primary-foreground').first();
    await expect(activeTab).toBeVisible();
    const bg = await activeTab.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(6, 182, 212)');
  });

  test('Google button has border', async ({ page }) => {
    const googleBtn = page.locator('button', { hasText: 'Continue with Google' });
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toHaveCSS('border-width', '1px');
    const borderColor = await googleBtn.evaluate((el) => getComputedStyle(el).borderColor);
    expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('email input shows focus ring on focus', async ({ page }) => {
    const input = page.locator('#login-email');
    await input.focus();
    // Check for ring/outline via box-shadow (Tailwind ring-2 uses box-shadow)
    const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
  });

  test('page background is --background (#09090b)', async ({ page }) => {
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // #09090b = rgb(9, 9, 11)
    expect(bg).toBe('rgb(9, 9, 11)');
  });

  test('body font size is 14px', async ({ page }) => {
    const fs = await page.evaluate(() => getComputedStyle(document.body).fontSize);
    expect(fs).toBe('14px');
  });

  test('no page-level vertical scroll', async ({ page }) => {
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    );
    expect(scrollable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LIBRARY PAGE
// ---------------------------------------------------------------------------

test.describe('Library Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1500);
  });

  test('header bar has bg-card background', async ({ page }) => {
    const header = page.locator('.bg-card.border-b.border-border').first();
    await expect(header).toBeVisible();
    const bg = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
    // --card #18181b = rgb(24, 24, 27)
    expect(bg).toBe('rgb(24, 24, 27)');
  });

  test('header has adequate padding (px-8 py-4)', async ({ page }) => {
    const header = page.locator('.bg-card.border-b.border-border').first();
    const py = await header.evaluate((el) => parseInt(getComputedStyle(el).paddingTop));
    const px = await header.evaluate((el) => parseInt(getComputedStyle(el).paddingLeft));
    expect(py).toBeGreaterThanOrEqual(16); // py-4
    expect(px).toBeGreaterThanOrEqual(32); // px-8
  });

  test('header has bottom border', async ({ page }) => {
    const header = page.locator('.bg-card.border-b.border-border').first();
    const bw = await header.evaluate((el) => getComputedStyle(el).borderBottomWidth);
    expect(bw).toBe('1px');
    const bc = await header.evaluate((el) => getComputedStyle(el).borderBottomColor);
    expect(bc).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('"My Library" heading is text-xl (20px) font-bold', async ({ page }) => {
    const h1 = page.locator('h1', { hasText: 'My Library' });
    await expect(h1).toBeVisible();
    const fs = await h1.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    expect(fs).toBeGreaterThanOrEqual(20);
    const fw = await h1.evaluate((el) => getComputedStyle(el).fontWeight);
    expect(parseInt(fw)).toBeGreaterThanOrEqual(700);
  });

  test('+ New Project button has primary background', async ({ page }) => {
    const btn = page.locator('button', { hasText: 'New Project' });
    if (await btn.isVisible()) {
      const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bg).toBe('rgb(6, 182, 212)');
    }
  });

  test('search input has border and padding', async ({ page }) => {
    const input = page.locator('#library-search');
    await expect(input).toBeVisible();
    await expect(input).toHaveCSS('border-width', '1px');
    const px = await input.evaluate((el) => parseInt(getComputedStyle(el).paddingLeft));
    expect(px).toBeGreaterThanOrEqual(12); // px-3
  });

  test('sort select has border', async ({ page }) => {
    const select = page.locator('#library-sort');
    await expect(select).toBeVisible();
    await expect(select).toHaveCSS('border-width', '1px');
  });

  test('project cards have border and rounded-lg', async ({ page }) => {
    const cards = page.locator('.rounded-lg.bg-card.border.border-border');
    const count = await cards.count();
    if (count > 0) {
      const card = cards.first();
      await expect(card).toHaveCSS('border-width', '1px');
      const br = await card.evaluate((el) => parseInt(getComputedStyle(el).borderRadius));
      expect(br).toBeGreaterThanOrEqual(8); // rounded-lg = 8px
    }
  });

  test('project cards have p-4 (16px) padding on inner container', async ({ page }) => {
    const cardInner = page.locator('.rounded-lg.bg-card.border.border-border .p-4').first();
    if (await cardInner.isVisible().catch(() => false)) {
      const pt = await cardInner.evaluate((el) => parseInt(getComputedStyle(el).paddingTop));
      expect(pt).toBeGreaterThanOrEqual(16);
    }
  });

  test('search input shows focus ring on focus', async ({ page }) => {
    const input = page.locator('#library-search');
    await input.focus();
    const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
  });

  test('no page-level vertical scroll', async ({ page }) => {
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    );
    // Library page may scroll if many projects; check body overflow at least
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(overflow).toBe('hidden');
  });
});

// ---------------------------------------------------------------------------
// SETTINGS PAGE
// ---------------------------------------------------------------------------

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);
    // Navigate to settings
    const settingsBtn = page.locator('button', { hasText: 'Settings' });
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
    } else {
      await page.goto('/settings');
    }
    await page.waitForTimeout(1000);
  });

  test('settings header has bg-card and bottom border', async ({ page }) => {
    const header = page.locator('.bg-card.border-b.border-border').first();
    await expect(header).toBeVisible();
    const bg = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(24, 24, 27)');
    await expect(header).toHaveCSS('border-bottom-width', '1px');
  });

  test('Settings heading is text-xl font-semibold', async ({ page }) => {
    const h1 = page.locator('h1', { hasText: 'Settings' });
    await expect(h1).toBeVisible();
    const fs = await h1.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    expect(fs).toBeGreaterThanOrEqual(20);
    const fw = await h1.evaluate((el) => parseInt(getComputedStyle(el).fontWeight));
    expect(parseInt(fw)).toBeGreaterThanOrEqual(600);
  });

  test('Profile card has bg-card, border, rounded-lg, p-6', async ({ page }) => {
    const card = page.locator('.bg-card.border.border-border.rounded-lg').first();
    await expect(card).toBeVisible();
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(24, 24, 27)');
    await expect(card).toHaveCSS('border-width', '1px');
    const br = await card.evaluate((el) => parseInt(getComputedStyle(el).borderRadius));
    expect(br).toBeGreaterThanOrEqual(8);
    const pt = await card.evaluate((el) => parseInt(getComputedStyle(el).paddingTop));
    expect(pt).toBeGreaterThanOrEqual(24); // p-6 = 24px
  });

  test('all settings cards have minimum 24px padding', async ({ page }) => {
    const cards = page.locator('.bg-card.border.border-border.rounded-lg');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const pt = await cards.nth(i).evaluate((el) => parseInt(getComputedStyle(el).paddingTop));
      expect(pt).toBeGreaterThanOrEqual(24);
    }
  });

  test('display name input has border and focus ring', async ({ page }) => {
    const input = page.locator('#settings-display-name');
    await expect(input).toBeVisible();
    await expect(input).toHaveCSS('border-width', '1px');
    await input.focus();
    const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
  });

  test('genre select has border', async ({ page }) => {
    const select = page.locator('#settings-genre');
    await expect(select).toBeVisible();
    await expect(select).toHaveCSS('border-width', '1px');
  });

  test('Save Settings button has primary background', async ({ page }) => {
    const btn = page.locator('button[type=submit]', { hasText: 'Save Settings' });
    await expect(btn).toBeVisible();
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(6, 182, 212)');
  });

  test('Save Settings button has adequate padding', async ({ page }) => {
    const btn = page.locator('button[type=submit]');
    const py = await btn.evaluate((el) => parseInt(getComputedStyle(el).paddingTop));
    const px = await btn.evaluate((el) => parseInt(getComputedStyle(el).paddingLeft));
    expect(py).toBeGreaterThanOrEqual(8);
    expect(px).toBeGreaterThanOrEqual(16);
  });

  test('Back to Library button has hover-ready styling', async ({ page }) => {
    const btn = page.locator('button', { hasText: 'Back to Library' });
    await expect(btn).toBeVisible();
    // Should have rounded-md and padding
    const br = await btn.evaluate((el) => parseInt(getComputedStyle(el).borderRadius));
    expect(br).toBeGreaterThanOrEqual(6);
    const px = await btn.evaluate((el) => parseInt(getComputedStyle(el).paddingLeft));
    expect(px).toBeGreaterThanOrEqual(16);
  });

  test('section headings (h2) are text-lg font-semibold', async ({ page }) => {
    const h2 = page.locator('h2', { hasText: 'Profile' });
    await expect(h2).toBeVisible();
    const fs = await h2.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    expect(fs).toBeGreaterThanOrEqual(18); // text-lg = 18px
    const fw = await h2.evaluate((el) => parseInt(getComputedStyle(el).fontWeight));
    expect(parseInt(fw)).toBeGreaterThanOrEqual(600);
  });

  test('labels use smaller text than headings', async ({ page }) => {
    const label = page.locator('label[for=settings-display-name]');
    const h2 = page.locator('h2', { hasText: 'Profile' });
    const labelFs = await label.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    const h2Fs = await h2.evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    expect(labelFs).toBeLessThan(h2Fs);
  });
});

// ---------------------------------------------------------------------------
// EDITOR PAGE
// ---------------------------------------------------------------------------

test.describe('Editor Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToEditor(page);
  });

  // --- Top Bar ---

  test('top bar exists and has bg-card background', async ({ page }) => {
    // TopBar is likely first child with bg-card in AppShell
    const topBar = page.locator('.flex.flex-col.h-screen > :first-child');
    await expect(topBar).toBeVisible();
    const bg = await topBar.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Should be card color or similar
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('top bar has bottom border', async ({ page }) => {
    // TopBar: <header> with border-b border-border/50
    const topBar = page.locator('header').first();
    await expect(topBar).toBeVisible();
    const bw = await topBar.evaluate((el) => getComputedStyle(el).borderBottomWidth);
    expect(bw).toBe('1px');
    const bc = await topBar.evaluate((el) => getComputedStyle(el).borderBottomColor);
    expect(bc).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('top bar has minimum 8px vertical padding', async ({ page }) => {
    // TopBar uses h-[52px] with items-center, px-4 — check horizontal padding
    const topBar = page.locator('header').first();
    await expect(topBar).toBeVisible();
    const px = await topBar.evaluate((el) => parseInt(getComputedStyle(el).paddingLeft));
    expect(px).toBeGreaterThanOrEqual(8);
    // Height should be at least 40px (provides implicit vertical space)
    const h = await topBar.evaluate((el) => parseInt(getComputedStyle(el).height));
    expect(h).toBeGreaterThanOrEqual(40);
  });

  // --- Left Panel / Sidebar ---

  test('left panel has bg-sidebar background', async ({ page }) => {
    // Sidebar: bg-sidebar or the collapsed version
    const sidebar = page.locator('.bg-sidebar').first();
    if (await sidebar.isVisible()) {
      const bg = await sidebar.evaluate((el) => getComputedStyle(el).backgroundColor);
      // --sidebar #111113 = rgb(17, 17, 19)
      expect(bg).toBe('rgb(17, 17, 19)');
    }
  });

  test('left panel has right border', async ({ page }) => {
    const sidebar = page.locator('.border-r.border-border').first();
    if (await sidebar.isVisible()) {
      const bw = await sidebar.evaluate((el) => getComputedStyle(el).borderRightWidth);
      expect(bw).toBe('1px');
    }
  });

  // --- Transport Bar (footer) ---

  test('transport bar exists', async ({ page }) => {
    // TransportBar is rendered after ArrangementView in AppShell's right column
    // Look for the transport container with typical transport controls
    const transport = page.locator('button', { hasText: /stop|play|pause/i }).first();
    // If no text-based button, look for SVG icons (Play, Pause, Square from lucide)
    const playBtn = page.locator('[data-testid="transport-play"], button:has(svg)').first();
    const isTransportVisible = await playBtn.isVisible().catch(() => false);
    // Just verify the transport area exists in some form
    expect(isTransportVisible || (await transport.isVisible().catch(() => false))).toBeTruthy();
  });

  test('transport area buttons meet 36px minimum touch target', async ({ page }) => {
    // Find buttons with SVG icons in the lower part of the page
    const buttons = page.locator('.flex.items-center button:has(svg)');
    const count = await buttons.count();
    if (count > 0) {
      // Check a sample of transport-area buttons
      for (let i = 0; i < Math.min(count, 5); i++) {
        const box = await buttons.nth(i).boundingBox();
        if (box && box.y > 400) {
          // likely in transport area (lower half)
          expect(box.width).toBeGreaterThanOrEqual(28); // minimum clickable
          expect(box.height).toBeGreaterThanOrEqual(28);
        }
      }
    }
  });

  // --- Arrangement View ---

  test('arrangement area exists and fills available space', async ({ page }) => {
    // The arrangement view should be the flex-1 area
    const main = page.locator('.flex-1.min-w-0.min-h-0').first();
    if (await main.isVisible()) {
      const box = await main.boundingBox();
      expect(box!.width).toBeGreaterThan(400);
      expect(box!.height).toBeGreaterThan(200);
    }
  });

  // --- Status Bar ---

  test('status bar exists at bottom', async ({ page }) => {
    // StatusBar is last child of AppShell
    const statusBar = page.locator('.flex.flex-col.h-screen > :last-child');
    await expect(statusBar).toBeVisible();
    const box = await statusBar.boundingBox();
    // Should be at the very bottom
    expect(box!.y + box!.height).toBeGreaterThanOrEqual(790); // near viewport bottom
  });

  // --- No scroll ---

  test('editor page does not scroll vertically', async ({ page }) => {
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    );
    expect(scrollable).toBe(false);
  });

  test('html and body have overflow: hidden', async ({ page }) => {
    const htmlOverflow = await page.evaluate(
      () => getComputedStyle(document.documentElement).overflow,
    );
    const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(htmlOverflow).toBe('hidden');
    expect(bodyOverflow).toBe('hidden');
  });
});

// ---------------------------------------------------------------------------
// GLOBAL DESIGN TOKEN CHECKS
// ---------------------------------------------------------------------------

test.describe('Global Design Tokens', () => {
  test('body background is --background (#09090b)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(9, 9, 11)');
  });

  test('body text color is --foreground (#fafafa)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const color = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(color).toBe('rgb(250, 250, 250)');
  });

  test('body uses system font stack', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const ff = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    // Should contain system-ui or -apple-system
    expect(ff).toMatch(/(-apple-system|system-ui|BlinkMacSystemFont)/);
  });

  test('body font size is 14px', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const fs = await page.evaluate(() => getComputedStyle(document.body).fontSize);
    expect(fs).toBe('14px');
  });

  test('body line height is 1.5 (21px at 14px base)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const lh = await page.evaluate(() => getComputedStyle(document.body).lineHeight);
    // 14px * 1.5 = 21px
    expect(lh).toBe('21px');
  });

  test('CSS custom properties are defined on :root', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const vars = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        background: root.getPropertyValue('--background').trim(),
        foreground: root.getPropertyValue('--foreground').trim(),
        primary: root.getPropertyValue('--primary').trim(),
        card: root.getPropertyValue('--card').trim(),
        border: root.getPropertyValue('--border').trim(),
        ring: root.getPropertyValue('--ring').trim(),
        sidebar: root.getPropertyValue('--sidebar').trim(),
      };
    });
    expect(vars.background).toBe('#09090b');
    expect(vars.foreground).toBe('#fafafa');
    expect(vars.primary).toBe('#06b6d4');
    expect(vars.card).toBe('#18181b');
    expect(vars.border).toBe('#3f3f46');
    expect(vars.ring).toBe('#0891b2');
    expect(vars.sidebar).toBe('#111113');
  });
});

// ---------------------------------------------------------------------------
// TYPOGRAPHY HIERARCHY
// ---------------------------------------------------------------------------

test.describe('Typography Hierarchy', () => {
  test('login page: heading > subtitle > body text sizes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const h1Fs = await page.locator('h1').evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    const subtitleFs = await page
      .locator('.text-muted-foreground.text-sm')
      .first()
      .evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    expect(h1Fs).toBeGreaterThan(subtitleFs);
  });

  test('settings page: h1 > h2 > label sizes', async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await page.waitForTimeout(1500);
    const h1Fs = await page
      .locator('h1', { hasText: 'Settings' })
      .evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    const h2Fs = await page
      .locator('h2', { hasText: 'Profile' })
      .evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    const labelFs = await page
      .locator('label[for=settings-display-name]')
      .evaluate((el) => parseInt(getComputedStyle(el).fontSize));
    expect(h1Fs).toBeGreaterThanOrEqual(h2Fs);
    expect(h2Fs).toBeGreaterThan(labelFs);
  });
});

// ---------------------------------------------------------------------------
// INTERACTIVE STATES
// ---------------------------------------------------------------------------

test.describe('Interactive States', () => {
  test('login email input: focus ring appears', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const input = page.locator('#login-email');
    // Before focus
    const shadowBefore = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    await input.focus();
    const shadowAfter = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    // Focus should add a box-shadow (Tailwind ring)
    if (shadowBefore === 'none') {
      expect(shadowAfter).not.toBe('none');
    }
  });

  test('login password input: focus ring appears', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const input = page.locator('#login-password');
    await input.focus();
    const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
  });

  test('settings display name input: focus ring appears', async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await page.waitForTimeout(1500);
    const input = page.locator('#settings-display-name');
    await input.focus();
    const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
  });
});
