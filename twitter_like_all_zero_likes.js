// twitter_like_all_zero_likes.js
// Usage: node twitter_like_all_zero_likes.js <tweet_url>
// Requires: PLAYWRIGHT installed, and environment variables TWITTER_USERNAME and TWITTER_PASSWORD

const { chromium } = require('playwright');
require('dotenv').config();

const USERNAME = process.env.TWITTER_USERNAME;
const EMAIL = process.env.TWITTER_EMAIL;
const PASSWORD = process.env.TWITTER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Please set TWITTER_USERNAME and TWITTER_PASSWORD in your environment.');
  process.exit(1);
}

const tweetUrl = process.argv[2];
if (!tweetUrl) {
  console.error('Usage: node twitter_like_all_zero_likes.js <tweet_url>');
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
  await usernameBox.fill(EMAIL);
  await usernameBox.press('Enter');

  // 3.5. Handle extra username prompt if it appears (codegen: getByTestId('ocfEnterTextTextInput'))
  try {
    const extraUsernameBox = await page.waitForSelector('[data-testid="ocfEnterTextTextInput"]', { timeout: 4000 });
  if (extraUsernameBox) {
      await extraUsernameBox.fill(USERNAME);
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
  console.log('Logged in successfully!');

  // 6. Go to the tweet URL
  await page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000); // Wait for page to fully load

  // 7. Scroll and like all tweets with zero likes
  try {
    await page.evaluate(async () => {
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      const likedSet = new Set(); // Track already liked buttons
    
      let attemptsWithoutNewTweets = 0;
      const maxAttempts = 5;
    
      while (attemptsWithoutNewTweets < maxAttempts) {
        const buttons = Array.from(document.querySelectorAll('[aria-label="0 Likes. Like"]'));
    
        let likedThisRound = 0;
    
        for (const button of buttons) {
          if (likedSet.has(button)) continue;
    
          button.scrollIntoView({ behavior: "smooth", block: "center" });
          await delay(1000);
          button.click();
          console.log('Liked a tweet!');
          likedSet.add(button);
          likedThisRound++;
          await delay(1000);
        }
    
        if (likedThisRound === 0) {
          attemptsWithoutNewTweets++;
        } else {
          attemptsWithoutNewTweets = 0;
        }
    
        window.scrollBy(0, window.innerHeight);
        await delay(2000); // Give time to load more tweets
      }
    
      console.log('Done scrolling and liking.');
    });
  } catch (e) {
    console.log('Error liking tweets:', e.message);
  }

  await browser.close();
})(); 