import { chromium } from 'playwright';

const BASE = 'https://wilsonchengassistant.github.io/sticky-mem';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function test(label, fn) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    await fn(page);
    const status = errors.length === 0 ? '✅ PASS' : `❌ FAIL (${errors.length} errors)`;
    console.log(`${status}: ${label}`);
    if (errors.length > 0) errors.forEach(e => console.log(`   💥 ${e}`));
  } catch (err) {
    console.log(`❌ FAIL: ${label}`);
    console.log(`   ${err.message}`);
    await page.screenshot({ path: `/tmp/e2e-${label.replace(/[^a-z0-9]/gi, '-')}.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

async function waitForApp(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(
    () => document.getElementById('root')?.textContent?.length > 20,
    { timeout: 20000 }
  );
  await sleep(2000);
}

async function clearOnboarding(page) {
  await page.evaluate(() => {
    try { localStorage.removeItem('stickymem-settings'); } catch(e) {}
  });
}

// ─── TEST: Click "Next" advances onboarding ───
await test('Next button advances slide', async (page) => {
  await clearOnboarding(page);
  await waitForApp(page);
  await sleep(1000);

  // RN Web renders Pressable as <div>, not <button> — use getByText
  const nextEl = page.getByText('Next');
  await nextEl.waitFor({ state: 'visible', timeout: 5000 });
  await nextEl.click();
  await sleep(800);

  // Current should have advanced — verify by checking that "Next" still exists
  // (slides 1&2 have Next, slide 3 has "Get Started")
  const nextStillThere = await page.getByText('Next').isVisible().catch(() => false);
  const getStarted = await page.getByText('Get Started').isVisible().catch(() => false);
  const url = page.url();

  console.log(`   After one Next click: url=${url}, next=${nextStillThere}, getStarted=${getStarted}`);

  // Click Next two more times to reach the last slide
  if (nextStillThere) {
    await page.getByText('Next').click();
    await sleep(800);
  }
  const nextStillThere2 = await page.getByText('Next').isVisible().catch(() => false);
  const getStarted2 = await page.getByText('Get Started').isVisible().catch(() => false);
  console.log(`   After second Next click: next=${nextStillThere2}, getStarted=${getStarted2}`);

  // If "Get Started" is now visible, click it
  if (getStarted2) {
    await page.getByText('Get Started').click();
    await sleep(2000);
    const finalUrl = page.url();
    console.log(`   After Get Started: url=${finalUrl}`);
    if (finalUrl.includes('/onboarding')) {
      throw new Error(`Expected to leave onboarding after Get Started, still at: ${finalUrl}`);
    }
  }
});

// ─── TEST: All sub-path direct access ───
await test('Direct + refresh /onboarding no 404', async (page) => {
  await clearOnboarding(page);
  const responses = [];
  page.on('response', r => {
    if (r.status() >= 400) responses.push(`${r.status()} ${r.url()}`);
  });

  // Direct sub-path
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(
    () => document.getElementById('root')?.textContent?.length > 20,
    { timeout: 20000 }
  );
  await sleep(1500);

  console.log(`   Direct /onboarding: url=${page.url()}`);
  console.log(`   4xx responses: ${responses.filter(r => r.startsWith('4')).join(', ') || 'none'}`);

  if (page.url().includes('404') || page.url().includes('not-found')) {
    throw new Error(`Redirected to 404: ${page.url()}`);
  }

  // Refresh
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(
    () => document.getElementById('root')?.textContent?.length > 20,
    { timeout: 20000 }
  );
  await sleep(2000);
  console.log(`   After refresh: url=${page.url()}`);
  console.log(`   4xx responses after refresh: ${responses.filter(r => r.startsWith('4')).join(', ') || 'none'}`);

  if (page.url().includes('404') || page.url().includes('not-found')) {
    throw new Error(`Refreshed to 404: ${page.url()}`);
  }

  // Try other sub-paths too
  for (const path of ['/home', '/schedule', '/settings']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await sleep(1000);
    console.log(`   ${path}: url=${page.url()}`);
  }
});

console.log('\n--- All tests complete ---');
