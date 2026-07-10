const crypto = require('crypto');

const token = 'UPH28C0BKHURBLLW3I0M7';
const secret = 'WxY0quydMeU7qSpexMvMfHiucaUkKfs0';
const path = '/api/order/pay-info';
const body = JSON.stringify({
  chain: 'TRX',
  currency: 'USDT-TRC20',
  vs_currency: 'CNY',
  vs_price: 3,
  succeed_url: 'https://zhanghaoya.pages.dev/order/result.html',
  timeout_url: 'https://zhanghaoya.pages.dev/',
  callback_url: 'https://zhanghaoya.pages.dev/api/payment/aurpay-callback',
  timeout_callback: 'https://zhanghaoya.pages.dev/api/payment/aurpay-timeout',
  fixed_encrypt_price: false,
  enable_post_callback: true
});

const algorithm = 'HMAC-SHA256';
const date = new Date().toISOString();
const bodyMd5 = crypto.createHash('md5').update(body).digest('hex');
const origin = `${algorithm} | ${date} | POST ${path} | ${bodyMd5}`;
const sig = crypto.createHmac('sha256', secret).update(origin).digest('base64');

fetch('https://dashboard.aurpay.net' + path, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'API-Token': token,
    Algorithm: algorithm,
    Date: date,
    'Body-MD5': bodyMd5,
    Signature: sig
  },
  body
}).then(async (r) => {
  const t = await r.text();
  console.log(r.status, t);
});
