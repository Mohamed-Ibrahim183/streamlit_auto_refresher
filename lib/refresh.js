import axios from 'axios';
import puppeteer from 'puppeteer';
import User from '@/lib/models/User';

async function wakeWithBrowser(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
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

    await browser.close();
    return true;
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return false;
  }
}

export async function refreshApp(url) {
  // Quick HTTP check first (works if already awake)
  try {
    const resp = await axios.get(url, { timeout: 30000 });
    if (resp.status === 200) return { url, success: true };
  } catch {
    // likely sleeping — fall through to browser wake-up
  }
  // Browser-based wake-up for sleeping apps
  const ok = await wakeWithBrowser(url);
  return { url, success: true };
}

export async function refreshUserApps(userId) {
  const user = await User.findOne({ userId });
  if (!user) throw new Error('User not found');
  const results = await Promise.allSettled(user.apps.map(a => refreshApp(a.url)));
  const refreshed = user.apps.map((a, i) => ({
    name: a.name,
    url: a.url,
    success: results[i].status === 'fulfilled' && results[i].value.success,
  }));
  return { userId, apps: refreshed };
}

export async function refreshUserApp(userId, appIndex) {
  const user = await User.findOne({ userId });
  if (!user) throw new Error('User not found');
  const app = user.apps[parseInt(appIndex, 10)];
  if (!app) throw new Error('App not found');
  const result = await refreshApp(app.url);
  return { name: app.name, url: app.url, success: result.success };
}
