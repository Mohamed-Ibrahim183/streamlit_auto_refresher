# Streamlit Auto-Refresher

Keep your free-tier Streamlit apps alive by preventing hibernation. Uses Puppeteer to click the wake-up button on sleeping apps.

## Structure

```
cli.js                          CLI entry point
st-ping/                        npm package (published as st-ping)
app/                            Next.js web app (dashboard, auth, API)
lib/                            Server libs (MongoDB models, refresh engine, session)
```

## CLI Tool

```bash
npm run cli -- <command> [options]
```

| Command | Description |
|---|---|
| `ping <url> [options]` | Ping a URL once (`-w <sec>` to watch, `-u <user>` for API mode) |
| `refresh [name\|url]` | Refresh all or one saved app from the config file |
| `add <url> [-n <name>]` | Add an app URL to the local config file |
| `delete <url\|name>` | Remove an app from the config file |
| `list` | Show all saved apps |
| `schedule` | Create a Windows scheduled task (runs refresh at logon) |
| `unschedule` | Remove the scheduled task |

The config file is stored at `~/.streamlit-auto-refresher`.

## Web App

Next.js app with auth (login/signup), dashboard to manage apps, and API routes for refresh.

```bash
npm run dev      # development server
npm run build    # production build
npm start        # start production server
```

## Environment

Create a `.env` file:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Cookie signing secret (>=32 chars) |
| `REFRESH_INTERVAL_MINUTES` | Ping interval for external schedulers |
