---
name: openclaw-g-chat-config
description: Configure, troubleshoot, or repair OpenClaw Google Chat integration. Covers the full setup from Google Cloud project to working bot, including all known bugs and fixes for this specific machine.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# OpenClaw Google Chat Config

Complete setup and troubleshooting guide for OpenClaw's Google Chat integration on Zyad's machine.

## Current Working State

- **Google Cloud project:** `studied-stock-489123-g5`
- **Project number:** `980166527792`
- **Service account:** `openclaw-bot@studied-stock-489123-g5.iam.gserviceaccount.com`
- **Service account key file:** `/Users/Zyad/Documents/Cluade Context /studied-stock-489123-g5-fbf4c6d286c5.json`
- **Tailscale account:** Personal (`zyadschneider24@gmail.com`), tailnet `tail70b7c5.ts.net`
- **Public webhook URL:** `https://zyad-hamed.tail70b7c5.ts.net/googlechat`
- **Audience type:** `app-url`
- **Audience value:** `https://zyad-hamed.tail70b7c5.ts.net/googlechat`
- **Webhook path in OpenClaw:** `/googlechat`
- **Zyad's Google Chat user ID:** `users/118203039347381201381`

## OpenClaw Config (`~/.openclaw/openclaw.json`)

The `channels.googlechat` section must look like this:

```json
"googlechat": {
  "enabled": true,
  "groupPolicy": "allowlist",
  "serviceAccountFile": "/Users/Zyad/Documents/Cluade Context /studied-stock-489123-g5-fbf4c6d286c5.json",
  "audienceType": "app-url",
  "audience": "https://zyad-hamed.tail70b7c5.ts.net/googlechat",
  "webhookPath": "/googlechat",
  "streamMode": "replace"
}
```

The `gateway` section must include the `controlUi.basePath` fix:

```json
"gateway": {
  "port": 18789,
  "mode": "local",
  "bind": "loopback",
  "auth": {
    "mode": "token",
    "token": "bc64316af59d9f6f8b77af4459a4c6fbee8d0bc76e93fd7e9afd7867ba4c0a68"
  },
  "tailscale": {
    "mode": "off",
    "resetOnExit": false
  },
  "controlUi": {
    "basePath": "/ui"
  }
}
```

Note: After setting `controlUi.basePath: "/ui"`, the OpenClaw dashboard is at `http://127.0.0.1:18789/ui` instead of `http://127.0.0.1:18789/`.

The `plugins.allow` array must include `"googlechat"`:

```json
"plugins": {
  "allow": ["openclaw-web-search", "telegram", "googlechat"],
  ...
}
```

---

## Tailscale Funnel Setup

The Funnel exposes the local gateway to the public internet so Google Chat can reach it.

```bash
# Check current account (must be personal: zyadschneider24@gmail.com)
tailscale status

# Check if Funnel is running
tailscale funnel status

# If not running, start it:
tailscale funnel --bg --https=443 /googlechat http://127.0.0.1:18789/googlechat

# Verify DNS resolves (use +noedns flag -- plain nslookup fails on this network)
dig +noedns zyad-hamed.tail70b7c5.ts.net A @8.8.8.8

# Provision TLS cert if not done yet
tailscale cert zyad-hamed.tail70b7c5.ts.net

# Test endpoint is reachable
curl -sI https://zyad-hamed.tail70b7c5.ts.net/googlechat
```

**Tailscale ACL requirement:** The personal Tailscale account already has the Funnel ACL policy in place:
```json
"nodeAttrs": [
  { "target": ["autogroup:member"], "attr": ["funnel"] }
]
```

---

## Google Cloud Console Setup

These steps are already done. If rebuilding from scratch:

1. Go to [Google Cloud Console](https://console.cloud.google.com) logged in as `zyad.hamed@thegstore.com.au`
2. Project `studied-stock-489123-g5` already exists -- use it
3. Enable the **Google Chat API** under APIs & Services
4. Go to **Google Chat API > Configuration**:
   - Connection settings: **HTTP endpoint URL** = `https://zyad-hamed.tail70b7c5.ts.net/googlechat`
   - App status: Active
5. The service account key file is already at `/Users/Zyad/Documents/Cluade Context /studied-stock-489123-g5-fbf4c6d286c5.json`

If the webhook URL ever changes (e.g., Tailscale Funnel URL changes), update it in Google Cloud Console under **APIs & Services > Google Chat API > Configuration > HTTP Endpoint URL**.

---

## First-Time User Pairing

When a user first messages the bot, OpenClaw returns a pairing code. Approve it:

```bash
openclaw pairing approve googlechat <PAIRING_CODE>
```

Zyad's Google Chat user ID is `users/118203039347381201381` -- already approved, won't need this again unless sessions are cleared.

---

## Known Bugs Fixed (Node.js 25 + OpenClaw 2026.3.x)

### Bug 1: gaxios node-fetch ESM incompatibility

**Symptom:** `openclaw doctor` shows `Google Chat: failed (unknown) - Cannot convert undefined or null to object`

**Root cause:** gaxios 7.1.3 tries `await import('node-fetch')` from CJS context -- fails on Node.js 25 which has native `globalThis.fetch`.

**Fix:** Patch `/opt/homebrew/lib/node_modules/openclaw/node_modules/gaxios/build/cjs/src/gaxios.js`

Find:
```javascript
static async #getFetch() {
    const hasWindow = typeof window !== 'undefined' && !!window;
    this.#fetch ||= hasWindow
        ? window.fetch
        : (await import('node-fetch')).default;
    return this.#fetch;
}
```

Replace with:
```javascript
static async #getFetch() {
    const hasWindow = typeof window !== 'undefined' && !!window;
    this.#fetch ||= hasWindow
        ? window.fetch
        : (typeof globalThis.fetch !== 'undefined' ? globalThis.fetch : (await import('node-fetch')).default);
    return this.#fetch;
}
```

**Verify fix works:**
```bash
node -e "
const { GoogleAuth } = require('/opt/homebrew/lib/node_modules/openclaw/node_modules/google-auth-library');
const auth = new GoogleAuth({ keyFile: '/Users/Zyad/Documents/Cluade Context /studied-stock-489123-g5-fbf4c6d286c5.json', scopes: ['https://www.googleapis.com/auth/chat.bot'] });
auth.getClient().then(c => c.getAccessToken()).then(t => { const tok = typeof t === 'string' ? t : t?.token; console.log('Token OK:', tok ? tok.slice(0,20)+'...' : 'null'); }).catch(e => console.error('FAIL:', e.message));
"
```

**Warning:** This patch is overwritten on `openclaw update`. Re-apply after any OpenClaw update.

---

### Bug 2: Control UI intercepts all POST requests (returns 405)

**Symptom:** `curl -X POST http://127.0.0.1:18789/googlechat` returns `405 Method Not Allowed`. Google Chat sends messages but bot never responds.

**Root cause:** `handleControlUiHttpRequest` in the gateway checks the HTTP method BEFORE checking the path, so it returns 405 for ALL non-GET requests (including webhook POSTs) before the plugin handler ever runs.

**Fix -- two parts:**

Part A: Set `gateway.controlUi.basePath: "/ui"` in `~/.openclaw/openclaw.json` (so the Control UI path check can be applied before the method check).

Part B: Patch both gateway-cli files to move the method check inside the path check:

Files to patch:
- `/opt/homebrew/lib/node_modules/openclaw/dist/gateway-cli-C7FS-lL-.js`
- `/opt/homebrew/lib/node_modules/openclaw/dist/gateway-cli-tzSO700C.js`

In each file, find `function handleControlUiHttpRequest(req, res, opts)` and replace the block that checks method before URL parsing with a version that parses the URL and checks the path first, then checks the method only for paths that match the Control UI base path.

The patched version:
```javascript
function handleControlUiHttpRequest(req, res, opts) {
    const urlRaw = req.url;
    if (!urlRaw) return false;
    const url = new URL(urlRaw, "http://localhost");
    const basePath = normalizeControlUiBasePath(opts?.basePath);
    const pathname = url.pathname;
    if (!basePath) {
        if (pathname === "/ui" || pathname.startsWith("/ui/")) {
            if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end("Method Not Allowed"); return true; }
            applyControlUiSecurityHeaders(res);
            respondNotFound(res);
            return true;
        }
        if (pathname === "/plugins" || pathname.startsWith("/plugins/")) return false;
        if (pathname === "/api" || pathname.startsWith("/api/")) return false;
    }
    if (basePath) {
        if (pathname === basePath) {
            if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end("Method Not Allowed"); return true; }
            applyControlUiSecurityHeaders(res);
            res.statusCode = 302;
            res.setHeader("Location", `${basePath}/${url.search}`);
            res.end();
            return true;
        }
        if (!pathname.startsWith(`${basePath}/`)) return false;
        if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end("Method Not Allowed"); return true; }
    }
    // ... rest of function unchanged
```

**Warning:** This patch is overwritten on `openclaw update`. Re-apply after any OpenClaw update.

---

## Full Restart Procedure

```bash
openclaw gateway restart
sleep 5
openclaw channels status --probe
```

Expected output:
```
- Telegram default: ... works
- Google Chat default: enabled, configured, running, dm:pairing, works
```

## Post-Update Checklist

After any `openclaw update` or `npm update -g openclaw`, re-apply both patches:
1. gaxios `#getFetch` patch
2. `handleControlUiHttpRequest` path-before-method patch in both gateway-cli files

Then reinstall and restart:
```bash
openclaw gateway install --force
openclaw gateway restart
```
