---
name: x-collect
description: |
  X/Twitter topic intelligence tool. Two search modes: Grok (quick AI-powered search)
  and Actionbook DOM scraping (detailed multi-round collection with search operators).
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
---

# X Topic Intelligence

Research what's trending and performing on X/Twitter for any topic. Two search backends available — pick based on the task complexity.

---

## Usage

```
/x-collect [topic]        # auto-select mode based on topic complexity
/x-collect                # interactive mode - asks for topic
```

When no topic is provided, use `AskUserQuestion`:
"What topic do you want to research on X/Twitter? (e.g., 'AI agents', 'vibe coding', 'indie hacking')"

---

## Search Mode Selection

| | Grok Mode (quick) | Actionbook Scrape Mode (full) |
|---|---|---|
| **Speed** | ~60s single query | ~5-10 min multi-round |
| **Best for** | Quick overview, trend check, "what's hot" | Systematic collection, precise metrics, dataset building |
| **Data quality** | AI-summarized, may miss some posts | Raw DOM data, exact engagement numbers, includes views |
| **Search operators** | No (natural language only) | Yes (`min_faves:`, `filter:blue_verified`, date ranges, etc.) |
| **Output** | 5-15 posts per query | 10-15 posts per round, 3-5 rounds |
| **Views count** | Not available | Available |

### Auto-selection rules

Use **Grok Mode** when:
- User asks a simple question ("what's trending about X?", "find popular posts about Y")
- Quick exploration / first look at a topic
- Single broad query is sufficient
- User explicitly says "quick" or "fast"

Use **Actionbook Scrape Mode** when:
- User wants systematic multi-round collection (viral + trending + KOL + hook study)
- Need precise engagement thresholds (`min_faves:100`, `filter:blue_verified`)
- Need views count
- Building a JSONL dataset for later analysis
- User explicitly says "detailed", "full", or "all rounds"

> When unsure, default to **Grok Mode** — it's faster and sufficient for most requests. Escalate to Actionbook Scrape if Grok results are insufficient or user asks for more.

---

## Prerequisites

| Dependency | Purpose | Required |
|------------|---------|----------|
| Claude Code | Runtime | Yes |
| Actionbook CLI | Browser automation (`actionbook` command) | Yes |
| Actionbook Extension | Chrome extension + bridge for controlling user's browser | Yes |
| Logged-in X/Twitter session | User's Chrome must have an active x.com session | Yes |
| X Premium (for Grok) | Grok search requires Premium subscription | Only for Grok Mode |

### Pre-flight Check

Before starting any round, verify the extension bridge is running:

```bash
actionbook extension ping
```

If not connected, inform the user:
> "Actionbook extension bridge is not running. Please run `actionbook extension serve` in a terminal and ensure the Chrome extension is connected."

---

## Grok Mode (Quick Search)

Ask Grok on x.com to search X and return structured results. One query, ~60 seconds.

### Grok Workflow

#### 1. Navigate to Grok

```bash
actionbook --extension browser open "https://x.com/i/grok"
```

Wait 4 seconds for page load, then verify textarea exists:

```bash
actionbook --extension browser eval "document.querySelector('textarea') ? 'ready' : 'not_ready'"
```

> Use `browser open` (new tab) instead of `browser goto` to avoid "Cannot access chrome:// URL" errors.

#### 2. Input the Question

Craft a Grok prompt that returns structured data. Template:

```
Search X for the most popular posts about [TOPIC] in the past [TIME_RANGE]. Show me the top [N] posts with the most engagement (likes + retweets). For each post, include: the author handle, post text, likes count, retweets count, and the post URL.
```

Set the value via JS (React state-safe):

```bash
actionbook --extension browser eval "
  var textarea = document.querySelector('textarea');
  if (textarea) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, 'YOUR GROK PROMPT HERE');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    'ok'
  } else { 'no_textarea' }
"
```

#### 3. Send the Question

```bash
actionbook --extension browser eval "
  var btns = document.querySelectorAll('button');
  var sent = false;
  for (var i = 0; i < btns.length; i++) {
    var svg = btns[i].querySelector('svg');
    var rect = btns[i].getBoundingClientRect();
    if (svg && rect.width > 20 && rect.width < 60 && rect.height > 20 && rect.height < 60 && rect.x > 600) {
      btns[i].click();
      sent = true;
      break;
    }
  }
  sent ? 'sent' : 'not_found'
"
```

If `not_found`, take a screenshot (`actionbook --extension browser screenshot`) and debug visually.

#### 4. Wait for Response

Grok takes 10-60 seconds (longer when searching X). Poll every 8 seconds:

```bash
actionbook --extension browser eval "document.querySelector('main') ? document.querySelector('main').innerText.length : 0"
```

Response is ready when length > 500. Timeout after 90 seconds and extract whatever is available.

#### 5. Extract Response

```bash
actionbook --extension browser eval "document.querySelector('main').innerText"
```

#### 6. Parse into JSONL Schema

Parse Grok's text response and map each post to the standard JSONL schema. For fields Grok doesn't provide:
- `views`: set to `"0"` (Grok doesn't return views)
- `replies`: set to `0` if not provided
- `posted_at`: set to `null` if not provided
- `angle` and `key_takeaway`: analyze and fill in yourself
- `format`: infer from text length and content (`thread` if mentions thread/continues, else `single`)

---

## Actionbook Scrape Mode (Full Collection)

Use Actionbook Extension mode to control the user's Chrome browser, navigate x.com search, and extract tweet data directly from the DOM.

### General Steps (repeat for each search round)

1. **Navigate** — `actionbook --extension browser goto "<search-url>"` to the x.com search URL
2. **Wait** — `sleep 3` then `actionbook --extension browser wait "article[data-testid='tweet']"` until tweets appear
3. **Extract** — `actionbook --extension browser eval "<JS>"` to run extraction script
4. **Scroll + Extract more** — if fewer than 10 tweets, scroll and extract again

### Tweet Extraction Script

Use `actionbook --extension browser eval` with this JS to extract tweets:

```bash
actionbook --extension browser eval "
(function() {
  var tweets = document.querySelectorAll('article[data-testid=\"tweet\"]');
  return Array.from(tweets).slice(0, 20).map(function(t) {
    var nameEl = t.querySelector('[data-testid=\"User-Name\"]');
    var handleLink = nameEl ? nameEl.querySelector('a[href^=\"/\"][tabindex=\"-1\"]') : null;
    var handle = handleLink ? handleLink.getAttribute('href').replace('/', '') : null;
    var displayName = nameEl ? (nameEl.querySelector('a span') || {}).innerText || null : null;
    var textEl = t.querySelector('[data-testid=\"tweetText\"]');
    var text = textEl ? textEl.innerText : '';
    var timeEl = t.querySelector('time');
    var time = timeEl ? timeEl.getAttribute('datetime') : null;
    var linkEl = timeEl ? timeEl.closest('a') : null;
    var tweetLink = linkEl ? linkEl.getAttribute('href') : null;
    var replyCount = (t.querySelector('[data-testid=\"reply\"] span') || {}).innerText || '0';
    var retweetCount = (t.querySelector('[data-testid=\"retweet\"] span') || {}).innerText || '0';
    var likeCount = (t.querySelector('[data-testid=\"like\"] span') || {}).innerText || '0';
    var viewsEl = t.querySelector('a[href*=\"/analytics\"]');
    var viewsLabel = viewsEl ? viewsEl.getAttribute('aria-label') || '' : '';
    var viewsMatch = viewsLabel.match(/([\d,.]+[KMB]?)\s*view/i);
    var views = viewsMatch ? viewsMatch[1] : '0';
    return {
      handle: handle ? '@' + handle : null,
      display_name: displayName,
      text: text.substring(0, 200),
      posted_at: time,
      url: tweetLink ? 'https://x.com' + tweetLink : null,
      replies: replyCount, retweets: retweetCount, likes: likeCount, views: views
    };
  }).filter(function(t) { return t.text && t.handle; });
})()
"
```

### Scrolling to Load More Tweets

```bash
# Scroll down 1500px, wait, repeat 3 times
actionbook --extension browser eval "window.scrollBy(0, 1500)"
sleep 2
actionbook --extension browser eval "window.scrollBy(0, 1500)"
sleep 2
actionbook --extension browser eval "window.scrollBy(0, 1500)"
sleep 2
# Then re-run extraction script above and deduplicate by URL
```

> **Note**: X's DOM structure may change. If selectors break, use `actionbook --extension browser snapshot` to read the accessibility tree, or `actionbook --extension browser screenshot` to visually inspect and adjust selectors.

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

## Intelligence Gathering Rounds (Actionbook Scrape Mode)

Run 3 core rounds + optional bonus rounds. All queries include `-filter:replies -filter:nativeretweets` by default to eliminate noise and surface only original content.

> **Grok Mode alternative**: If using Grok Mode, skip these rounds entirely. Instead, craft 1-3 targeted Grok prompts covering the same ground (e.g., "top viral posts about [topic]", "trending [topic] posts in last 24h", "which verified accounts are posting about [topic]").

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
X Intelligence for "[topic]" — [N] tweets collected (via [Grok / Actionbook Scrape]):
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
