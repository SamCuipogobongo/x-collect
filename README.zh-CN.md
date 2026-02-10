<div align="center">
  <a href="https://github.com/mindfold-ai/Trellis">
    <img src=".github/trellis-banner.png" width="600" alt="Trellis">
  </a>
  <p>
    本 Skill 由 <a href="https://github.com/mindfold-ai/Trellis"><b>Trellis</b></a> 构建 — Claude Code、Cursor 与 iFlow 的一站式 AI 框架与工具集。<br>
    <a href="https://github.com/mindfold-ai/Trellis">立即体验</a>
  </p>
</div>

---

# x-collect

[![npm version](https://img.shields.io/npm/v/x-collect-skill)](https://www.npmjs.com/package/x-collect-skill)
[![license](https://img.shields.io/npm/l/x-collect-skill)](./LICENSE)
[![Discord](https://img.shields.io/discord/1338058872492eback?label=Discord&logo=discord&logoColor=white)](https://discord.gg/tjCB6tVPAm)

[English](./README.md) | 中文

X/Twitter 话题情报采集工具，Claude Code 专用 Skill。通过 Actionbook 浏览器自动化直接搜索 x.com，抓取真实推文和互动数据。

## 功能

`/x-collect [话题]` 打开 x.com，执行 3 轮搜索，提取真实推文数据：

1. **热门推文** — x.com 搜索 "Top" 标签页，算法排序的高热推文
2. **24h 趋势推文** — Top 标签页 + `min_faves:50 since:昨天`，过去 24 小时最热内容
3. **KOL 推文** — `min_faves:100` 过滤，只看高互动账号

可选附加轮次：

4. **Hook 研究** — 纯文字推文（`-filter:media -filter:links`），500+ 赞，用于研究文案模式
5. **对话引爆点** — 高回复推文（`min_replies:30`），找到引发讨论的话题

输出：JSONL + Markdown 保存在 `./x-collect-data/`，包含账号、推文正文、点赞、转发、回复、浏览量，以及内容机会分析。

## 前置条件

| 依赖 | 用途 | 必需 |
|------|------|------|
| [Claude Code](https://claude.ai/claude-code) | 运行环境 | 是 |
| [Actionbook CLI](https://actionbook.dev) | 浏览器自动化（`actionbook` 命令） | 是 |
| Actionbook Chrome 扩展 | 控制用户已有的 Chrome 浏览器 | 是 |
| 已登录的 X/Twitter 会话 | Chrome 需已登录 x.com | 是 |

### 安装 Actionbook 扩展

```bash
actionbook extension install           # 安装扩展文件
# 然后在 Chrome 中加载未打包扩展 (chrome://extensions)
actionbook extension serve             # 启动桥接（保持运行）
```

## 安装

### 方式 A：Claude Plugin Marketplace（推荐）

```bash
claude plugin marketplace add SamCuipogobongo/x-collect
claude plugin install x-collect
```

### 方式 B：npm 全局安装

```bash
npm install -g x-collect-skill
```

### 方式 C：一行脚本

```bash
curl -fsSL https://raw.githubusercontent.com/SamCuipogobongo/x-collect/main/install.sh | bash
```

### 方式 D：手动安装

```bash
git clone https://github.com/SamCuipogobongo/x-collect.git
mkdir -p ~/.claude/skills/x-collect
cp x-collect/SKILL.md ~/.claude/skills/x-collect/
```

## 使用

```bash
# 在 Claude Code 中（确保 Chrome 已打开并登录 x.com）：
/x-collect Claude Code       # 采集 "Claude Code" 话题
/x-collect vibe coding       # 采集 "vibe coding" 话题
/x-collect                    # 交互模式（会询问话题）
```

## 输出

数据保存在 `./x-collect-data/`：

| 文件 | 说明 |
|------|------|
| `intel.jsonl` | 每行一条推文 JSON，按 URL 去重 |
| `intel.md` | 格式化报告，含互动数据 + 内容机会分析 |

### JSONL 字段

```json
{
  "url": "https://x.com/bcherny/status/123",
  "text": "I'm Boris and I created Claude Code...",
  "intel_type": "viral_post",
  "topic": "Claude Code",
  "account": "@bcherny",
  "display_name": "Boris Cherny",
  "angle": "创始人分享 15+ 并行会话的原始配置",
  "format": "thread",
  "likes": 5800,
  "retweets": 1200,
  "replies": 340,
  "views": 6500000,
  "posted_at": "2026-01-15T10:30:00Z",
  "key_takeaway": "创始人幕后故事 + 实用技巧 = 超高互动",
  "collected": "2026-02-08"
}
```

### 情报类型

| 类型 | 来源 |
|------|------|
| `viral_post` | x.com 搜索 "Top" 标签页 |
| `trending_post` | Top 标签页 + `min_faves:50 since:昨天` |
| `kol_post` | `min_faves:100` 过滤 |
| `hook_study` | 纯文字推文（`-filter:media -filter:links`），500+ 赞 |
| `conversation_starter` | 高回复推文（`min_replies:30`） |

## 工作原理

通过 Actionbook Extension 模式浏览器自动化：
1. 控制用户的 Chrome 浏览器（使用已有的 x.com 登录状态）
2. 导航到 x.com 搜索页（Top 标签页 + 各种过滤条件）
3. 等待推文加载
4. 通过 JavaScript 执行提取推文数据
5. 按推文 URL 去重
6. 输出 JSONL + Markdown，附带内容机会分析

无需第三方 API，直接通过 Actionbook 浏览器自动化读取 x.com。

## 社区

问题、反馈或功能建议？加入我们的 [Discord](https://discord.gg/tjCB6tVPAm)。

## License

MIT
