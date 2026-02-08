# x-collect

X/Twitter topic intelligence tool for Claude Code. Uses browser automation to search x.com directly, scraping real tweets with engagement metrics.

## What it does

`/x-collect [topic]` opens x.com in Chrome, runs 3 search rounds, and extracts real tweet data:

1. **Top / Viral Posts** — x.com search "Top" tab, most popular tweets
2. **Trending / Recent Posts** — x.com search "Latest" tab, real-time discussion
3. **KOL Posts** — filtered by `min_faves:100`, high-engagement accounts only

Output: JSONL + Markdown in `./x-collect-data/` with real handles, tweet text, likes, retweets, replies, views, and a Content Opportunity Summary.

## Install

### Option A: One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/anthropics/x-collect-skill/main/install.sh | bash
```

### Option B: Manual

```bash
git clone https://github.com/anthropics/x-collect-skill.git
mkdir -p ~/.claude/skills/x-collect
cp x-collect-skill/SKILL.md ~/.claude/skills/x-collect/
```

### Option C: Copy SKILL.md directly

Download `SKILL.md` and place it at `~/.claude/skills/x-collect/SKILL.md`.

## Prerequisites

| Dependency | Purpose | Required |
|------------|---------|----------|
| [Claude Code](https://claude.ai/claude-code) | Runtime | Yes |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp) | Browser automation (`npx @playwright/mcp@latest`) | Yes |
| Logged-in X/Twitter session | Browser must have x.com logged in | Yes |

## Usage

```bash
# In Claude Code (with Chrome open and x.com logged in):
/x-collect Claude Code       # research "Claude Code" on X
/x-collect vibe coding       # research "vibe coding" on X
/x-collect                    # interactive mode (asks for topic)
```

## Output

Data saved to `./x-collect-data/`:

| File | Description |
|------|-------------|
| `intel.jsonl` | One JSON object per tweet, deduped by URL |
| `intel.md` | Formatted report with engagement data + Content Opportunity Summary |

### JSONL Schema

```json
{
  "url": "https://x.com/bcherny/status/123",
  "text": "I'm Boris and I created Claude Code...",
  "intel_type": "viral_post",
  "topic": "Claude Code",
  "account": "@bcherny",
  "display_name": "Boris Cherny",
  "angle": "Creator shares vanilla setup with 15+ parallel sessions",
  "format": "thread",
  "likes": 5800,
  "retweets": 1200,
  "replies": 340,
  "views": 6500000,
  "posted_at": "2026-01-15T10:30:00Z",
  "key_takeaway": "Behind-the-scenes from creator + actionable tips = mega engagement",
  "collected": "2026-02-08"
}
```

### Intel Types

| Type | Source |
|------|--------|
| `viral_post` | x.com search "Top" tab |
| `trending_post` | x.com search "Latest" tab |
| `kol_post` | x.com search with `min_faves:100` filter |

## How it works

The skill uses Playwright MCP to:
1. Navigate to x.com search pages (Top, Latest, min_faves filter)
2. Wait for tweets to load
3. Extract tweet data via DOM queries or accessibility tree snapshot
4. Deduplicate by tweet URL
5. Output JSONL + Markdown with Content Opportunity Summary

No third-party API needed — reads directly from x.com via Playwright browser automation.

### Install Playwright MCP

```bash
claude mcp add --scope user playwright -- npx @playwright/mcp@latest
```

## License

MIT
