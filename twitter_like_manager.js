// twitter_like_manager.js
// Usage: node twitter_like_manager.js <profile_url>
// Requires: PLAYWRIGHT installed, and environment variables TWITTER_USERNAME, TWITTER_EMAIL, and TWITTER_PASSWORD

const { chromium } = require('playwright');
const { spawn } = require('child_process');
require('dotenv').config();

const USERNAME = process.env.TWITTER_USERNAME;
const EMAIL = process.env.TWITTER_EMAIL;
const PASSWORD = process.env.TWITTER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Please set TWITTER_EMAIL and TWITTER_PASSWORD in your environment.');
  process.exit(1);
}

const profileUrl = process.argv[2];
if (!profileUrl) {
  console.error('Usage: node twitter_like_manager.js <profile_url>');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login flow (same as other scripts)
  await page.goto('https://x.com/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('loginButton').click();
  try {
    await page.locator('div').filter({ hasText: /^Phone, email, or username$/ }).nth(3).click({ timeout: 3000 });
  } catch (e) {}
  const usernameBox = page.getByRole('textbox', { name: 'Phone, email, or username' });
  await usernameBox.waitFor({ state: 'visible', timeout: 15000 });
  await usernameBox.fill(EMAIL);
  await usernameBox.press('Enter');
  try {
    const extraUsernameBox = await page.waitForSelector('[data-testid="ocfEnterTextTextInput"]', { timeout: 4000 });
    if (extraUsernameBox) {
      await extraUsernameBox.fill(USERNAME);
      await extraUsernameBox.press('Enter');
    }
  } catch (e) {}
  const passwordBox = page.getByRole('textbox', { name: /Password/ });
  await passwordBox.waitFor({ state: 'visible', timeout: 15000 });
  await passwordBox.fill(PASSWORD);
  await passwordBox.press('Enter');
  await page.waitForURL(/x.com\/home|twitter.com\/home/, { timeout: 60000 });

  // Go to profile
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Scroll to load at least 20 tweets
  let tweetLinks = new Set();
  let scrolls = 0;
  while (tweetLinks.size < 20 && scrolls < 10) {
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => /\/status\/[0-9]+$/.test(href));
    });
    links.forEach(link => tweetLinks.add(link));
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(1500);
    scrolls++;
  }

  tweetLinks = Array.from(tweetLinks).slice(0, 20);
  console.log(`Found ${tweetLinks.length} tweet URLs:`);
  tweetLinks.forEach(url => console.log(url));

  await browser.close();

  // For each tweet, call twitter_like_all_zero_likes.js
  for (const tweetUrl of tweetLinks) {
    console.log(`\nProcessing: ${tweetUrl}`);
    const child = spawn('node', ['twitter_like_all_zero_likes.js', tweetUrl], {
      stdio: 'inherit',
      env: process.env
    });
    await new Promise((resolve, reject) => {
      child.on('close', code => {
        if (code !== 0) {
          console.error(`Child process exited with code ${code}`);
        }
        resolve();
      });
    });
  }

  console.log('All done!');
})(); 