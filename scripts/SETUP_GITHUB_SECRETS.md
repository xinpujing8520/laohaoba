# GitHub Actions Secrets 一键配置说明

仓库已推送：https://github.com/xinpujing8520/laohaoba

文章机器人要自动跑起来，还需在 GitHub 配置 2 个 Secret：

## 1. DEEPSEEK_API_KEY（必填）

1. 打开 https://platform.deepseek.com/api_keys 创建 API Key
2. GitHub → [laohaoba Settings → Secrets](https://github.com/xinpujing8520/laohaoba/settings/secrets/actions)
3. **New repository secret**
   - Name: `DEEPSEEK_API_KEY`
   - Value: 你的 `sk-...` 密钥

## 2. CLOUDFLARE_API_TOKEN（推荐，用于 Action 自动部署）

1. 打开 https://dash.cloudflare.com/profile/api-tokens
2. **Create Token** → 模板 **Edit Cloudflare Workers** 或自定义权限：
   - Account → Cloudflare Pages → Edit
   - Account → D1 → Edit（可选）
3. 添加 Secret：
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: 生成的 Token
4. 可选添加 `CLOUDFLARE_ACCOUNT_ID` = `a2914fcdba0c8690e9b7f841029d6d9d`

## 3. 手动测试发文

配置完 `DEEPSEEK_API_KEY` 后：

1. GitHub → **Actions** → **Daily Article Bot** → **Run workflow**
2. `dry_run` 选 `false` → **Run workflow**

成功后会在 `public/data/articles/` 新增文章并自动部署。

## 本地已完成的部署

- Cloudflare Pages：已部署到 `zhanghaoya` 项目
- 线上域名：https://www.laohaoba.com
- 代码分支：`main` 已推送到 GitHub
