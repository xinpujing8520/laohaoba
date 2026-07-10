/**
 * 配置 Paymento：设置 Cloudflare Secrets + 注册 IPN 回调地址
 *
 * 用法:
 *   $env:PAYMENTO_API_KEY="你的APIKey"
 *   $env:PAYMENTO_SECRET="你的Secret"
 *   node scripts/setup-paymento.js
 */
const https = require('https');

const API_KEY = process.env.PAYMENTO_API_KEY;
const SECRET = process.env.PAYMENTO_SECRET;
const SITE_URL = (process.env.SITE_URL || 'https://zhanghaoya.pages.dev').replace(/\/$/, '');
const IPN_URL = `${SITE_URL}/api/payment/ipn`;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.paymento.io',
      path,
      method,
      headers: {
        'Api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, data: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  if (!API_KEY) {
    console.error('请设置环境变量 PAYMENTO_API_KEY');
    console.error('在 https://app.paymento.io 商户后台获取 API Key');
    process.exit(1);
  }

  console.log('正在配置 Paymento IPN 回调...');
  console.log('IPN URL:', IPN_URL);

  const setRes = await request('POST', '/v1/payment/settings', {
    IPN_Url: IPN_URL,
    IPN_Method: 1
  });
  console.log('设置 IPN:', JSON.stringify(setRes.data, null, 2));

  const getRes = await request('GET', '/v1/payment/settings');
  console.log('当前配置:', JSON.stringify(getRes.data, null, 2));

  console.log('\n接下来请在 Cloudflare 设置密钥:');
  console.log(`  wrangler pages secret put PAYMENTO_API_KEY --project-name=zhanghaoya`);
  if (SECRET) {
    console.log(`  wrangler pages secret put PAYMENTO_SECRET --project-name=zhanghaoya`);
  } else {
    console.log('  wrangler pages secret put PAYMENTO_SECRET --project-name=zhanghaoya');
    console.log('  (Secret 在 Paymento 后台与 API Key 一起获取)');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
