# ClaudeClaw Setup State
Last updated: 2026-03-05

## Service
- launchd label: `com.claudeclaw.app`
- Plist: `~/Library/LaunchAgents/com.claudeclaw.app.plist`
- Auto-start: yes (RunAtLoad + KeepAlive)
- Log: `/tmp/claudeclaw.log`

## Features Enabled
- Platform: Telegram (grammy)
- Voice STT: Groq Whisper (GROQ_API_KEY in .env)
- Voice TTS: not enabled
- Memory: full dual-sector decay (SQLite, FTS5)
- Scheduler: yes
- WhatsApp bridge: yes (wa-daemon)
- Rate limit: 8 msg/min, 1 concurrent request per chat

## Bot Commands
- `/start` -- help + command list
- `/stop` -- kill current running task
- `/newchat` -- clear session
- `/forget` -- clear session + memories
- `/memory` -- view recent memories
- `/voice` -- toggle TTS mode
- `/schedule` -- manage cron tasks
- `/wa` -- WhatsApp bridge
- `/chatid` -- show chat ID

## Skills Installed (~/.claude/skills/)
| Skill | Purpose |
|-------|---------|
| career-strategist | Job applications, resume, salary negotiation, AU tech market |
| jobhunter | Sweeps job boards, adds to Notion, sends Telegram report |
| study-master | Uni study management, Notion dashboards, exam prep |
| dsa-tutor | LeetCode/HackerRank coaching, Socratic method |
| report-checker | Final review of uni assignments, APA 7, Australian English |
| internal-comms | Status reports, leadership updates, internal communications |
| skill-creator | Create/improve/optimise skills with evals |
| pdf | Full PDF manipulation |
| docx | Word document creation/editing |
| pptx | PowerPoint creation/editing |
| xlsx | Spreadsheet creation/editing |
| email-cleanup | Clean Outlook inbox (zyad2408@live.com.au) |
| openclaw-telegram | Send Telegram via OpenClaw |
| openclaw-fixer | OpenClaw config/diagnostics |
| openclaw-g-chat-config | OpenClaw Google Chat setup |
| claude-developer-platform | Claude API / Anthropic SDK development |
| simplify | Code quality review |
| keybindings-help | Claude Code keybindings |
| schedule | Create scheduled tasks |
| claudeclaw-admin | This skill -- ClaudeClaw admin + self-evolution |

## Scheduled Tasks

| ID | Schedule | Description |
|----|----------|-------------|
| 47807a90 | Daily 8am | UTS assignment check-in (due today, 1-6 days, 7-14 days, grade check, overdue, not-started high priority) |
| 9becc9fe | Sunday 9am | Memory consolidation (episodic → semantic, delete stale) |
| 715dc1a2 | Sunday 10am | Self-evolution audit (log analysis, gap detection, auto-apply high-confidence improvements) |

## Models
Claude Code CLI uses the logged-in Anthropic account (claude login).
Not using Ollama -- that's OpenClaw's domain.

## Zyad's Telegram Chat ID
`8343303630`

## OpenClaw (separate system, port 18789)
- Models: ollama/kimi-k2.5:cloud (primary), ollama/glm-4.7-flash (fallback)
- Channels: Telegram + Google Chat
- Config: `~/.openclaw/openclaw.json`
- Different from ClaudeClaw -- uses Ollama models, not Claude Code CLI
