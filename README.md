# Streamlit Auto-Refresher

Keep your free-tier Streamlit apps alive by preventing hibernation. Uses Puppeteer to click the wake-up button on sleeping apps.

## Features

- **Web dashboard** — manage apps, refresh with one click, copy API links
- **REST API** — refresh all or specific apps via GET requests
- **CLI tool** — refresh, watch, and manage apps from the terminal
- **Dark/Light mode** — toggle theme, dark mode by default
- **Multi-user** — MongoDB-backed authentication and app storage

## Structure

```
cli.js                          CLI entry point
st-ping/                        npm package (published as st-refresher)
app/                            Next.js web app (dashboard, auth, API)
lib/                            Server libs (MongoDB models, refresh engine, session)
public/                         Static assets (logo)
```

## Web App

Next.js app with auth (login/signup), dashboard to manage apps, and API routes for refresh.

```bash
npm run dev      # development server
npm run build    # production build
npm start        # start production server
```

## CLI Tool

```bash
npm run cli -- <command> [options]
```

| Command | Description |
|---|---|
| `refresh <url>` | Ping a Streamlit app URL once to keep it alive |
| `watch <url> <interval_sec>` | Ping a URL repeatedly every N seconds |
| `api-refresh <api_url> <userId>` | Call the API server to refresh all apps for a user |
| `api-refresh-app <api_url> <userId> <appIndex>` | Call the API server to refresh a single app by index |

### Examples

```bash
npm run cli refresh https://myapp.streamlit.app
npm run cli watch https://myapp.streamlit.app 300
npm run cli api-refresh http://localhost:3000 myuser
npm run cli api-refresh-app http://localhost:3000 myuser 0
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/{userId}/refresh` | Refresh all apps for a user |
| GET | `/{userId}/refresh/{index}` | Refresh a single app by index |

```bash
curl https://your-app.com/user123/refresh
curl https://your-app.com/user123/refresh/0
```

## Environment

Create a `.env` file:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Cookie signing secret (>=32 chars) |
| `REFRESH_INTERVAL_MINUTES` | Ping interval for external schedulers |
