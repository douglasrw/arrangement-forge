/**
 * e2e/auth-helper.ts — Headless Playwright authentication for Supabase.
 *
 * Creates a dedicated test user via the Supabase admin API (service role key),
 * then signs in through the actual login form — the same flow a real user takes.
 *
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local (get from Supabase dashboard → Settings → API)
 *   - VITE_SUPABASE_URL in .env.local
 *   - VITE_SUPABASE_ANON_KEY in .env.local
 *   - Vite dev server running on localhost:5173
 *
 * Usage in a Playwright script:
 *   import { authenticatedPage } from './e2e/auth-helper.ts';
 *   const { page, teardown } = await authenticatedPage();
 *   await page.goto('http://localhost:5173/project/...');
 *   // ... do stuff ...
 *   await teardown();
 */

import { createClient } from '@supabase/supabase-js';
import { chromium, type Page, type BrowserContext, type Browser } from 'playwright';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Config — reads from .env.local, falls back to process.env
// ---------------------------------------------------------------------------
function loadEnv(): Record<string, string> {
  const envPath = resolve(import.meta.dirname ?? '.', '..', '.env.local');
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) env[match[1]] = match[2].trim();
    }
  } catch {
    // Fall back to process.env
  }
  return env;
}

const ENV = loadEnv();

const SUPABASE_URL = ENV.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
// Check .env.local first, then project-specific env name, then generic env name
const SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.SUPABASE_AF_SERVICE_ROLE
  ?? '';

const TEST_EMAIL = 'e2e-playwright@test.local';
const TEST_PASSWORD = 'E2ePlaywright!2026';
const BASE_URL = 'http://localhost:5173';

const PROJECT_REF = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] ?? '';

// ---------------------------------------------------------------------------
// Admin client (service role) — can create/manage users
// ---------------------------------------------------------------------------
function getAdminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY not found in .env.local or environment.\n' +
      'Get it from: https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/api\n' +
      'Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=eyJ...'
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Ensure test user exists (self-healing)
// ---------------------------------------------------------------------------
async function ensureTestUser(): Promise<string> {
  const admin = getAdminClient();

  const { data: existing } = await admin.auth.admin.listUsers();
  const testUser = existing?.users?.find((u) => u.email === TEST_EMAIL);

  if (testUser) {
    await admin.auth.admin.updateUserById(testUser.id, { password: TEST_PASSWORD });
    return testUser.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data.user.id;
}

// ---------------------------------------------------------------------------
// Public API: get an authenticated Playwright page
// ---------------------------------------------------------------------------
export interface AuthenticatedPageOptions {
  viewport?: { width: number; height: number };
  headless?: boolean;
  baseUrl?: string;
}

export interface AuthenticatedPageResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  userId: string;
  teardown: () => Promise<void>;
}

export async function authenticatedPage(
  options: AuthenticatedPageOptions = {}
): Promise<AuthenticatedPageResult> {
  const {
    viewport = { width: 1440, height: 900 },
    headless = true,
    baseUrl = BASE_URL,
  } = options;

  // 1. Ensure test user exists (self-healing)
  const userId = await ensureTestUser();

  // 2. Launch browser
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  // 3. Navigate to login page
  await page.goto(`${baseUrl}/login`);
  await page.waitForLoadState('networkidle');

  // 4. Fill in and submit the login form
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // 5. Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  return {
    browser,
    context,
    page,
    userId,
    teardown: async () => {
      await context.close();
      await browser.close();
    },
  };
}

// ---------------------------------------------------------------------------
// Health check — run directly to verify auth works
// ---------------------------------------------------------------------------
export async function healthCheck(): Promise<boolean> {
  try {
    console.log('=== Headless Auth Health Check ===\n');

    console.log('1. Config:');
    console.log(`   Supabase URL: ${SUPABASE_URL ? 'OK' : 'MISSING'}`);
    console.log(`   Anon key: ${SUPABASE_ANON_KEY ? 'OK' : 'MISSING'}`);
    console.log(`   Service role key: ${SERVICE_ROLE_KEY ? 'OK' : 'MISSING'}`);

    if (!SERVICE_ROLE_KEY) {
      console.error('\n   STOP: Add SUPABASE_SERVICE_ROLE_KEY to .env.local');
      return false;
    }

    console.log('\n2. Test user:');
    const userId = await ensureTestUser();
    console.log(`   Ready: ${userId}`);

    console.log('\n3. Browser login:');
    const { page, teardown } = await authenticatedPage();

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

    await teardown();

    console.log(passed ? '\n=== ALL CHECKS PASSED ===' : '\n=== AUTH FAILED ===');
    return passed;
  } catch (err) {
    console.error('\nHealth check failed:', (err as Error).message);
    return false;
  }
}

// Run health check if executed directly
if (process.argv[1]?.includes('auth-helper')) {
  healthCheck().then((ok) => process.exit(ok ? 0 : 1));
}
