# 账号鸭商城 - Cloudflare Pages 部署

## 线上地址
- Pages: https://zhanghaoya.pages.dev
- 目标域名: https://www.zhanghaoya.com

## Paymento 配置（必须）

在 [Paymento 商户后台](https://app.paymento.io) 注册并获取 API Key 和 Secret，然后执行：

```bash
cd C:\Users\Administrator\Desktop\Cursor项目\zhanghaoya-shop

# 设置 Paymento API 密钥
wrangler pages secret put PAYMENTO_API_KEY --project-name=zhanghaoya
wrangler pages secret put PAYMENTO_SECRET --project-name=zhanghaoya
```

在 Paymento 后台设置 IPN 回调地址：
```
https://www.zhanghaoya.com/api/payment/ipn
```

## 重新部署

```bash
npm run deploy
```

## 更新商品数据

```bash
npm run scrape
npm run db:seed
```

## 自动发文机器人

每天 09:00（北京时间）自动生成一篇以站内商品为主题的教程/指南，经 HK-DeepSeek 润色后发布。

- 文档：[ARTICLE_BOT.md](ARTICLE_BOT.md)
- 仓库：https://github.com/xinpujing8520/laohaoba
- 本地测试：`npm run article:dry-run`
- 正式生成：`npm run article:daily`（需 `DEEPSEEK_API_KEY`）

GitHub Actions 需在仓库 Secrets 配置 `DEEPSEEK_API_KEY`，可选 `CLOUDFLARE_API_TOKEN` 自动部署。

## 项目结构

- `public/` - 前端静态文件（Vue + Element UI）
- `functions/api/` - Cloudflare Pages Functions API
- `scripts/scrape-products.js` - 从原站抓取商品
- D1 数据库 `zhanghaoya-db` - 商品和订单存储
