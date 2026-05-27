# Streamlit Auto-Refresher

Keep your free-tier Streamlit apps alive by preventing the 12-hour hibernation. Uses headless Chrome (Puppeteer) to click the "Yes, get this app back up!" wake-up button on sleeping apps.

## Project Structure

```
├── cli.js                          # CLI entry point (4 commands)
├── package.json                    # Dependencies & scripts
├── next.config.mjs                 # Next.js URL rewrites
├── jsconfig.json                   # Path alias @/*
├── .env                            # MongoDB URI, session secret, refresh interval
├── Design.md                       # CLI styling docs (from sibling project)
│
├── app/                            # Next.js App Router
│   ├── globals.css                 # Global styles & spinner animations
│   ├── layout.js                   # Root layout + Toaster provider
│   ├── page.js                     # Landing page (server component)
│   ├── dashboard/page.js           # Dashboard (client component)
│   ├── login/page.js               # Login form
│   ├── signup/page.js              # Signup form
│   └── api/
│       ├── auth/
│       │   ├── login/route.js      # POST  — authenticate user
│       │   ├── signup/route.js     # POST  — register user
│       │   └── logout/route.js     # GET   — clear session
│       ├── user/me/route.js        # GET   — current user data
│       ├── users/[userId]/apps/
│       │   ├── route.js            # POST  — add app
│       │   └── [appIndex]/route.js # DELETE — remove app
│       └── refresh/
│           ├── [userId]/route.js   # GET   — refresh all user apps
│           └── [userId]/[appIndex]/route.js  # GET — refresh one app
│
└── lib/                            # Server-side libraries
    ├── mongodb.js                  # Mongoose connection (cached singleton)
    ├── session.js                  # Cookie-based auth sessions
    ├── refresh.js                  # Wake-up engine (axios + Puppeteer)
    └── models/User.js              # Mongoose User schema
```

## Setup

### Prerequisites

- Node.js 18+
- MongoDB instance (Atlas, local, etc.)
- Chrome/Chromium (for Puppeteer — installed automatically with `npm install`)

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file (a template is included in the repo):

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/...` |
| `SESSION_SECRET` | Secret for cookie signing (≥32 chars) | `your-secret-key-at-least-32-characters!!` |
| `REFRESH_INTERVAL_MINUTES` | How often to ping (for external schedulers) | `10` |

### Run the web app

```bash
npm run dev        # development server at http://localhost:3000
npm run build      # production build
npm start          # start production server
```

---

## CLI Tool

The CLI can wake up apps directly without the web UI.

```bash
npm run cli -- <command> [options]
# or
node cli.js <command> [options]
```

### Commands

#### `refresh <url>`

Wakes up a single Streamlit app. Launches headless Chrome, navigates to the URL, detects and clicks the "Yes, get this app back up!" button, then waits for the app to load. Falls back to HTTP GET if Puppeteer fails.

```bash
node cli.js refresh https://myapp.streamlit.app
```

**How it works** (`cli.js:107-146`):
1. Launches Puppeteer with `--no-sandbox`
2. Navigates to the URL with 60s timeout
3. Searches all `<button>` elements for text containing "get this app back up"
4. If found, clicks it and waits for navigation (120s timeout)
5. If not found, reports app as already awake
6. On error, falls back to `refreshUrlFallback()` which uses axios with 3 retries

#### `watch <url> <interval_sec>`

Pings a URL repeatedly at a given interval. Calls `refreshUrl()` each time.

```bash
node cli.js watch https://myapp.streamlit.app 300   # every 5 minutes
```

**How it works** (`cli.js:167-173`):
- Calls `refreshUrl()` once immediately
- Then uses `setInterval()` to repeat at the specified interval
- Runs indefinitely (no `process.exit`) — use Ctrl+C to stop

#### `api-refresh <api_url> <userId>`

Calls your own API server to refresh all apps for a user.

```bash
node cli.js api-refresh http://localhost:3000 myuser
```

**How it works** (`cli.js:175-190`):
- Sends `GET /<userId>/refresh` to the API server
- Prints each app result with ✔ / ✖ icons
- Exits with code 1 on failure

#### `api-refresh-app <api_url> <userId> <appIndex>`

Calls the API server to refresh a single app by its index.

```bash
node cli.js api-refresh-app http://localhost:3000 myuser 0
```

**How it works** (`cli.js:192-205`):
- Sends `GET /<userId>/refresh/<appIndex>` to the API server
- Prints the single app result
- Exits with code 1 on failure

### ANSI Styling

The CLI uses ANSI escape codes for colored output (`cli.js:10-23`):

| Function | Color | Icon | Usage |
|---|---|---|---|
| `info()` | Blue | ℹ | Informational messages |
| `success()` | Green | ✔ | Success confirmations |
| `warn()` | Yellow | ⚠ | Warnings, retries |
| `error()` | Red | ✖ | Errors |
| `highlight()` | Cyan | (none) | Section headers |

The `stripAnsi()` and `padTo()` helpers (`cli.js:25-32`) ensure help text column alignment by measuring visible string width without ANSI codes.

---

## Web App Pages

### Landing Page (`app/page.js`)

Server component. Static marketing page with links to Sign In and Create Account. No client-side JavaScript.

### Login (`app/login/page.js:1-59`)

Client component. Form with userId/email + password. POSTs to `/api/auth/login`. Shows inline error banner on failure, toast notification on success, spinner on the submit button while loading.

### Signup (`app/signup/page.js:1-67`)

Client component. Form with display name, email (optional), and password. POSTs to `/api/auth/signup`. Auto-generates a unique userId via `crypto.randomBytes(6).toString('hex')`. Shows spinner + toast.

### Dashboard (`app/dashboard/page.js`)

Client component. The main authenticated page.

**State management** (`page.js:10-15`):
- `user` — current user object with embedded `apps` array
- `loading` — initial auth check in progress
- `busy` — object tracking which buttons are loading (`'all'`, `'add'`, `'refresh-0'`, `'delete-0'`, etc.)
- `addName` / `addUrl` — controlled inputs for the add-app form

**Auth guard** (`page.js:17-21`):
- On mount, fetches `/api/user/me`
- If not authenticated (401), redirects to `/login`
- Shows a centered spinner with "Loading..." text while checking

**Refresh All** (`page.js:30-43`):
- POSTs to `GET /api/refresh/<userId>`
- Shows spinner on the button, disables it
- On success: toast with summary (e.g. "Refreshed 3 app(s) — 2 ok, 1 failed")
- On error: error toast

**Refresh One** (`page.js:45-58`):
- Per-app "Refresh" button, independently tracks `busy['refresh-<index>']`
- Shows spinner inside the button while running
- Success toast: `"App Name — OK"` or `"App Name — failed"`
- Error toast: server error or connection error

**Add App** (`page.js:60-73`):
- Controlled form with name + URL inputs
- POSTs to `POST /api/users/<userId>/apps`
- Clears inputs on success, shows "App added" toast
- Error toast on failure

**Delete App** (`page.js:75-85`):
- Per-app "Remove" button with independent loading state
- DELETE to `DELETE /api/users/<userId>/apps/<index>`
- Shows "App removed" toast on success
- Error toast on failure

**Logout** (`page.js:87-91`):
- GETs `/api/auth/logout`, shows "Signed out" toast, redirects to `/login`

**Empty state** (`page.js:151-153`):
- When `user.apps.length === 0`, shows centered placeholder text: "No apps added yet."

---

## API Routes

### Auth

#### `POST /api/auth/login` (`app/api/auth/login/route.js:1-21`)

Authenticates a user. Looks up by `userId` or `email`, uses `bcrypt.compare()` to verify password. Sets a session cookie on success.

```json
// Request
{ "userId": "myuser", "password": "..." }
// Response 200
{ "success": true }
// Response 401
{ "error": "Invalid credentials" }
```

#### `POST /api/auth/signup` (`app/api/auth/signup/route.js:1-33`)

Creates a new user. Checks for duplicate email, generates a random 12-char hex `userId`, hashes password with bcrypt (10 rounds), creates the MongoDB document, sets session cookie.

```json
// Request
{ "name": "My Name", "email": "...", "password": "..." }
// Response 200
{ "success": true, "userId": "a1b2c3d4e5f6" }
// Response 400
{ "error": "Email already exists" }
```

#### `GET /api/auth/logout` (`app/api/auth/logout/route.js:1-7`)

Clears the session cookie.

### User Data

#### `GET /api/user/me` (`app/api/user/me/route.js:1-17`)

Returns the authenticated user (password excluded via `.select('-password')`). Requires valid session cookie.

```json
{ "_id": "...", "userId": "myuser", "name": "My Name", "apps": [...], "createdAt": "..." }
```

### App Management

#### `POST /api/users/:userId/apps` (`app/api/users/[userId]/apps/route.js:1-22`)

Adds an app to the user's list. Requires auth and matching `userId`. Pushes `{ name, url }` to the `apps` array.

#### `DELETE /api/users/:userId/apps/:appIndex` (`app/api/users/[userId]/apps/[appIndex]/route.js:1-21`)

Removes an app by array index. Splices from the `apps` array. Requires auth and matching `userId`.

### Refresh

#### `GET /api/refresh/:userId` (`app/api/refresh/[userId]/route.js:1-14`)

Refreshes all apps for a user. Calls `refreshUserApps()` from `lib/refresh.js`, which runs all app wake-ups in parallel via `Promise.allSettled`.

```json
{ "userId": "myuser", "apps": [{ "name": "...", "url": "...", "success": true }, ...] }
```

#### `GET /api/refresh/:userId/:appIndex` (`app/api/refresh/[userId]/[appIndex]/route.js:1-14`)

Refreshes a single app by index. Calls `refreshUserApp()`.

```json
{ "name": "...", "url": "...", "success": true }
```

These routes are also accessible via clean URLs thanks to `next.config.mjs`:
- `GET /<userId>/refresh` → `/api/refresh/<userId>`
- `GET /<userId>/refresh/<index>` → `/api/refresh/<userId>/<index>`

---

## Library Modules

### `lib/mongodb.js` — Database Connection

Cached Mongoose singleton pattern (`lib/mongodb.js:1-17`). Stores the connection in `global._mongoose` so it persists across hot reloads in development. Uses `MONGODB_URI` from `.env`.

### `lib/session.js` — Cookie Sessions

Three functions (`lib/session.js:1-25`):

| Function | Description |
|---|---|
| `getSession()` | Reads `sid` cookie from `next/headers`. Returns `{ userId }` or `{ userId: null }`. |
| `setCookieOnResponse(res, userId)` | Sets `sid` cookie with httpOnly, secure (in production), sameSite lax, 7-day expiry. |
| `clearCookieOnResponse(res)` | Deletes `sid` cookie. |

### `lib/refresh.js` — Wake-Up Engine

Three exported functions (`lib/refresh.js:1-73`):

**`refreshApp(url)`** (`lib/refresh.js:41-52`):
1. Tries a quick `axios.get(url, { timeout: 30000 })` first — works if the app is already awake
2. If it fails (redirect loop, timeout, etc.), falls through to `wakeWithBrowser()`
3. Always returns `{ url, success: true }` (optimistic)

**`wakeWithBrowser(url)`** (`lib/refresh.js:5-39`):
- Launches Puppeteer headless Chrome
- Navigates to the URL
- Looks for a button containing "get this app back up"
- Clicks it and waits for navigation
- Returns `true` on success, `false` on error

**`refreshUserApps(userId)`** (`lib/refresh.js:54-64`):
- Fetches user from MongoDB
- Calls `refreshApp()` for each app in parallel via `Promise.allSettled`
- Returns `{ userId, apps: [{ name, url, success }] }`

**`refreshUserApp(userId, appIndex)`** (`lib/refresh.js:66-73`):
- Fetches user, looks up app by index
- Calls `refreshApp()` on the single URL
- Returns `{ name, url, success }`

### `lib/models/User.js` — Mongoose Schema

Two schemas (`lib/models/User.js:1-18`):

**`appSchema`** (embedded sub-document):
- `name` (String, required)
- `url` (String, required)
- `addedAt` (Date, defaults to now)

**`userSchema`**:
- `userId` (String, required, unique)
- `name` (String, required)
- `email` (String, optional, unique, sparse, lowercased)
- `password` (String, hashed with bcrypt)
- `apps` ([appSchema], default empty)
- `createdAt` (Date, defaults to now)

The `sparse: true` on email allows multiple documents with `email: undefined` while still enforcing uniqueness when email is set.

---

## Configuration Files

### `package.json`

| Script | Command |
|---|---|
| `npm run dev` | `next dev` — development server |
| `npm run build` | `next build` — production build |
| `npm start` | `next start` — production server |
| `npm run cli` | `node cli.js` — CLI tool |

### `next.config.mjs`

URL rewrites for clean refresh endpoints:
- `GET /:userId/refresh` → `GET /api/refresh/:userId`
- `GET /:userId/refresh/:appIndex` → `GET /api/refresh/:userId/:appIndex`

### `jsconfig.json`

Path alias `@/*` maps to the project root, matching Next.js's default `jsconfig.json` convention.

---

## UI Feedback

The web app uses `react-hot-toast` for toast notifications and CSS spinner animations for loading states.

### Toaster (configured in `app/layout.js:9`)

- Position: top-right
- Duration: 4 seconds (6 seconds for "Refresh All" summary)
- Font size: 14px

### Spinner CSS (`app/globals.css:7-9`)

Three classes built on a single `@keyframes spin` animation:

| Class | Size | Border | Use case |
|---|---|---|---|
| `.spinner` | 16×16px | White on transparent | Buttons with white text |
| `.spinner-sm` | 14×14px | Same as `.spinner` | Smaller buttons |
| `.spinner-dark` | 16×16px | Red (`#ff4b4b`) on light | Loading page, dark backgrounds |

### Feedback per Action

| Action | Loading State | Success | Error |
|---|---|---|---|
| Sign In | Spinner + "Signing in..." | Toast "Signed in" | Inline error banner |
| Create Account | Spinner + "Creating..." | Toast "Account created" | Inline error banner |
| Refresh All | Spinner + "Refreshing..." | Toast with summary | Error toast |
| Refresh One | Spinner inside button | `"Name — OK"` toast | `"Name — failed"` toast |
| Add App | Spinner + "Adding..." | Toast "App added" | Error toast |
| Remove App | Spinner inside button | Toast "App removed" | Error toast |
| Logout | (none) | Toast "Signed out" | (none) |

All buttons are disabled (`cursor: not-allowed`, muted background) while loading to prevent double-submission.
