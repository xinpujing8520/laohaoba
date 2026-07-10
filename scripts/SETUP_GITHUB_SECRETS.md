# GitHub Actions Secrets 一键配置说明

仓库已推送：https://github.com/xinpujing8520/laohaoba

文章机器人要自动跑起来，需在 GitHub 配置 Secret：

## 1. GEMINI_API_KEY（推荐，你有 Gemini 密钥用这个）

1. 打开 https://aistudio.google.com/apikey 创建 API Key
2. GitHub → [laohaoba Settings → Secrets](https://github.com/xinpujing8520/laohaoba/settings/secrets/actions)
3. **New repository secret**
   - Name: `GEMINI_API_KEY`
   - Value: 你的 Gemini API Key

可选：
- `GEMINI_MODEL` = `gemini-2.5-flash`（默认，可不填）

## 2. DEEPSEEK_API_KEY（可选，仅当你有 DeepSeek 密钥时）

若同时配置了 `GEMINI_API_KEY` 和 `DEEPSEEK_API_KEY`，**优先使用 Gemini**。

## 3. CLOUDFLARE_API_TOKEN（可选，用于 Action 自动部署）

若已在 Cloudflare Pages 连接 Git 自动部署，可不配此项。

1. 打开 https://dash.cloudflare.com/profile/api-tokens
2. 添加 Secret：
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: 生成的 Token
3. 可选 `CLOUDFLARE_ACCOUNT_ID` = `a2914fcdba0c8690e9b7f841029d6d9d`

## 4. 手动测试发文

配置完 `GEMINI_API_KEY` 后：

1. GitHub → **Actions** → **Daily Article Bot** → **Run workflow**
2. `dry_run` 选 `false` → **Run workflow**

成功后会在 `public/data/articles/` 新增文章并自动部署。

## 本地测试

```powershell
$env:GEMINI_API_KEY="你的密钥"
node scripts/generate-daily-article.js
```
