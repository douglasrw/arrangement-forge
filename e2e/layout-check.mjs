// e2e/layout-check.mjs — Playwright layout diagnostic for Arrangement Forge
// Usage: PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH" npx tsx e2e/layout-check.mjs [project-id]
//
// Checks that the AppShell layout is correctly positioned (no scroll offset).
// Uses the debug route (no auth required) if no auth helper is available.

import { chromium } from 'playwright';

const projectId = process.argv[2] || '737e12b3-b565-41b6-9ddb-f3c6d45e92e1';
const BASE_URL = 'http://localhost:5173';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Try authenticated route first, fall back to debug route
  let url = `${BASE_URL}/project/${projectId}`;

  try {
    // Try loading the auth helper for authenticated access
    const { loginAndGetContext } = await import('./auth-helper.ts');
    const context = await loginAndGetContext(browser);
    const authedPage = await context.newPage();
    await authedPage.setViewportSize({ width: 1440, height: 900 });
    await authedPage.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await authedPage.waitForTimeout(2000);
    await runChecks(authedPage, 'authenticated');
    await browser.close();
    return;
  } catch {
    console.log('Auth helper not available, using unauthenticated route');
  }

  // Unauthenticated fallback — requires /debug-layout route in App.tsx
  url = `${BASE_URL}/project/${projectId}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await runChecks(page, 'unauthenticated');
  await browser.close();
}

async function runChecks(page, mode) {
  await page.screenshot({ path: '/tmp/layout-check.png', fullPage: false });
  console.log(`Screenshot saved: /tmp/layout-check.png (${mode})`);

  const analysis = await page.evaluate(() => {
    const root = document.getElementById('root');
    const hScreen = document.querySelector('[class*="h-screen"]');
    const header = document.querySelector('header');

    const getChildInfo = (parent) => parent ? Array.from(parent.children).map((el, i) => ({
      i, tag: el.tagName,
      cls: (el.className?.substring?.(0, 80) || ''),
      y: Math.round(el.getBoundingClientRect().y),
      h: Math.round(el.getBoundingClientRect().height),
      w: Math.round(el.getBoundingClientRect().width),
    })) : [];

    const mainRow = hScreen?.children?.[1];
    const contentCol = mainRow?.children?.[1];

    return {
      url: location.href,
      viewport: { w: innerWidth, h: innerHeight },
      scrollY,
      root: root ? { h: Math.round(root.getBoundingClientRect().height), pos: getComputedStyle(root).position } : null,
      hScreen: hScreen ? { h: Math.round(hScreen.getBoundingClientRect().height), y: Math.round(hScreen.getBoundingClientRect().y) } : null,
      header: header ? { h: Math.round(header.getBoundingClientRect().height), y: Math.round(header.getBoundingClientRect().y) } : null,
      appShellChildren: getChildInfo(hScreen),
      contentColChildren: getChildInfo(contentCol),
    };
  });

  console.log(JSON.stringify(analysis, null, 2));

  // Assertions
  const failures = [];
  if (analysis.scrollY !== 0) failures.push(`scrollY=${analysis.scrollY} (expected 0)`);
  if (analysis.hScreen?.y !== 0) failures.push(`hScreen.y=${analysis.hScreen?.y} (expected 0)`);
  if (analysis.header?.y !== 0) failures.push(`header.y=${analysis.header?.y} (expected 0)`);

  if (failures.length) {
    console.error('\nFAILED:', failures.join(', '));
    process.exitCode = 1;
  } else {
    console.log('\nPASS: Layout correctly positioned');
  }
}

run().catch(e => { console.error(e); process.exit(1); });
