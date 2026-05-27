import axios from 'axios';
import puppeteer from 'puppeteer';
import User from '@/lib/models/User';

async function quickHttpCheck(url) {
  try {
    const resp = await axios.get(url, { timeout: 5000 });
    return resp.status === 200;
  } catch {
    return false;
  }
}

async function wakeWithBrowser(browser, url) {
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const hasWakeButton = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).some(b =>
        b.textContent.toLowerCase().includes('get this app back up')
      );
    });

    if (hasWakeButton) {
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const btn = Array.from(buttons).find(b =>
          b.textContent.toLowerCase().includes('get this app back up')
        );
        if (btn) btn.click();
      });
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});
    }

    await page.close();
    return true;
  } catch {
    return false;
  }
}

export async function refreshApp(url, browser) {
  if (await quickHttpCheck(url)) {
    return { url, success: true };
  }
  await wakeWithBrowser(browser, url);
  return { url, success: true };
}

export async function refreshUserApps(userId) {
  const user = await User.findOne({ userId });
  if (!user) throw new Error('User not found');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const results = await Promise.allSettled(user.apps.map(a => refreshApp(a.url, browser)));
    const refreshed = user.apps.map((a, i) => ({
      name: a.name,
      url: a.url,
      success: results[i].status === 'fulfilled' && results[i].value.success,
    }));
    return { userId, apps: refreshed };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export async function refreshUserApp(userId, appIndex) {
  const user = await User.findOne({ userId });
  if (!user) throw new Error('User not found');
  const app = user.apps[parseInt(appIndex, 10)];
  if (!app) throw new Error('App not found');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const result = await refreshApp(app.url, browser);
    return { name: app.name, url: app.url, success: result.success };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
