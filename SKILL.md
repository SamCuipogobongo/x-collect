---
name: x-collect
description: |
  X/Twitter topic intelligence tool. Uses Playwright browser automation to search
  x.com directly, scraping real tweets, engagement metrics, and KOL accounts.
  Outputs a structured intel report (JSONL + Markdown) with content opportunity analysis.
  Use when the user wants to research a topic on X/Twitter, find what's performing,
  or scout trending discussions before creating content.
  Triggers on: /x-collect, requests to research X/Twitter trends for a topic.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_take_screenshot
  - mcp__playwright__browser_run_code
  - mcp__playwright__browser_click
  - mcp__playwright__browser_type
  - mcp__playwright__browser_wait_for
  - mcp__playwright__browser_press_key
  - mcp__playwright__browser_tabs
---

# X Topic Intelligence

Research what's trending and performing on X/Twitter for any topic. Browse x.com directly via Playwright browser automation to find real tweets, engagement data, and KOL accounts.

---

## Usage

```
/x-collect [topic]        # direct mode
/x-collect                # interactive mode - asks for topic
```

When no topic is provided, use `AskUserQuestion`:
"What topic do you want to research on X/Twitter? (e.g., 'AI agents', 'vibe coding', 'indie hacking')"

---

## Prerequisites

| Dependency | Purpose | Required |
|------------|---------|----------|
| Claude Code | Runtime | Yes |
| Playwright MCP | Browser automation (`npx @playwright/mcp@latest`) | Yes |
| Logged-in X/Twitter session | Browser must have an active x.com session | Yes |

---

## Browser Automation Flow

Use Playwright MCP tools to navigate x.com, perform searches, and extract tweet data.

### General Steps (repeat for each search round)

1. **Navigate** — `browser_navigate` to the x.com search URL
2. **Wait** — `browser_wait_for` until tweets appear (wait for text like "Like" or a few seconds)
3. **Extract** — `browser_run_code` to run Playwright JS that scrapes tweet data from the DOM
4. **Scroll + Extract more** — if fewer than 10 tweets, scroll down and extract again

### Tweet Extraction Script

Use `browser_run_code` with this Playwright script to extract tweets:

```javascript
async (page) => {
  const extractTweets = () => {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    return Array.from(tweets).slice(0, 20).map(t => {
      // Handle
      const nameEl = t.querySelector('[data-testid="User-Name"]');
      const handleLink = nameEl?.querySelector('a[href^="/"][tabindex="-1"]');
      const handle = handleLink?.getAttribute('href')?.replace('/', '') || null;
      const displayName = nameEl?.querySelector('a span')?.innerText || null;

      // Text
      const text = t.querySelector('[data-testid="tweetText"]')?.innerText || '';

      // Timestamp & link
      const timeEl = t.querySelector('time');
      const time = timeEl?.getAttribute('datetime') || null;
      const tweetLink = timeEl?.closest('a')?.getAttribute('href') || null;

      // Engagement: reply, retweet, like counts + views
      const replyCount = t.querySelector('[data-testid="reply"] span')?.innerText || '0';
      const retweetCount = t.querySelector('[data-testid="retweet"] span')?.innerText || '0';
      const likeCount = t.querySelector('[data-testid="like"] span')?.innerText || '0';
      // Views are in an aria-label on the analytics link
      const viewsEl = t.querySelector('a[href*="/analytics"]');
      const viewsLabel = viewsEl?.getAttribute('aria-label') || '';
      const viewsMatch = viewsLabel.match(/([\d,.]+[KMB]?)\s*view/i);
      const views = viewsMatch ? viewsMatch[1] : '0';

      return {
        handle: handle ? '@' + handle : null,
        display_name: displayName,
        text: text.substring(0, 200),
        posted_at: time,
        url: tweetLink ? 'https://x.com' + tweetLink : null,
        replies: replyCount,
        retweets: retweetCount,
        likes: likeCount,
        views: views
      };
    }).filter(t => t.text && t.handle);
  };

  // 1. Extract BEFORE scrolling (captures high-engagement first-screen tweets)
  const initial = await page.evaluate(extractTweets);

  // 2. Scroll down in steps to load more
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(1500);
  }

  // 3. Extract again after scrolling
  const afterScroll = await page.evaluate(extractTweets);

  // 4. Deduplicate by URL
  const seen = new Set();
  const all = [];
  for (const t of [...initial, ...afterScroll]) {
    if (t.url && !seen.has(t.url)) {
      seen.add(t.url);
      all.push(t);
    }
  }
  return all;
}
```

> **Note**: X's DOM structure may change. If the selectors break, use `browser_snapshot` to read the accessibility tree and extract data manually, or use `browser_take_screenshot` to visually inspect the page and adjust selectors.

---

## Search Operators Quick Reference

Use these operators in the search URL `q=` parameter (URL-encoded). Combine freely.

### Noise Filters (always recommended)

| Operator | Effect |
|----------|--------|
| `-filter:replies` | Exclude replies — show only original posts |
| `-filter:nativeretweets` | Exclude retweets — show only original content |
| `lang:en` | Limit to English (use `lang:zh` for Chinese, etc.) |

### Engagement Thresholds

| Operator | Effect |
|----------|--------|
| `min_faves:N` | Minimum N likes |
| `min_retweets:N` | Minimum N reposts |
| `min_replies:N` | Minimum N replies |

### Content Format Filters

| Operator | Effect |
|----------|--------|
| `-filter:media -filter:links` | Pure text only (best for hook/copy study) |
| `filter:images` | Posts with images |
| `filter:videos` | Posts with video |
| `-filter:links` | Exclude posts with outbound links |
| `filter:blue_verified` | Only X Premium (blue checkmark) accounts |

### Time Filters

| Operator | Effect |
|----------|--------|
| `within_time:24h` | Last 24 hours only |
| `within_time:7d` | Last 7 days |
| `since:YYYY-MM-DD` | After specific date |
| `until:YYYY-MM-DD` | Before specific date |

### Other Useful Operators

| Operator | Effect |
|----------|--------|
| `?` | Posts containing a question |
| `from:username` | Posts from a specific account |
| `to:username` | Replies to a specific account |
| `"exact phrase"` | Exact phrase match |
| `(A OR B)` | Either term (OR must be uppercase) |
| `-keyword` | Exclude posts containing keyword |
| `conversation_id:ID` | All posts in a thread (use tweet ID) |

---

## Intelligence Gathering Rounds

Run 3 core rounds + optional bonus rounds. All queries include `-filter:replies -filter:nativeretweets` by default to eliminate noise and surface only original content.

### Core Rounds

#### Round 1: Top / Viral Posts

**Query**: `[topic] -filter:replies -filter:nativeretweets lang:en`
**URL**: `https://x.com/search?q=[URL-encoded query]&src=typed_query&f=top`

X's "Top" tab — algorithmically ranked popular tweets. Extract 10-15 tweets.

**Focus**: Who posted, what angle, engagement numbers, the hook (first 1-2 sentences).

#### Round 2: Trending Posts (Last 24h)

**Query**: `[topic] -filter:replies -filter:nativeretweets min_faves:50 since:[YESTERDAY] lang:en`
**URL**: `https://x.com/search?q=[URL-encoded query]&src=typed_query&f=top`

The hottest posts from the last 24 hours. Use `since:YYYY-MM-DD` (yesterday's date) combined with `min_faves:50` and the Top tab sort — this returns only posts with proven engagement, ranked by X's algorithm. Extract 10-15 tweets.

**Focus**: Fresh angles, emerging debates, which posts are accelerating right now.

> Adjust `min_faves:` threshold: use `min_faves:10` for niche topics, `min_faves:50` for mainstream. Do NOT use the "Latest" tab for this round — it returns zero-engagement noise.

#### Round 3: KOL / Verified High-Engagement Posts

**Query**: `[topic] filter:blue_verified min_faves:100 -filter:replies -filter:nativeretweets lang:en`
**URL**: `https://x.com/search?q=[URL-encoded query]&src=typed_query&f=top`

Only X Premium (blue checkmark) accounts with 100+ likes. Premium accounts get 10x more reach, so their content patterns are the most worth studying.

**Focus**: Who the KOLs are, what positions they hold, their framing style.

> Adjust threshold: `min_faves:50` for niche topics, `min_faves:500` for mainstream. If `filter:blue_verified` returns too few results, drop it and keep only `min_faves:`.

### Bonus Rounds (Optional — pick based on goal)

#### Round 4: Hook Study — Pure Text Viral Posts

**Query**: `[topic] -filter:media -filter:links -filter:replies -filter:nativeretweets min_faves:500 lang:en`
**URL**: `https://x.com/search?q=[URL-encoded query]&src=typed_query&f=top`

Pure text posts with 500+ likes — no images, no videos, no links. These succeed entirely on copy quality. Text posts have the highest average engagement rate (3.24%) on X.

**Focus**: Hook patterns (first line), sentence structure, use of numbers, storytelling format. Extract 10 tweets.

**When to use**: Before writing content, to study what copy patterns perform best for this topic.

#### Round 5: Conversation Starters — High-Reply Posts

**Query**: `[topic] min_replies:30 -filter:replies -filter:nativeretweets lang:en`
**URL**: `https://x.com/search?q=[URL-encoded query]&src=typed_query&f=top`

Posts that generated the most replies. In X's algorithm, a reply that gets an author reply back is weighted **75x** a like — making conversation-driving posts the highest-signal content.

**Focus**: What questions or takes drive discussion, common debate points, audience pain points. Extract 10 tweets.

**When to use**: To understand what the audience cares about and what angles spark debate.

---

## Data Extraction

For each tweet, extract and then analyze to determine:

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | `https://x.com/[user]/status/[id]` (unique key) |
| `text` | string | First 200 chars of tweet text |
| `intel_type` | enum | `viral_post` \| `trending_post` \| `kol_post` \| `hook_study` \| `conversation_starter` |
| `topic` | string | The search topic |
| `account` | string | `@handle` |
| `display_name` | string | Display name |
| `angle` | string | 1-sentence summary of the angle/framing (your analysis) |
| `format` | string | `thread` \| `single` \| `quote_tweet` \| `poll` |
| `likes` | number | Like count |
| `retweets` | number | Retweet count |
| `replies` | number | Reply count |
| `views` | string | View count (may include K/M suffix) |
| `posted_at` | string | ISO timestamp |
| `key_takeaway` | string | Why this is noteworthy for content creation (your analysis) |
| `collected` | string | Today's date (YYYY-MM-DD) |

---

## Output

All output goes to `./x-collect-data/` in the current working directory (created on first run).

### JSONL — `./x-collect-data/intel.jsonl`

One JSON object per line:

```json
{"url":"https://x.com/bcherny/status/123","text":"I'm Boris and I created Claude Code...","intel_type":"viral_post","topic":"Claude Code","account":"@bcherny","display_name":"Boris Cherny","angle":"Creator shares vanilla setup with 15+ parallel sessions","format":"thread","likes":5800,"retweets":1200,"replies":340,"views":"6.5M","posted_at":"2026-01-15T10:30:00Z","key_takeaway":"Behind-the-scenes from creator + actionable tips = mega engagement","collected":"2026-02-08"}
```

**Dedup:** Before appending, read existing JSONL and build a set of existing URLs. Skip duplicates.

### Markdown — `./x-collect-data/intel.md`

Re-render after each run. Group by `intel_type`, sort by likes descending.

Count each group's entries carefully — header count must exactly match row count.

```markdown
# X Intelligence: [topic]

> Last updated: YYYY-MM-DD | Total: N tweets

## Top / Viral Posts (N)

| Account | Text (truncated) | Likes | RTs | Replies | Views | Format |
|---------|-----------------|-------|-----|---------|-------|--------|
| [@user](tweet_url) | First 80 chars... | 5.8K | 1.2K | 340 | 6.5M | thread |

## Trending Posts — 24h (N)

| Account | Text (truncated) | Likes | RTs | Replies | Views | Format |
|---------|-----------------|-------|-----|---------|-------|--------|
| [@user](tweet_url) | ... | ... | ... | ... | ... | ... |

## KOL / Verified Posts (N)

| Account | Text (truncated) | Likes | RTs | Replies | Views | Format |
|---------|-----------------|-------|-----|---------|-------|--------|
| [@user](tweet_url) | ... | ... | ... | ... | ... | ... |

## Hook Study — Pure Text (N) *(if collected)*

| Account | Text (truncated) | Likes | RTs | Replies | Views |
|---------|-----------------|-------|-----|---------|-------|
| [@user](tweet_url) | First 120 chars... | ... | ... | ... | ... |

## Conversation Starters (N) *(if collected)*

| Account | Text (truncated) | Likes | RTs | Replies | Views |
|---------|-----------------|-------|-----|---------|-------|
| [@user](tweet_url) | ... | ... | ... | ... | ... |

---

## Content Opportunity Summary

Based on the N tweets above:

1. **Hot angles**: [2-3 angles getting the most likes/RTs — cite top posts as: @handle — "first 60 chars of tweet text" ([link](tweet_url))]
2. **Content gaps**: [angles with engagement but few posts — underserved demand — cite examples as: @handle — "first 60 chars" ([link](tweet_url))]
3. **Recommended format**: [thread / single / hot-take based on what's performing — cite top-performing examples as: @handle — "first 60 chars" ([link](tweet_url))]
4. **Top KOLs**: [5 accounts with the most engagement — each as: @handle — "first 60 chars" ([link](tweet_url)) (likes)]
5. **Hook patterns**: [common first-line patterns — cite examples as: @handle — "first 60 chars" ([link](tweet_url))]
6. **Conversation drivers**: [questions/takes that generate the most replies — cite as: @handle — "first 60 chars" ([link](tweet_url))]
7. **Avoid**: [overdone angles with declining engagement]

> **Rule**: Every reference to a specific tweet MUST use the three-part format: `@handle — "tweet text excerpt" ([link](tweet_url))` — showing the username, the reference post content, and a clickable link separately.
```

---

## Output Message

After collection, display:

```
X Intelligence for "[topic]" — [N] tweets collected:
  Top / viral:          X
  Trending (24h):       Y
  KOL / verified:       Z
  Hook study:           A  (if collected)
  Conversation starters: B  (if collected)

Top post: [@handle] — [first 60 chars of text] (likes: N)

Data saved to:
  ./x-collect-data/intel.jsonl
  ./x-collect-data/intel.md
```
