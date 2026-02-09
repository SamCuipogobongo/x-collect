# x-collect

[![npm version](https://img.shields.io/npm/v/x-collect-skill)](https://www.npmjs.com/package/x-collect-skill)
[![license](https://img.shields.io/npm/l/x-collect-skill)](./LICENSE)

English | [中文](./README.zh-CN.md)

X/Twitter topic intelligence skill for Claude Code. Uses Playwright browser automation to search x.com directly, scraping real tweets with engagement metrics.

## What it does

`/x-collect [topic]` opens x.com in Chrome, runs 3 search rounds, and extracts real tweet data:

1. **Top / Viral Posts** — x.com search "Top" tab, most popular tweets
2. **Trending / Recent Posts** — Top tab with `min_faves:50 since:YESTERDAY`, hottest posts from the last 24h
3. **KOL Posts** — filtered by `min_faves:100`, high-engagement accounts only

Optional bonus rounds:

4. **Hook Study** — pure text posts (`-filter:media -filter:links`) with 500+ likes, for studying copy patterns
5. **Conversation Starters** — high-reply posts (`min_replies:30`), to find what drives discussion

Output: JSONL + Markdown in `./x-collect-data/` with real handles, tweet text, likes, retweets, replies, views, and a Content Opportunity Summary.

## Prerequisites

| Dependency | Purpose | Required |
|------------|---------|----------|
| [Claude Code](https://claude.ai/claude-code) | Runtime | Yes |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp) | Browser automation | Yes |
| Logged-in X/Twitter session | Browser must have x.com logged in | Yes |

### Install Playwright MCP

```bash
claude mcp add --scope user playwright -- npx @playwright/mcp@latest
```

## Install

### Option A: Claude Plugin Marketplace (Recommended)

```bash
claude plugin marketplace add SamCuipogobongo/x-collect
claude plugin install x-collect
```

### Option B: npm global install

```bash
npm install -g x-collect-skill
```

### Option C: One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/SamCuipogobongo/x-collect/main/install.sh | bash
```

### Option D: Manual

```bash
git clone https://github.com/SamCuipogobongo/x-collect.git
mkdir -p ~/.claude/skills/x-collect
cp x-collect/SKILL.md ~/.claude/skills/x-collect/
```

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
| `trending_post` | Top tab with `min_faves:50 since:YESTERDAY` |
| `kol_post` | x.com search with `min_faves:100` filter |
| `hook_study` | Pure text posts (`-filter:media -filter:links`) with 500+ likes |
| `conversation_starter` | High-reply posts (`min_replies:30`) |

## How it works

The skill uses Playwright MCP to:
1. Navigate to x.com search pages with Top tab and various filters
2. Wait for tweets to load
3. Extract tweet data via DOM queries or accessibility tree snapshot
4. Deduplicate by tweet URL
5. Output JSONL + Markdown with Content Opportunity Summary

No third-party API needed — reads directly from x.com via Playwright browser automation.

## License

MIT
