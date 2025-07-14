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

  // 1. Go to X/Twitter home page
  await page.goto('https://x.com/', { waitUntil: 'domcontentloaded' });

  // 2. Click login button
  await page.getByTestId('loginButton').click();

  // 2.5. Click the username/email field if needed (matches codegen)
  try {
    await page.locator('div').filter({ hasText: /^Phone, email, or username$/ }).nth(3).click({ timeout: 3000 });
  } catch (e) {
    // If not present, continue
  }

  // 3. Fill in username/email
  const usernameBox = page.getByRole('textbox', { name: 'Phone, email, or username' });
  await usernameBox.waitFor({ state: 'visible', timeout: 15000 });
  await usernameBox.fill(USERNAME);
  await usernameBox.press('Enter');

  // 3.5. Handle extra username prompt if it appears (codegen: getByTestId('ocfEnterTextTextInput'))
  try {
    const extraUsernameBox = await page.waitForSelector('[data-testid="ocfEnterTextTextInput"]', { timeout: 4000 });
    if (extraUsernameBox) {
      await extraUsernameBox.fill('removethenotch');
      await extraUsernameBox.press('Enter');
    }
  } catch (e) {
    // If not present, continue as normal
  }

  // 4. Fill in password
  const passwordBox = page.getByRole('textbox', { name: /Password/ });
  await passwordBox.waitFor({ state: 'visible', timeout: 15000 });
  await passwordBox.fill(PASSWORD);
  await passwordBox.press('Enter');

  // 5. Wait for home page
  await page.waitForURL(/x.com\/home|twitter.com\/home/, { timeout: 60000 });

  // 6. Go to the tweet URL
  await page.goto(tweetUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 7. Scroll and like all replies
  let likedCount = 0;
  let lastHeight = 0;
  for (let i = 0; i < 10; i++) { // Scroll up to 10 times
    // Find all reply groups with a name containing 'like'
    const replyGroups = await page.getByRole('group', { name: /like/i }).all();
    for (const group of replyGroups) {
      try {
        const likeBtn = await group.getByTestId('like');
        if (likeBtn) {
          await likeBtn.click({ timeout: 2000 });
          likedCount++;
          await page.waitForTimeout(300); // Small delay between likes
        }
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