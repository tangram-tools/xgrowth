// twitter_like_tweet.js
// Usage: node twitter_like_tweet.js <tweet_url>
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
  console.error('Usage: node twitter_like_tweet.js <tweet_url>');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`BROWSER LOG: ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  

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
  console.log('test');

  // 6. Go to the tweet URL
  await page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000); // Wait for page to fully load

  // 7. Wait for tweets to load and scroll to first tweet with no likes
  try {
    const scrollResult = await page.evaluate(() => {
      const buttons = document.querySelectorAll('[aria-label="0 Likes. Like"]');
      if (buttons.length > 0) {
        console.log(`Found ${buttons.length} tweets with 0 likes`);
        buttons[0].scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      } else {
        console.log('No tweets with 0 likes found');
        return false;
      }
    });
  } catch (e) {
    console.log('Error finding tweets to scroll to:', e.message);
  }

  // 8. Click the first tweet with no likes
  await page.waitForTimeout(1000); // Wait for scroll to complete
  
  try {
    await page.evaluate(() => {
      const button = document.querySelector('[aria-label="0 Likes. Like"]');
      if (button) {
        button.click();
        console.log('Clicked first unliked tweet!');
        return true;
      } else {
        console.log('No unliked tweet found to click');
        return false;
      }
    });
  } catch (e) {
    console.log('Error clicking tweet:', e.message);
  }

  // await browser.close();
})(); 