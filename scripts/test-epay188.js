import crypto from 'crypto';

const PID = '46603f7a-4e86-4e8a-bd23-422a3a18d393';
const SECRET = '6b41428e8f66da221684e04a4360b6c2';
const BASE = 'https://api2.188pay.top';

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function epaySign(params, secret) {
  const keys = Object.keys(params)
    .filter((k) => !['sign', 'sign_type'].includes(k) && params[k] !== '' && params[k] != null)
    .sort();
  return md5(keys.map((k) => `${k}=${params[k]}`).join('&') + secret);
}

function jsonSign(fields, secret) {
  const keys = fields.filter((k) => body[k] !== '' && body[k] != null).sort();
  return md5(`${keys.map((k) => `${k}=${body[k]}`).join('&')}&key=${secret}`);
}

const orderNo = `TEST${Date.now()}`;

// Test EPay submit.php
const epayParams = {
  pid: PID,
  type: 'usdt',
  out_trade_no: orderNo,
  money: '0.30',
  name: 'test',
  notify_url: 'https://www.laohaoba.com/api/payment/epay188-notify',
  return_url: 'https://www.laohaoba.com/order/search.html',
  sign_type: 'MD5'
};
epayParams.sign = epaySign(epayParams, SECRET);
const epayUrl = `${BASE}/submit.php?${new URLSearchParams(epayParams)}`;
const epayRes = await fetch(epayUrl, { redirect: 'manual' });
console.log('EPay submit:', epayRes.status, epayRes.headers.get('location') || (await epayRes.text()).slice(0, 200));

// Test JSON /pay/address variants
const variants = [
  { amount: 0.3, fields: ['amount', 'coinType', 'merchantId', 'merchantOrderId', 'notifyUrl'] },
  { amount: '0.30', fields: ['amount', 'coinType', 'merchantId', 'merchantOrderId', 'notifyUrl'] },
  { amount: 0.3, fields: ['amount', 'coinType', 'merchantId', 'merchantOrderId', 'notifyUrl', 'returnUrl', 'subject'] }
];

for (const v of variants) {
  const body = {
    merchantId: PID,
    merchantOrderId: orderNo + Math.random().toString(36).slice(2, 5),
    amount: v.amount,
    coinType: 'usdt',
    notifyUrl: 'https://www.laohaoba.com/api/payment/epay188-notify',
    returnUrl: 'https://www.laohaoba.com/order/search.html',
    subject: 'test'
  };
  const keys = v.fields.filter((k) => body[k] !== '' && body[k] != null).sort();
  body.sign = md5(`${keys.map((k) => `${k}=${body[k]}`).join('&')}&key=${SECRET}`);
  const res = await fetch(`${BASE}/pay/address`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  console.log(`\nJSON variant amount=${v.amount} fields=${v.fields.length}:`, res.status, text.slice(0, 200));
}
