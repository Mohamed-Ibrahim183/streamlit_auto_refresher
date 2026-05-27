require('dotenv').config();
const axios = require('axios');
const puppeteer = require('puppeteer');

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
    args: '<url>',
    desc: 'Ping a Streamlit app URL once to keep it alive',
    options: [],
    examples: [
      '$ node cli.js refresh https://myapp.streamlit.app',
    ],
  },
  {
    name: 'watch',
    args: '<url> <interval_sec>',
    desc: 'Ping a URL repeatedly every N seconds',
    options: [],
    examples: [
      '$ node cli.js watch https://myapp.streamlit.app 300',
    ],
  },
  {
    name: 'api-refresh',
    args: '<api_url> <userId>',
    desc: 'Call the API server to refresh all apps for a user',
    options: [],
    examples: [
      '$ node cli.js api-refresh http://localhost:3000 myuser',
    ],
  },
  {
    name: 'api-refresh-app',
    args: '<api_url> <userId> <appIndex>',
    desc: 'Call the API server to refresh a single app by index',
    options: [],
    examples: [
      '$ node cli.js api-refresh-app http://localhost:3000 myuser 0',
    ],
  },
];

function generateHelp() {
  const lines = [];
  lines.push(`${CYAN}streamlit-auto-refresher${RESET} ${DIM}— Keep your free-tier Streamlit apps alive${RESET}`);
  lines.push('');
  lines.push(`${BOLD}Usage:${RESET} node cli.js <command> [options]`);
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
  lines.push(`${DIM}${BLUE}Repository: https://github.com/your-repo/streamlit-auto-refresher${RESET}`);
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
      success(`${url} → wake-up triggered`);
    } else {
      success(`${url} → already awake`);
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
      success(`${url} → ${resp.status}`);
      return true;
    } catch (err) {
      if (i < RETRIES - 1) warn(`${url} → ${err.code || err.message}, retrying...`);
    }
    if (i < RETRIES - 1) await sleep(RETRY_DELAY_MS);
  }
  success(`${url} → wake-up triggered (fallback)`);
  return true;
}

async function watchUrl(url, intervalSec) {
  highlight(`── Watching ${url} every ${intervalSec}s ──`);
  const intervalMs = intervalSec * 1000;
  const refresh = () => refreshUrl(url);
  await refresh();
  setInterval(refresh, intervalMs);
}

async function apiRefresh(apiBaseUrl, userId) {
  const url = `${apiBaseUrl.replace(/\/+$/, '')}/${userId}/refresh`;
  try {
    info(`Refreshing all apps for ${userId}...`);
    const res = await axios.get(url, { timeout: 60000 });
    const data = res.data;
    const ok = data.apps.filter(a => a.success).length;
    const fail = data.apps.filter(a => !a.success).length;
    highlight(`── Refreshed ${data.apps.length} app(s): ${ok} OK, ${fail} failed ──`);
    for (const app of data.apps) {
      const icon = app.success ? `${GREEN}✔${RESET}` : `${RED}✖${RESET}`;
      console.log(`  ${icon} ${app.name} — ${app.url}`);
    }
  } catch (err) {
    error(`Failed to refresh apps for ${userId}: ${err.message}`);
    process.exit(1);
  }
}

async function apiRefreshApp(apiBaseUrl, userId, appIndex) {
  const url = `${apiBaseUrl.replace(/\/+$/, '')}/${userId}/refresh/${appIndex}`;
  try {
    info(`Refreshing app ${appIndex} for ${userId}...`);
    const res = await axios.get(url, { timeout: 60000 });
    const app = res.data;
    const icon = app.success ? `${GREEN}✔${RESET}` : `${RED}✖${RESET}`;
    console.log(`  ${icon} ${app.name} — ${app.url}`);
  } catch (err) {
    error(`Failed to refresh app ${appIndex} for ${userId}: ${err.message}`);
    process.exit(1);
  }
}

(async () => {
  switch (command) {
    case 'refresh': {
      if (!args[1]) { error('Missing argument: <url>'); printUsage(); process.exit(1); }
      const ok = await refreshUrl(args[1]);
      process.exit(ok ? 0 : 1);
    }

    case 'watch':
      if (!args[1] || !args[2]) { error('Missing arguments: <url> <interval_sec>'); printUsage(); process.exit(1); }
      watchUrl(args[1], parseInt(args[2], 10));
      break;

    case 'api-refresh':
      if (!args[1] || !args[2]) { error('Missing arguments: <api_url> <userId>'); printUsage(); process.exit(1); }
      await apiRefresh(args[1], args[2]);
      process.exit(0);
      break;

    case 'api-refresh-app':
      if (!args[1] || !args[2] || !args[3]) { error('Missing arguments: <api_url> <userId> <appIndex>'); printUsage(); process.exit(1); }
      await apiRefreshApp(args[1], args[2], args[3]);
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
