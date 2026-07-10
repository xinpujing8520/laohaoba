# 自动发文机器人（Article Bot）

每天自动生成一篇以**站内商品**为主题的文章或教程，经 **HK-DeepSeek** 文风优化后发布到新闻资讯。

仓库：[xinpujing8520/laohaoba](https://github.com/xinpujing8520/laohaoba)

## 工作流程

```
GitHub Actions 定时触发（每天 09:00 北京时间）
    ↓
从 category-display / library-pages 选取商品主题
    ↓
DeepSeek 生成初稿（教程 / 选购指南 / FAQ / 技巧 / 对比）
    ↓
HK-DeepSeek 二次润色（去 AI 味、口语化、长短句交替）
    ↓
规则润色（polish-text.js，统一「老号吧」品牌）
    ↓
写入 articles/{id}.json + 更新 news-list.json + home-content.json
    ↓
自动 commit → Cloudflare Pages 部署
```

## 本地运行

```bash
# 1. 配置 API Key
cp .env.example .env
# 编辑 .env 填入 DEEPSEEK_API_KEY

# Windows PowerShell
$env:DEEPSEEK_API_KEY="sk-你的密钥"
node scripts/generate-daily-article.js

# 无 API 测试（模板文章）
node scripts/generate-daily-article.js --dry-run

# 只生成、跳过 DeepSeek 润色
node scripts/generate-daily-article.js --skip-polish
```

## GitHub Secrets 配置

在仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | 是 | [DeepSeek API Key](https://platform.deepseek.com/api_keys) |
| `DEEPSEEK_API_BASE` | 否 | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-chat` |
| `CLOUDFLARE_API_TOKEN` | 否 | 用于 Action 自动部署 Pages |
| `CLOUDFLARE_ACCOUNT_ID` | 否 | Cloudflare 账号 ID |

## 手动触发

GitHub → **Actions** → **Daily Article Bot** → **Run workflow**

可选择 `dry_run=true` 测试流程（不消耗 API）。

## 主题轮换

- 商品来源：`public/data/category-display.json` + `library-pages/*.json` SKU
- 状态文件：`scripts/article-bot-state.json`（记录已写过的商品，轮完一圈后重置）
- 文章类型：教程、选购指南、FAQ、技巧、对比（自动轮换）

## HK-DeepSeek 优化要点

参考常见 DeepSeek 去 AI 味手法，本站在 `scripts/lib/hk-deepseek-polish.js` 中固化：

- 场景化开头，禁止「本文将介绍」
- 删除「首先 / 其次 / 综上所述」等套话
- 长短句交替，段落 2–4 句
- 「用户」→「大家」，品牌统一「老号吧」
- 保留 HTML 结构与商品内链

## 相关文件

| 文件 | 作用 |
|------|------|
| `scripts/generate-daily-article.js` | 主入口 |
| `scripts/lib/deepseek-client.js` | DeepSeek API |
| `scripts/lib/hk-deepseek-polish.js` | HK-DeepSeek 润色 |
| `scripts/lib/article-topics.js` | 商品主题池 |
| `scripts/article-bot-state.json` | 轮换状态 |
| `.github/workflows/daily-article.yml` | 定时任务 |

## 部署说明

Action 成功后会执行：

```bash
npx wrangler pages deploy public --project-name=zhanghaoya
```

若未配置 `CLOUDFLARE_API_TOKEN`，文章仍会 commit 到仓库，需手动部署：

```bash
npm run deploy
```
