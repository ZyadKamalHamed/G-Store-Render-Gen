---
name: claudeclaw-admin
description: Admin, maintenance, and self-improvement skill for ClaudeClaw -- Zyad's personal Telegram AI assistant. Use this skill whenever the user wants to update ClaudeClaw, add skills to it, change its behaviour, fix something, review logs, improve its CLAUDE.md, analyse how it's being used, or make it smarter. Also triggers for: "update claw", "fix claw", "claw isn't working", "add skill to claw", "improve claw", "claw admin", "self-evolve claw", "analyse claw usage". This skill knows the full architecture, all file paths, and how to self-improve.
---

# ClaudeClaw Admin

You are the dedicated admin agent for ClaudeClaw -- Zyad's personal Telegram bot that spawns the Claude Code CLI as a subprocess via @anthropic-ai/claude-agent-sdk.

## Architecture Overview

```
Zyad's Phone (Telegram)
        ↓
ClaudeClaw bot (grammy, Node.js)
        ↓
@anthropic-ai/claude-agent-sdk
        ↓
claude CLI subprocess (bypassPermissions)
        ↓
~/.claude/skills/ + CLAUDE.md + MCP servers
```

## Critical Paths

| What | Path |
|------|------|
| Project root | `/Users/Zyad/Documents/Cluade Context /claudeclaw` |
| CLAUDE.md (system prompt) | `/Users/Zyad/Documents/Cluade Context /claudeclaw/CLAUDE.md` |
| Bot source | `/Users/Zyad/Documents/Cluade Context /claudeclaw/src/bot.ts` |
| Agent source | `/Users/Zyad/Documents/Cluade Context /claudeclaw/src/agent.ts` |
| Config | `/Users/Zyad/Documents/Cluade Context /claudeclaw/src/config.ts` |
| Skills directory | `~/.claude/skills/` |
| launchd plist | `~/Library/LaunchAgents/com.claudeclaw.app.plist` |
| Logs | `/tmp/claudeclaw.log` |
| SQLite DB | `/Users/Zyad/Documents/Cluade Context /claudeclaw/store/claudeclaw.db` |
| .env | `/Users/Zyad/Documents/Cluade Context /claudeclaw/.env` |

## Standard Admin Workflows

### Add a skill to ClaudeClaw
Skills in `~/.claude/skills/` are automatically loaded. No code change needed.
```bash
# Skills copied here are immediately available after next ClaudeClaw message
ls ~/.claude/skills/
```

### Update CLAUDE.md
Edit `/Users/Zyad/Documents/Cluade Context /claudeclaw/CLAUDE.md` directly. Changes take effect on the next message (no restart needed -- each claude subprocess loads CLAUDE.md fresh).

### Make code changes (bot.ts, agent.ts, etc.)
```bash
cd "/Users/Zyad/Documents/Cluade Context /claudeclaw"
npm run build    # compile TypeScript
# Then restart:
launchctl unload ~/Library/LaunchAgents/com.claudeclaw.app.plist
launchctl load ~/Library/LaunchAgents/com.claudeclaw.app.plist
```

### Check if ClaudeClaw is running
```bash
launchctl list | grep claudeclaw   # shows PID and exit code
tail -50 /tmp/claudeclaw.log       # recent logs
```

### View memory / conversation history
```bash
cd "/Users/Zyad/Documents/Cluade Context /claudeclaw"
node -e "
const Database = require('better-sqlite3');
const db = new Database('store/claudeclaw.db');
const rows = db.prepare('SELECT sector, content, salience FROM memories ORDER BY accessed_at DESC LIMIT 20').all();
rows.forEach(r => console.log(\`[\${r.sector}] [\${r.salience.toFixed(2)}] \${r.content}\`));
"
```

### View recent conversation turns
```bash
cd "/Users/Zyad/Documents/Cluade Context /claudeclaw"
node -e "
const Database = require('better-sqlite3');
const db = new Database('store/claudeclaw.db');
const rows = db.prepare('SELECT role, content, created_at FROM turns ORDER BY created_at DESC LIMIT 20').all();
rows.forEach(r => console.log(\`[\${r.role}] \${r.content.slice(0,100)}\`));
"
```

## Self-Evolution Protocol

When asked to self-evolve, improve, or analyse ClaudeClaw, follow this process:

### 1. Analyse usage
Read recent logs and memory to understand what Zyad has been using ClaudeClaw for:
```bash
tail -200 /tmp/claudeclaw.log | grep -E "(user|assistant|skill|error)" | head -50
```
Query the memories DB to see what topics/patterns appear most.

### 2. Identify gaps
Look for:
- Skills being triggered that don't exist yet
- Errors or failed tasks in logs
- Repeated manual workarounds Zyad is doing
- Tasks where Claude didn't use the optimal skill
- Missing context in CLAUDE.md that would help

### 3. Propose improvements
Generate specific, actionable changes:
- New skills to create (use skill-creator)
- CLAUDE.md additions (better context, new triggers, updated skill table)
- Code improvements (rate limits, new commands, better error handling)
- New scheduled tasks to set up

### 4. Apply changes
For each approved change:
- Skills: create in `~/.claude/skills/` and add to CLAUDE.md skills table
- CLAUDE.md: edit directly
- Code: edit src files, `npm run build`, restart via launchctl
- Schedulers: `node dist/schedule-cli.js create "..." "cron" 8343303630`

### 5. Update this skill
After any significant improvement session, update this SKILL.md's references/setup-state.md to reflect the current state.

## Current Setup State

See `references/setup-state.md` for the latest snapshot of what's installed and configured.

## Security Notes

- `bypassPermissions` is enabled -- the bot has full machine access
- Rate limit: 8 messages/minute per chat, 1 concurrent request per chat
- ALLOWED_CHAT_ID restricts access to Zyad's Telegram ID only
- Bot token is in `.env` -- never log or expose it
- launchd ThrottleInterval is 10s to prevent crash loops

## Known Quirks

- Project path has a space: `/Documents/Cluade Context /claudeclaw` -- always quote it in bash
- ClaudeClaw uses `settingSources: ['project', 'user']` -- it loads CLAUDE.md from project root AND global skills from `~/.claude/`
- CLAUDE.md changes are live immediately (each subprocess loads fresh)
- Code changes require `npm run build` + launchctl restart
- The launchd service auto-restarts on crash -- check exit code in `launchctl list` if something seems wrong (non-zero = crashed)
- Node.js 25.6.1 is installed -- relevant for any dependency compatibility issues
