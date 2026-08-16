# Video Poker Trainer — Discord Activity

Runs the same trainer from `frontend/video-poker/` as a [Discord
Activity](https://discord.com/developers/docs/activities/overview) — an app
embedded directly in a voice channel — with the player's real Discord name
and avatar shown in the corner.

Two pieces are involved:

1. **`frontend/video-poker/discord.html`** — the Activity's client-side
   entry point. It's a sibling of `index.html` (the standalone PWA) and
   reuses the same `js/engine.js`, `js/trainer.js`, and `css/gameking.css`
   unchanged; nothing about the core trainer had to change for this. It adds
   the Discord SDK handshake, the OAuth2 login flow, and a small name/avatar
   badge.
2. **`discord-activity/server/`** (this directory) — a minimal backend with
   exactly one job: exchange the OAuth2 authorization code for an access
   token. This step needs your application's Client *Secret*, which can
   never be shipped to the browser, so it has to happen server-side. It has
   no database and stores nothing.

## Why a second server at all?

Discord's Activity OAuth flow is: the client gets a short-lived
authorization `code`, then that code has to be exchanged for an
`access_token` by calling Discord's token endpoint with your Client ID
*and* Client Secret. Put the secret in client-side JS and it's exposed to
everyone who opens dev tools — so that one exchange has to happen
somewhere with the secret held privately. `discord-activity/server/` is
that "somewhere," kept as small as possible on purpose.

## Setup

### 1. Discord Developer Portal

Create (or open) your application at
[discord.com/developers/applications](https://discord.com/developers/applications):

- **Activities**: enable Activities for the app, and set its entry point
  URL(s) / **URL Mappings**. You'll want at least:
  - root prefix (`/`) → wherever `frontend/video-poker/discord.html` is
    hosted (the same GitHub Pages site the PWA uses works fine)
  - a second prefix (e.g. `/api`) → wherever `discord-activity/server/` is
    deployed, so the client's `fetch('/api/token', ...)` call stays
    same-origin from the Activity iframe's point of view and never has to
    deal with CORS
- **OAuth2**: note the **Client ID** (public) and **Client Secret**
  (private, needed by the server only).

This part — URL Mappings, CSP, redirect URIs — is the piece you said you'd
own, so it's not detailed further here.

### 2. Deploy the token server

Any Node 18+ host works (Render, Railway, Fly.io, a VPS, etc.) — it's a
plain Express app with no persistence, so nothing platform-specific is
required.

```bash
cd discord-activity/server
npm install
cp .env.example .env   # fill in DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET
npm start
```

Set the same two variables (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`)
as real environment variables on whatever host you deploy to — don't ship
the `.env` file itself.

`GET /healthz` returns `ok` once it's up, for whatever health check your
host wants.

### 3. Point the client at your app

Open `frontend/video-poker/discord.html` and replace the placeholder:

```js
const CLIENT_ID = 'YOUR_DISCORD_CLIENT_ID';
```

with your application's real Client ID (this one is public — it's the
*secret* that must stay server-side only).

If you didn't map the token server to `/api` specifically, also update:

```js
const TOKEN_ENDPOINT = '/api/token';
```

to wherever it actually resolves.

### 4. Test it

Activities can only really be tested from inside Discord itself (opening
`discord.html` directly in a normal browser tab will show a "still waiting
on Discord" message after a few seconds — expected, since there's no
Discord parent frame to hand it a session). Use Discord's own [Activity
testing flow](https://discord.com/developers/docs/activities/development-guides/testing-and-debugging)
— typically launching it from a voice channel in a test server with
Developer Mode on.

## What this does and doesn't do

- Shows the player's real Discord `global_name` (or `username`) and avatar
  once authenticated.
- Everything else — dealing, holds, EV analysis, credits, game selection —
  is exactly the same trainer as the standalone site, unmodified. Each
  participant gets their own independent local session; nothing about a
  hand or a player's credits is shared or synced between participants in
  the same Activity.
- No stats persist anywhere between sessions (same as the standalone PWA —
  everything lives in memory for that page load). Wiring the authenticated
  Discord ID up to persistent per-user stats would need a real database and
  is a natural next step, but wasn't built here to keep this change scoped
  to "get the Activity authenticated and running."

## Files

```
discord-activity/
├── README.md          this file
└── server/
    ├── server.js       the token-exchange endpoint (POST /api/token)
    ├── package.json
    └── .env.example    documents the two required env vars

frontend/video-poker/
└── discord.html         Activity entry point (sibling of index.html)
```
