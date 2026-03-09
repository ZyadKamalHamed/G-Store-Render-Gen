# Vibe Starter — Claude Code Project

This is Zyad's template project for bootstrapping new apps with Claude Code.

---

## Who You're Working With

- **Name:** Zyad, 26, Sydney, Australia
- **Role:** AI Specialist at The General Store (design/advertising agency)
- **Stack:** Python, JavaScript/TypeScript, web apps, automation, ML/AI tools
- **Goal for this session:** Build something real, fast, and clean.

---

## Communication Style

- No em dashes in any output or code comments
- No excessive bullet points — prefer prose or well-structured sections
- Short, direct responses. Lead with the action, not the reasoning.
- No filler, no preamble. Get to it.
- Warm but direct.

---

## Code Quality Principles

- Avoid over-engineering. Build the minimum needed for the current task.
- Don't add error handling, fallbacks, or validation for scenarios that can't happen.
- Don't create helpers or abstractions for one-off operations.
- Don't add docstrings, comments, or type annotations to code that wasn't changed.
- Prefer editing existing files over creating new ones.
- Don't add features beyond what's explicitly asked for.
- Prioritise security: no command injection, XSS, SQL injection, or OWASP top 10 issues.
- No backwards-compatibility hacks. If something is unused, delete it.

---

## Preferred Tech Choices (defaults unless told otherwise)

| Layer | Default |
|---|---|
| Language | Python (scripts/ML/automation) or TypeScript (web apps) |
| Frontend | React + Vite or plain HTML/CSS/JS for simple tools |
| Backend | FastAPI (Python) or Express (Node) |
| Styling | Tailwind CSS |
| DB | SQLite for local tools, Postgres for production |
| Package manager | pip (Python) / npm (JS) |
| Testing | pytest (Python) / Vitest (TS) |
| AI APIs | Claude (Anthropic SDK) — use `claude-sonnet-4-6` as default model |

---

## Available Skills

These skills are installed and ready to trigger automatically. Reference this list when you're not sure what tools are available.

| Skill | Triggers when... |
|---|---|
| `skill-creator` | Creating or improving a Claude skill |
| `schedule` | Setting up a scheduled or recurring task |
| `claude-api` | Building with the Anthropic SDK / Claude API |
| `dsa-tutor` | LeetCode/algorithm problems, Big O, data structures |
| `study-master` | University assignments, Notion dashboards, exam prep |
| `report-checker` | Reviewing a finished uni report before submission |
| `docx` | Creating or editing Word documents |
| `pdf` | Reading, creating, merging, or extracting from PDFs |
| `pptx` | Creating or editing PowerPoint presentations |
| `xlsx` | Creating or editing spreadsheets |
| `internal-comms` | Writing status reports, newsletters, leadership updates |
| `career-strategist` | Job applications, resume tailoring, salary negotiation |
| `jobhunter` | Sweeping job boards for grad/entry-level tech roles |
| `job-application-creator` | Filling out job applications automatically |
| `openclaw-telegram` | Sending Zyad a Telegram message via OpenClaw |
| `openclaw-fixer` | Fixing or configuring OpenClaw |
| `openclaw-g-chat-config` | Configuring OpenClaw Google Chat integration |
| `claudeclaw-admin` | Updating or improving ClaudeClaw (Telegram AI assistant) |
| `email-cleanup` | Cleaning up Outlook inbox |
| `simplify` | Reviewing changed code for quality and simplifying it |
| `loop` | Running a prompt on a recurring interval |

---

## OpenClaw / Notifications

Send Telegram notifications during long tasks:
```bash
openclaw message send --channel telegram --target 8343303630 --message "Your message here"
```

Or just use the `/openclaw-telegram` skill.

---

## Starting a New App — Checklist

When Zyad says "let's build X", do this before writing any code:

1. Confirm the goal in one sentence
2. Ask about any constraints (tech stack, time, deployment target)
3. Propose a minimal file structure
4. Get the green light, then build

Don't scaffold 10 files speculatively. Start lean.

---

## Claude API — Quick Reference

Default model: `claude-sonnet-4-6`

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello"}
    ]
)
print(message.content[0].text)
```

For streaming:
```python
with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

---

## Notes

- Skills live at `~/.claude/skills/` and are loaded globally — no need to copy them here.
- To create a new skill from this project, just ask and the `skill-creator` skill will trigger.
- When you're done building, duplicate this folder and start fresh for the next app.
