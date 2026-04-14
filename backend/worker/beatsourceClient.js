const { chromium } = require('playwright');
const fs = require('fs');
const { isSessionValid, loginAndPersistSession, STORAGE_PATH, getRecordingDirs } = require('./utils/utils');

async function runBeatsourceFlow(request) {
  // Ensure session exists
  if (!fs.existsSync(STORAGE_PATH)) {
    await loginAndPersistSession();
  }

  const browser = await chromium.launch({ headless: false });
  let context = await browser.newContext({
    storageState: STORAGE_PATH
  });

  let page = await context.newPage();

  // 🔐 Validate session
  const valid = await isSessionValid(page);

  console.log('Logged in =>', valid);

  if (!valid) {
    await context.close();

    // Re-login and persist new session
    await loginAndPersistSession();

    // Recreate context with fresh session
    context = await browser.newContext({
      storageState: STORAGE_PATH
    });
    page = await context.newPage();
  }

  try {
    /* -------------------- SEARCH -------------------- */
    const query = `${request.title} ${request.artist}`;

    await page.goto(
      `https://www.beatsource.com/search?q=${encodeURIComponent(query)}`
    );

    // Handle cookie consent banner if present
    try {
      const cookieButton = page.locator('button:has-text("Accept"), button:has-text("Accept All"), button:has-text("I accept"), [data-testid*="cookie"], [class*="cookie"]').first();
      if (await cookieButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('🍪 Accepting cookies...');
        await cookieButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (cookieErr) {
      console.log('ℹ️ No cookie banner found, continuing...');
    }

    /* -------------------- OPEN TRACK -------------------- */
    await page.getByRole('link').first().click();
    await page.waitForLoadState('domcontentloaded');

    /* -------------------- ADD TO PLAYLIST -------------------- */
    const addRequest = page.waitForResponse(resp =>
      resp.url().includes('/add-to-playlist') &&
      resp.request().method() === 'POST' &&
      resp.status() === 200
    );

    await page.getByRole('button', { name: 'Add' }).first().click();

    const playlistResponse = await page.waitForResponse(resp =>
      resp.url().includes('/playlists') &&
      resp.status() === 200
    );

    const data = await playlistResponse.json();

    const beatsourcePlaylistName = process.env.BEATSOURCE_PLAYLIST_NAME;

    const playlistIndex = data.results.findIndex(
      p => p.name === beatsourcePlaylistName
    );

    if (playlistIndex === -1) {
      throw new Error(`Playlist not found: ${beatsourcePlaylistName}`);
    }

    await page.getByTestId('list-view').locator('span').nth(playlistIndex).click();

    await page.getByTestId('add-button').click();

    await addRequest;

    return {
      trackId: request._id.toString(),
      url: page.url()
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

module.exports = runBeatsourceFlow;