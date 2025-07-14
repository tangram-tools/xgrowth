// twitter_like_replies.js
// Usage: node twitter_like_replies.js <tweet_url>
// Requires: PLAYWRIGHT installed, and environment variables TWITTER_USERNAME and TWITTER_PASSWORD

const { chromium } = require('playwright');
require('dotenv').config();

const USERNAME = process.env.TWITTER_USERNAME;
const PASSWORD = process.env.TWITTER_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error('Please set TWITTER_USERNAME and TWITTER_PASSWORD in your environment.');
  process.exit(1);
}

const tweetUrl = process.argv[2];
if (!tweetUrl) {
  console.error('Usage: node twitter_like_replies.js <tweet_url>');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Go to Twitter login
  await page.goto('https://twitter.com/login', { waitUntil: 'networkidle' });

  // 2. Fill in username and password
  await page.fill('input[name="text"]', USERNAME);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.fill('input[name="password"]', PASSWORD);
  await page.keyboard.press('Enter');

  // 3. Wait for home page
  await page.waitForURL('https://twitter.com/home', { timeout: 60000 });

  // 4. Go to the tweet URL
  await page.goto(tweetUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 5. Scroll and like all replies
  let likedCount = 0;
  let lastHeight = 0;
  for (let i = 0; i < 10; i++) { // Scroll up to 10 times
    // Find all reply like buttons that are not already liked
    const likeButtons = await page.$$('div[data-testid="like"]');
    for (const btn of likeButtons) {
      try {
        await btn.click({ timeout: 2000 });
        likedCount++;
        await page.waitForTimeout(300); // Small delay between likes
      } catch (e) {
        // Ignore if already liked or not clickable
      }
    }
    // Scroll to load more replies
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(2000);
    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === lastHeight) break;
    lastHeight = newHeight;
  }

  console.log(`Liked ${likedCount} replies.`);
  await browser.close();
})(); 