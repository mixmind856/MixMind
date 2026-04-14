const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const STORAGE_PATH = path.join(__dirname, 'beatsource-auth.json');

async function loginAndPersistSession() {
  console.log("Starting login process...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    console.log("Navigating to BeatSource...");
    await page.goto('https://www.beatsource.com/');

    // Try to click sign in button
    try {
      console.log("Trying to click sign in button...");
      await page
        .getByTestId('menu-container-desktop')
        .getByTestId('pill_button')
        .click();
    } catch (e) {
      console.log("Could not find sign in button via testid, trying text...");
      await page.click('text=Sign In');
    }

    console.log("Filling email:", process.env.BEATSOURCE_EMAIL);
    await page.getByRole('textbox', { name: 'Username' })
      .fill(process.env.BEATSOURCE_EMAIL);

    console.log("Filling password...");
    await page.getByRole('textbox', { name: 'Password' })
      .fill(process.env.BEATSOURCE_PASS);

    console.log("Clicking log in button...");
    await page.getByRole('button', { name: 'Log In' }).click();
    
    // Wait for login to complete - may include security checks
    try {
      console.log("Waiting for navigation...");
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
    } catch (e) {
      console.log("Navigation timeout, waiting for load state...");
      await page.waitForLoadState('networkidle');
    }

    // Check if we're logged in
    console.log("Verifying login by navigating to library...");
    await page.goto('https://www.beatsource.com/library', { waitUntil: 'networkidle' });
    const isLoggedIn = await page.waitForSelector('[data-testid="profile-button"]', { timeout: 5000 }).catch(() => null);
    
    if (!isLoggedIn) {
      console.log("Warning: Login may have failed, but continuing...");
    } else {
      console.log("Login successful!");
    }

    console.log("Saving session to storage...");
    await context.storageState({ path: STORAGE_PATH });
    console.log("Session saved successfully");
  } catch (e) {
    console.error("Login error:", e.message);
  } finally {
    await browser.close();
  }

  return true;
}

async function isSessionValid(page) {
  await page.goto('https://www.beatsource.com/', { waitUntil: 'domcontentloaded' });

  // If login button is visible, session is invalid
  const loginVisible = await page
    .getByRole('button', { name: 'Sign In' })
    .isVisible()
    .catch(() => false);

  return !loginVisible;
}

function getRecordingDirs() {
  const date = new Date().toISOString().slice(0, 10);

  const videoDir = path.join(__dirname, 'recordings', 'videos', date);
  const traceDir = path.join(__dirname, 'recordings', 'traces', date);

  fs.mkdirSync(videoDir, { recursive: true });
  fs.mkdirSync(traceDir, { recursive: true });

  return { videoDir, traceDir };
}


module.exports = {
  STORAGE_PATH,
  loginAndPersistSession,
  isSessionValid,
  getRecordingDirs
};
