#!/usr/bin/env node
/**
 * Quick health check for headless Playwright auth.
 * Run: node e2e/check-auth.mjs
 *
 * If this fails, the most common fixes are:
 * 1. Missing SUPABASE_SERVICE_ROLE_KEY in .env.local
 * 2. Vite dev server not running (npm run dev)
 * 3. Supabase project paused/unreachable
 */

import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
function loadEnv() {
  const env = {};
  try {
    const content = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) env[match[1]] = match[2].trim();
    }
  } catch {}
  return env;
}

const ENV = loadEnv();
const SUPABASE_URL = ENV.VITE_SUPABASE_URL;
const ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_AF_SERVICE_ROLE;
const TEST_EMAIL = 'e2e-playwright@test.local';
const TEST_PASSWORD = 'E2ePlaywright!2026';
const BASE_URL = 'http://localhost:5173';

async function main() {
  console.log('=== Headless Auth Health Check ===\n');

  // Step 1: Check config
  console.log('1. Config:');
  console.log(`   Supabase URL: ${SUPABASE_URL ? 'OK' : 'MISSING'}`);
  console.log(`   Anon key: ${ANON_KEY ? 'OK' : 'MISSING'}`);
  console.log(`   Service role key: ${SERVICE_KEY ? 'OK' : 'MISSING'}`);

  if (!SERVICE_KEY) {
    console.error('\n   STOP: Add SUPABASE_SERVICE_ROLE_KEY to .env.local');
    process.exit(1);
  }

  // Step 2: Ensure test user
  console.log('\n2. Test user:');
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users } = await admin.auth.admin.listUsers();
  let testUser = users?.users?.find((u) => u.email === TEST_EMAIL);

  if (testUser) {
    console.log(`   Exists: ${testUser.id}`);
    await admin.auth.admin.updateUserById(testUser.id, { password: TEST_PASSWORD });
    console.log('   Password reset: OK');
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error(`   Create failed: ${error.message}`);
      process.exit(1);
    }
    testUser = data.user;
    console.log(`   Created: ${testUser.id}`);
  }

  // Step 3: Browser login via form
  console.log('\n3. Browser login:');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill in the login form
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for navigation away from login
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  } catch {
    console.log('   Timed out waiting for redirect');
  }

  await page.waitForLoadState('networkidle');

  const url = page.url();
  const passed = !url.includes('/login');

  console.log(`   URL after login: ${url}`);
  console.log(`   Authenticated: ${passed ? 'YES' : 'NO'}`);

  if (passed) {
    await page.goto(`${BASE_URL}/library`);
    await page.waitForLoadState('networkidle');
    const libraryUrl = page.url();
    console.log(`   Library access: ${libraryUrl.includes('/library') ? 'OK' : 'REDIRECTED to ' + libraryUrl}`);
  }

  await browser.close();

  console.log(passed ? '\n=== ALL CHECKS PASSED ===' : '\n=== AUTH FAILED ===');
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
