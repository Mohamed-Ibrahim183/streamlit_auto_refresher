import axios from 'axios';
import User from '@/lib/models/User';

export async function refreshApp(url) {
  try {
    const resp = await axios.get(url, { timeout: 60000 });
    return { url, success: resp.status === 200 };
  } catch {
    return { url, success: true };
  }
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
