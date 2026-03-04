import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/vps-calibration.png', fullPage: false });
  console.log('Screenshot saved to /tmp/vps-calibration.png');
  await browser.close();
}

main().catch(console.error);
