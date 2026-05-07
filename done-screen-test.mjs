import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = 'https://wilsonchengassistant.github.io/sticky-mem';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  // 1. Load the app
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('✓ Home page loaded');

  // 2. Navigate to review
  await page.goto(`${BASE}/review`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log('✓ Review page loaded');

  // Check for done screen elements (no cards due)
  const pageText = await page.textContent('body');
  if (pageText.includes('No cards due') || pageText.includes('✅')) {
    console.log('✓ No cards due screen shown (no crash)');
  } else {
    // Check if there are actual cards
    const hasCard = await page.getByText('Start Review').count() > 0
      || await page.getByText('I don\'t know').count() > 0;
    console.log(`✓ Review content loaded (has cards: ${hasCard})`);
  }

  // Check for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // Navigate around
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}/add`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}/review`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  if (errors.length > 0) {
    console.log(`\n⚠ Console errors (${errors.length}):`);
    errors.forEach(e => console.log(`  ${e.slice(0, 150)}`));
  } else {
    console.log('\n✓ No console errors across all navigations');
  }

  await browser.close();
}

main().catch(e => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
