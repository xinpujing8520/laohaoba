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
3. 支付密钥 `EPAY188_SECRET` 需在 Cloudflare Pages **Secrets** 中配置（仅此一项为 Secret）
4. **勿**将 `EPAY188_PID`、`EPAY188_API_URL`、`SITE_URL` 同时写入 Secrets 与 `wrangler.toml` [vars]，否则会报 `Binding name already in use`，Functions 无法部署，系统会退回 Paymento
5. 配置 188 后执行：`node scripts/setup-epay188.js`（只上传 `EPAY188_SECRET`），再 `npm run deploy` 或等待 Git 自动部署

## 文章机器人 commit 注意

commit 消息**不要**加 `[skip ci]`，否则 Cloudflare Pages 会跳过部署（显示 No deployment available）。

文章 workflow 只在定时/manual 触发，不会因 push 重复运行，无需 skip 标记。
