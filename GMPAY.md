# GMPay / BEpusdt 本站扫码支付配置

本站已支持与原站相同的 **USDT (TRC20) 扫码 + 复制地址** 付款方式。下单后跳转到 `/order/pay.html`，显示收款二维码、精确 USDT 金额和 TRC20 地址，客户用交易所提币或钱包扫码即可，**无需连接 TronLink**。

## 架构

```
客户下单 → Cloudflare Pages API → BEpusdt (GMPay API)
                ↓
         /order/pay.html（本站二维码+地址）
                ↓
BEpusdt 检测链上到账 → POST /api/payment/gmpay-notify → 订单标记已支付
```

## 1. 部署 BEpusdt

推荐使用 Docker 自托管 [BEpusdt](https://github.com/v03413/BEpusdt) 或 [Epusdt](https://github.com/assimon/epusdt)：

```bash
# 示例（请按官方文档调整）
git clone https://github.com/v03413/BEpusdt.git
cd BEpusdt
cp .env.example .env
# 编辑 .env：数据库、波场钱包地址、API 端口等
docker compose up -d
```

部署后确保：

1. 管理后台可访问（默认端口见项目文档）
2. 已配置 **TRC20 收款钱包地址**
3. 在「API 密钥」中创建商户，记下 **pid** 和 **secret_key**
4. BEpusdt 服务有公网 HTTPS 地址（可用 Cloudflare Tunnel / Nginx 反代）

## 2. 配置 Cloudflare Secrets

在项目目录执行：

```bash
npx wrangler pages secret put GMPAY_API_URL --project-name=zhanghaoya
# 例：https://pay.yourdomain.com

npx wrangler pages secret put GMPAY_PID --project-name=zhanghaoya
# 例：1000

npx wrangler pages secret put GMPAY_SECRET --project-name=zhanghaoya
# 管理后台 API 密钥的 secret_key
```

也支持别名 `EPUSDT_API_URL` / `EPUSDT_PID` / `EPUSDT_SECRET`。

可选：

```bash
npx wrangler pages secret put SITE_URL --project-name=zhanghaoya
# 例：https://www.zhanghaoya.com
```

## 3. 回调地址

BEpusdt 会向以下地址发送 JSON 回调（status=2 表示支付成功）：

```
https://www.zhanghaoya.com/api/payment/gmpay-notify
```

请确保该 URL 可从 BEpusdt 服务器访问。

## 4. 支付优先级

- 若配置了 `GMPAY_*`：使用本站扫码支付（推荐）
- 否则若配置了 `PAYMENTO_*`：跳转 Paymento 外链收银台

## 5. 测试流程

1. 配置 Secrets 后重新部署：`npx wrangler pages deploy public --project-name=zhanghaoya`
2. 购买低价商品（如 0.3 元）
3. 应跳转到 `/order/pay.html?orderNo=...`，显示 USDT 金额和 TRC20 地址
4. 按精确金额转账后，页面约 12 秒内自动刷新为「支付成功」

## API 参考

- 创建订单：`POST {GMPAY_API_URL}/payments/gmpay/v1/order/create-transaction`
- 查询状态：`GET {GMPAY_API_URL}/pay/check-status/{trade_id}`
- 文档：https://epusdt.com/guide/integration/gmpay
