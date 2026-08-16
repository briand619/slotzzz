/*
 * Minimal OAuth2 code-for-token exchange endpoint for the Video Poker
 * Trainer's Discord Activity (frontend/video-poker/discord.html).
 *
 * This exists only because Discord's OAuth2 token exchange requires the
 * application's Client Secret, which must never be shipped to the browser —
 * so the Activity gets an authorization `code` client-side, sends it here,
 * and this server exchanges it for an `access_token` server-side and hands
 * that back. Nothing else: no database, no sessions, no per-user storage.
 *
 * Required environment variables (see .env.example):
 *   DISCORD_CLIENT_ID      - same Client ID configured in discord.html
 *   DISCORD_CLIENT_SECRET  - from the Discord Developer Portal, OAuth2 tab
 */
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET in the environment. See .env.example.');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/token', async (req, res) => {
  const code = req.body && req.body.code;
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing "code" in request body' });
    return;
  }

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code
      })
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error('Discord token exchange failed:', tokenRes.status, detail);
      res.status(502).json({ error: 'Token exchange with Discord failed' });
      return;
    }

    const data = await tokenRes.json();
    // Only the access_token is needed client-side to call
    // discordSdk.commands.authenticate(); refresh_token/expires_in etc.
    // are deliberately not forwarded since nothing here persists a session.
    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('Token exchange error:', err);
    res.status(500).json({ error: 'Internal error during token exchange' });
  }
});

app.get('/healthz', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Discord token-exchange server listening on port ' + PORT);
});
