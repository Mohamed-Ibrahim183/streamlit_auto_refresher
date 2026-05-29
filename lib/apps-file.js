const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = path.join(os.homedir(), '.streamlit-auto-refresher');

function readApps() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return [];
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeApps(apps) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(apps, null, 2), 'utf-8');
}

function addApp(url, name) {
  const apps = readApps();
  const displayName = name || url.replace(/https?:\/\//, '').split('/')[0];
  if (apps.some(a => a.url === url)) {
    return { success: false, message: `URL already exists: ${url}` };
  }
  const entry = { name: displayName, url, addedAt: new Date().toISOString() };
  apps.push(entry);
  writeApps(apps);
  return { success: true, entry };
}

function deleteApp(identifier) {
  const apps = readApps();
  const isUrl = identifier.startsWith('http://') || identifier.startsWith('https://');
  const index = apps.findIndex(a =>
    isUrl ? a.url === identifier : a.name === identifier
  );
  if (index === -1) {
    return { success: false, message: `No app found matching: ${identifier}` };
  }
  const removed = apps.splice(index, 1);
  writeApps(apps);
  return { success: true, entry: removed[0] };
}

function getApps() {
  return readApps();
}

function getAppByIdentifier(identifier) {
  const apps = readApps();
  if (!identifier) return null;
  const isUrl = identifier.startsWith('http://') || identifier.startsWith('https://');
  return apps.find(a =>
    isUrl ? a.url === identifier : a.name === identifier
  ) || null;
}

module.exports = { CONFIG_FILE, addApp, deleteApp, getApps, getAppByIdentifier };
