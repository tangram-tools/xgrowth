// twitter_like_manager_single_login.js
// Usage: node twitter_like_manager_single_login.js <profile_url>
// Requires: PLAYWRIGHT installed, and environment variables TWITTER_USERNAME, TWITTER_EMAIL, and TWITTER_PASSWORD

const { chromium } = require('playwright');
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
  console.error('Usage: node twitter_like_manager_single_login.js <profile_url>');
  process.exit(1);
}

(async () => {
  // Run headless in CI environment (GitHub Actions)
  const isCI = process.env.CI === 'true';
  const browser = await chromium.launch({ 
    headless: isCI,
    args: isCI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`BROWSER LOG: ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  console.log('Starting Twitter Auto Liker...');
  console.log(`Running in ${isCI ? 'headless' : 'visible'} mode`);

  // 1. Login flow
  console.log('Logging in...');
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
  console.log('Logged in successfully!');

  // 2. Go to profile and collect tweet URLs
  console.log(`Going to profile: ${profileUrl}`);
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);
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
  console.log(`Found ${tweetLinks.length} tweet URLs`);

  // 3. For each tweet, like all zero-like tweets/replies
  let totalLiked = 0;
  for (const tweetUrl of tweetLinks) {
    console.log(`\nProcessing: ${tweetUrl}`);
    await page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    try {
      const likeResult = await page.evaluate(async () => {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        const likedSet = new Set();
        let attemptsWithoutNewTweets = 0;
        const maxAttempts = 5;
        let totalLiked = 0;
        
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
            totalLiked++;
            await delay(1000);
          }
          if (likedThisRound === 0) {
            attemptsWithoutNewTweets++;
          } else {
            attemptsWithoutNewTweets = 0;
          }
          window.scrollBy(0, window.innerHeight);
          await delay(2000);
        }
        return totalLiked;
      });
      totalLiked += likeResult;
      console.log(`Liked ${likeResult} tweets in this thread`);
    } catch (e) {
      console.log('Error liking tweets:', e.message);
    }
  }

  console.log(`\n🎉 All done! Total tweets liked: ${totalLiked}`);
  await browser.close();
})(); 