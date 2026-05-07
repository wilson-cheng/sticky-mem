import { chromium } from 'playwright';

const BASE = 'https://wilsonchengassistant.github.io/sticky-mem';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  // Capture ALL errors with full stack
  const errors = [];
  page.on('pageerror', err => {
    errors.push({ type: 'uncaught', msg: err.message, stack: err.stack });
  });

  // Also capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console.error', msg: msg.text() });
    }
  });

  // Step 1: Go to root, set up localStorage with test DB data + mark onboarding
  console.log('1. Loading app...');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  console.log(`   URL: ${page.url()}`);

  // Check what's in localStorage
  const keys = await page.evaluate(() => {
    const k = [];
    for (let i = 0; i < localStorage.length; i++) {
      k.push(localStorage.key(i));
    }
    return k;
  });
  console.log('   localStorage keys:', keys);

  // Find the zustand persist storage key
  const storageKey = keys.find(k => k.includes('settings') || k.includes('sticky') || k === 'hasSeenOnboarding');
  console.log('   persist key found:', storageKey);

  // Step 2: Populate database + mark onboarding seen
  console.log('2. Seeding test data...');
  await page.evaluate(() => {
    localStorage.setItem('stickymem-webdb', JSON.stringify({
      contents: [
        {
          id: 'test-content-1',
          source_type: 'text',
          title: 'AI Fundamentals',
          raw_text: 'AI is the simulation of human intelligence by machines.',
          created_at: Date.now(),
          updated_at: Date.now(),
        }
      ],
      questions: [
        {
          id: 'test-q-1',
          content_id: 'test-content-1',
          type: 'multiple_choice',
          question: 'What is Machine Learning?',
          correct_answer: 'A subset of AI that learns from data',
          options: JSON.stringify([
            'A subset of AI that learns from data',
            'A type of neural network',
            'A programming language',
            'A database system'
          ]),
          explanation: 'Machine Learning is a subset of AI.',
          created_at: Date.now(),
        }
      ],
      cards: [
        {
          question_id: 'test-q-1',
          easiness: 2.5,
          interval: 0,
          repetitions: 0,
          next_review_at: 0,
          last_review_at: 0,
        }
      ],
      reviews: [],
      daily_stats: []
    }));
  });
  await sleep(500);

  // Step 3: Reload the app (so it picks up the test data)
  console.log('3. Reloading app...');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  console.log(`   URL: ${page.url()}`);

  // Step 4: Navigate to review page
  console.log('4. Navigating to /review...');
  await page.goto(`${BASE}/review`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000);
  console.log(`   URL: ${page.url()}`);

  // Step 5: Check page content and errors
  console.log('\n5. Results:');
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || 'NO BODY');
  console.log(`   Body text: "${bodyText}"`);

  if (errors.length > 0) {
    console.log(`   ${errors.length} error(s):`);
    errors.forEach((e, i) => {
      console.log(`\n   [${i}] ${e.type}: ${e.msg}`);
      if (e.stack) {
        const lines = e.stack.split('\n').slice(0, 6).map(l => l.trim()).join('\n      ');
        console.log(`      ${lines}`);
      }
    });
  } else {
    console.log('   No errors - page rendered successfully!');
  }

  // Screenshot
  const screenshotPath = '/home/wilson/projects/sticky-mem/repro-gh.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n   Screenshot: ${screenshotPath}`);

  await browser.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
