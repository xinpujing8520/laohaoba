# Paymento 接入指南

商城已集成 [Paymento](https://app.paymento.io/) 加密货币收款，支付流程：

1. 用户下单 → 创建 Paymento 支付订单
2. 跳转 `https://app.paymento.io/gateway?token=...` 完成支付
3. Paymento IPN 回调 → 验证签名 → 确认订单已支付
4. 用户返回商城查看订单

## 第一步：获取密钥

1. 注册 [Paymento 商户后台](https://app.paymento.io/)
2. 创建商店，获取 **API Key** 和 **Secret Key**

## 第二步：配置 Cloudflare 密钥

```powershell
cd "C:\Users\Administrator\Desktop\Cursor项目\zhanghaoya-shop"

wrangler pages secret put PAYMENTO_API_KEY --project-name=zhanghaoya
# 粘贴 API Key

wrangler pages secret put PAYMENTO_SECRET --project-name=zhanghaoya
# 粘贴 Secret Key
```

## 第三步：注册 IPN 回调地址

```powershell
$env:PAYMENTO_API_KEY="你的APIKey"
$env:SITE_URL="https://zhanghaoya.pages.dev"
npm run setup-paymento
```

IPN 地址将设为：`https://zhanghaoya.pages.dev/api/payment/ipn`

域名 `www.zhanghaoya.com` 生效后，重新运行并改 `SITE_URL`：

```powershell
$env:SITE_URL="https://www.zhanghaoya.com"
npm run setup-paymento
```

## 第四步：部署

```powershell
npm run deploy
```

## 测试

1. 打开商品页，填写邮箱，点击「前往 Paymento 支付」
2. 在 Paymento 页面选择币种完成支付
3. 返回后在「订单查询」查看状态
