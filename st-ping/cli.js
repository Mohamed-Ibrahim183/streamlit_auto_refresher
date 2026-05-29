#!/usr/bin/env node
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const { CONFIG_FILE, addApp, deleteApp, getApps, getAppByIdentifier } = require('./lib/apps-file');

const args = process.argv.slice(2);
const command = args[0];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function info(msg) { console.log(`${BLUE}ℹ${RESET} ${msg}`); }
function success(msg) { console.log(`${GREEN}✔${RESET} ${msg}`); }
function warn(msg) { console.log(`${YELLOW}⚠${RESET} ${msg}`); }
function error(msg) { console.log(`${RED}✖${RESET} ${msg}`); }
function highlight(msg) { console.log(`${CYAN}${msg}${RESET}`); }

function stripAnsi(str) {
  return str.replace(/\x1b\[\d+m/g, '');
}

function padTo(str, len) {
  const visible = stripAnsi(str).length;
  return str + ' '.repeat(Math.max(0, len - visible));
}

const COMMANDS = [
  {
    name: 'refresh',
    args: '[name|url]',
    desc: 'Refresh all saved apps from the config file, or a specific one',
    options: [],
    examples: [
      '$ st-refresher refresh',
      '$ st-refresher refresh "My App"',
      '$ st-refresher refresh https://myapp.streamlit.app',
    ],
  },
  {
    name: 'ping',
    args: '<url|api_url> [options]',
    desc: 'Ping a URL once, watch it repeatedly, or refresh via API server',
    options: [
      ['-w, --watch <sec>', 'Watch mode \u2014 ping the URL every N seconds'],
      ['-u, --user <userId>', 'API server mode \u2014 refresh all apps for a user'],
      ['-i, --index <n>', 'App index to refresh (requires -u)'],
    ],
    examples: [
      '$ st-refresher ping https://myapp.streamlit.app',
      '$ st-refresher ping https://myapp.streamlit.app -w 300',
      '$ st-refresher ping http://localhost:3000 -u myuser',
      '$ st-refresher ping http://localhost:3000 -u myuser -i 0',
    ],
  },
  {
    name: 'add',
    args: '<url> [-n <name>]',
    desc: 'Add a Streamlit app URL to the local config file',
    options: [['-n, --name <name>', 'Friendly name for the app']],
    examples: [
      '$ st-refresher add https://myapp.streamlit.app',
      '$ st-refresher add https://myapp.streamlit.app -n "My App"',
    ],
  },
  {
    name: 'delete',
    args: '<url|name>',
    desc: 'Remove an app from the local config file by URL or name',
    options: [],
    examples: [
      '$ st-refresher delete https://myapp.streamlit.app',
      '$ st-refresher delete "My App"',
    ],
  },
  {
    name: 'list',
    args: '',
    desc: 'List all apps saved in the local config file',
    options: [],
    examples: [
      '$ st-refresher list',
    ],
  },
  {
    name: 'schedule',
    args: '',
    desc: 'Register a Windows scheduled task to refresh all apps at user logon',
    options: [],
    examples: [
      '$ st-refresher schedule',
    ],
  },
  {
    name: 'unschedule',
    args: '',
    desc: 'Remove the Windows scheduled task created by "schedule"',
    options: [],
    examples: [
      '$ st-refresher unschedule',
    ],
  },
];

function generateHelp() {
  const lines = [];
  lines.push(`${CYAN}st-refresher${RESET} ${DIM}\u2014 Keep your free-tier Streamlit apps alive${RESET}`);
  lines.push('');
  lines.push(`${BOLD}Usage:${RESET} st-refresher <command> [options]`);
  lines.push('');
  lines.push(`${BOLD}Commands:${RESET}`);
  lines.push('');
  for (const cmd of COMMANDS) {
    const cmdLine = `${YELLOW}${BOLD}${cmd.name}${RESET} ${GRAY}${cmd.args}${RESET}`;
    lines.push(`  ${padTo(cmdLine, 52)}${cmd.desc}`);
    if (cmd.options.length > 0) {
      lines.push(`    ${BOLD}Options:${RESET}`);
      for (const [flag, desc] of cmd.options) {
        lines.push(`    ${GREEN}${flag}${RESET}  ${desc}`);
      }
    }
    if (cmd.examples.length > 0) {
      lines.push(`    ${BOLD}Examples:${RESET}`);
      for (const ex of cmd.examples) {
        lines.push(`    ${GRAY}${ex}${RESET}`);
      }
    }
    lines.push('');
  }
  lines.push(`${DIM}${BLUE}Repository: https://github.com/Mohamed-Ibrahim183/streamlit_auto_refresher${RESET}`);
  return lines.join('\n');
}

function printUsage() {
  console.log(generateHelp());
}

async function refreshUrl(url) {
  let browser;
  try {
    info(`Waking up ${url}...`);
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
      success(`${url} \u2192 wake-up triggered`);
    } else {
      success(`${url} \u2192 already awake`);
    }

    await browser.close();
    return true;
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    warn(`Browser wake-up failed: ${err.message}, trying HTTP fallback...`);
    return refreshUrlFallback(url);
  }
}

async function refreshUrlFallback(url) {
  info(`HTTP fallback: pinging ${url}...`);
  const RETRIES = 3;
  const RETRY_DELAY_MS = 10000;
  for (let i = 0; i < RETRIES; i++) {
    try {
      const resp = await axios.get(url, { timeout: 60000 });
      success(`${url} \u2192 ${resp.status}`);
      return true;
    } catch (err) {
      if (i < RETRIES - 1) warn(`${url} \u2192 ${err.code || err.message}, retrying...`);
    }
    if (i < RETRIES - 1) await sleep(RETRY_DELAY_MS);
  }
  success(`${url} \u2192 wake-up triggered (fallback)`);
  return true;
}

async function cmdPing(args) {
  const target = args[1];
  if (!target) {
    await cmdRefresh(args);
    return;
  }

  const watchIdx = args.indexOf('-w') !== -1 ? args.indexOf('-w') : args.indexOf('--watch');
  const userIdx = args.indexOf('-u') !== -1 ? args.indexOf('-u') : args.indexOf('--user');
  const indexIdx = args.indexOf('-i') !== -1 ? args.indexOf('-i') : args.indexOf('--index');

  const userId = userIdx !== -1 ? args[userIdx + 1] : null;
  const appIndex = indexIdx !== -1 ? args[indexIdx + 1] : null;
  const watchSec = watchIdx !== -1 ? parseInt(args[watchIdx + 1], 10) : null;

  if (userId) {
    const baseUrl = target.replace(/\/+$/, '');
    const ep = appIndex !== null
      ? `${baseUrl}/${userId}/refresh/${appIndex}`
      : `${baseUrl}/${userId}/refresh`;
    try {
      if (appIndex !== null) {
        info(`Refreshing app ${appIndex} for ${userId}...`);
      } else {
        info(`Refreshing all apps for ${userId}...`);
      }
      const res = await axios.get(ep, { timeout: 60000 });
      if (appIndex !== null) {
        const app = res.data;
        const icon = app.success ? `${GREEN}\u2714${RESET}` : `${RED}\u2716${RESET}`;
        console.log(`  ${icon} ${app.name} \u2014 ${app.url}`);
      } else {
        const data = res.data;
        const ok = data.apps.filter(a => a.success).length;
        const fail = data.apps.filter(a => !a.success).length;
        highlight(`\u2014\u2014 Refreshed ${data.apps.length} app(s): ${ok} OK, ${fail} failed \u2014\u2014`);
        for (const app of data.apps) {
          const icon = app.success ? `${GREEN}\u2714${RESET}` : `${RED}\u2716${RESET}`;
          console.log(`  ${icon} ${app.name} \u2014 ${app.url}`);
        }
      }
    } catch (err) {
      error(`API request failed: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  if (watchSec) {
    highlight(`\u2014\u2014 Watching ${target} every ${watchSec}s \u2014\u2014`);
    const intervalMs = watchSec * 1000;
    const refresh = () => refreshUrl(target);
    await refresh();
    setInterval(refresh, intervalMs);
    return;
  }

  const ok = await refreshUrl(target);
  process.exit(ok ? 0 : 1);
}

async function cmdAdd(args) {
  const url = args[1];
  if (!url) { error('Missing argument: <url>'); printUsage(); process.exit(1); }
  const nameIdx = args.indexOf('-n') !== -1 ? args.indexOf('-n') : args.indexOf('--name');
  const name = nameIdx !== -1 ? args[nameIdx + 1] : null;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    error('URL must start with http:// or https://');
    process.exit(1);
  }
  const result = addApp(url, name);
  if (result.success) {
    success(`Added "${result.entry.name}" \u2192 ${result.entry.url}`);
    info(`Config file: ${CONFIG_FILE}`);
  } else {
    warn(result.message);
  }
}

async function cmdDelete(args) {
  const identifier = args[1];
  if (!identifier) { error('Missing argument: <url|name>'); printUsage(); process.exit(1); }
  const result = deleteApp(identifier);
  if (result.success) {
    success(`Deleted "${result.entry.name}" \u2192 ${result.entry.url}`);
  } else {
    error(result.message);
    process.exit(1);
  }
}

async function cmdList() {
  const apps = getApps();
  if (apps.length === 0) {
    info('No apps saved. Use "add" to add one.');
    return;
  }
  highlight(`\u2014\u2014 ${apps.length} app(s) saved \u2014\u2014`);
  for (let i = 0; i < apps.length; i++) {
    console.log(`  ${CYAN}${i + 1}${RESET}  ${BOLD}${apps[i].name}${RESET}  ${GRAY}${apps[i].url}${RESET}`);
  }
  info(`Config file: ${CONFIG_FILE}`);
}

async function cmdRefresh(args) {
  const apps = getApps();
  if (apps.length === 0) {
    error('No apps saved. Use "add" to add apps first.');
    process.exit(1);
  }

  const identifier = args[1];
  let targets = apps;

  if (identifier) {
    const match = getAppByIdentifier(identifier);
    if (!match) {
      error(`No saved app matching: ${identifier}`);
      process.exit(1);
    }
    targets = [match];
    highlight(`\u2014\u2014 Refreshing "${match.name}" \u2014\u2014`);
  } else {
    highlight(`\u2014\u2014 Refreshing all ${apps.length} app(s) \u2014\u2014`);
  }

  let ok = 0;
  for (const app of targets) {
    try {
      const result = await refreshUrl(app.url);
      if (result) ok++;
    } catch {
      error(`Failed: ${app.name} \u2014 ${app.url}`);
    }
  }
  highlight(`\u2014\u2014 Done: ${ok}/${targets.length} succeeded \u2014\u2014`);
}

async function cmdSchedule() {
  const scriptPath = path.join(__dirname, 'cli.js');
  const nodePath = process.execPath;
  const taskName = 'st-refresher-refresh';
  const command = `"${nodePath}" "${scriptPath}" refresh`;
  try {
    execSync(`schtasks /create /tn "${taskName}" /tr "${command}" /sc onlogon /rl highest /f`, { stdio: 'pipe' });
    success(`Scheduled task "${taskName}" created \u2014 refreshes all apps at user logon`);
  } catch (err) {
    error(`Failed to create scheduled task: ${err.stderr ? err.stderr.toString().trim() : err.message}`);
    process.exit(1);
  }
}

async function cmdUnschedule() {
  const taskName = 'st-refresher-refresh';
  try {
    execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'pipe' });
    success(`Scheduled task "${taskName}" removed`);
  } catch (err) {
    error(`Failed to remove scheduled task: ${err.stderr ? err.stderr.toString().trim() : err.message}`);
    process.exit(1);
  }
}

(async () => {
  switch (command) {
    case 'refresh':
      if (!args[1]) {
        await cmdRefresh(args);
        process.exit(0);
      } else if (args[1].startsWith('http://') || args[1].startsWith('https://')) {
        const ok = await refreshUrl(args[1]);
        process.exit(ok ? 0 : 1);
      } else {
        await cmdRefresh(args);
        process.exit(0);
      }
      break;

    case 'ping':
      await cmdPing(args);
      break;

    case 'add':
      await cmdAdd(args);
      process.exit(0);
      break;

    case 'delete':
      await cmdDelete(args);
      process.exit(0);
      break;

    case 'list':
      await cmdList();
      process.exit(0);
      break;

    case 'schedule':
      await cmdSchedule();
      process.exit(0);
      break;

    case 'unschedule':
      await cmdUnschedule();
      process.exit(0);
      break;

    case 'help':
      printUsage();
      process.exit(0);
      break;

    default:
      if (args.length > 0) error(`Unknown command: ${command}`);
      printUsage();
      process.exit(args.length > 0 ? 1 : 0);
  }
})();
