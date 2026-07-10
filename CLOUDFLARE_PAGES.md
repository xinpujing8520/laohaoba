# Cloudflare Pages（Git 自动部署）配置

仓库：https://github.com/xinpujing8520/laohaoba

## 仪表盘设置

Cloudflare → Pages → **zhanghaoya** → Settings → Builds & deployments：

| 项 | 值 |
|----|-----|
| Framework preset | **None** |
| Build command | `npm run build`（或留空 / `exit 0`） |
| Build output directory | `public` |
| Root directory | `/`（仓库根目录） |

## 为什么之前部署失败？

1. `package.json` 没有 `build` 脚本 → 已添加空构建脚本
2. `wrangler.toml` 被 gitignore，Git 拉代码后缺少 D1 绑定 → 已提交安全版 `wrangler.toml`（不含支付密钥）
3. 支付密钥 `EPAY188_SECRET` 需在 Cloudflare Pages **Environment variables** 或 `wrangler pages secret put` 中配置

## 验证

推送 `main` 后，Pages 部署应显示绿色成功。最新文章 commit（`chore(article-bot): daily article`）部署成功后即可在 https://www.laohaoba.com/news.html 看到新文章。
