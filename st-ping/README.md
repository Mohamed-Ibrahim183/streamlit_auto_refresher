# st-refresher

Keep your free-tier Streamlit apps alive — no web UI needed.

```bash
npm install -g st-refresher
```

## Commands

### `ping`

Ping a Streamlit URL once, watch it, or call an API server.

```bash
st-refresher ping https://myapp.streamlit.app         # ping once
st-refresher ping https://myapp.streamlit.app -w 300   # watch every 300s
st-refresher ping http://localhost:3000 -u myuser      # refresh all via API
st-refresher ping http://localhost:3000 -u myuser -i 0 # refresh app 0 via API
st-refresher ping                                     # refresh all saved apps
```

### `add` / `delete` / `list`

Manage apps in the local config file (`~/.streamlit-auto-refresher`).

```bash
st-refresher add https://myapp.streamlit.app -n "My App"
st-refresher list
st-refresher delete "My App"
st-refresher delete https://myapp.streamlit.app
```

### `refresh`

Refresh saved apps from the config file.

```bash
st-refresher refresh          # refresh all
st-refresher refresh "My App" # refresh one by name
```

### `schedule` / `unschedule`

Windows Task Scheduler integration — runs `st-refresher refresh` at user logon.

```bash
st-refresher schedule
st-refresher unschedule
```

## How it works

1. Launches headless Chrome via Puppeteer
2. Navigates to the URL and looks for the "Yes, get this app back up!" button
3. Clicks it to wake the app
4. Falls back to HTTP GET if Puppeteer fails
