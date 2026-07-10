// Shared utilities for Cloudflare Pages Functions
import { createHash } from 'node:crypto';

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export function cors(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  return null;
}

export function genOrderNo() {
  const d = new Date();
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function genId() {
  return crypto.randomUUID().replace(/-/g, '');
}

export function encodeAssetUrl(url) {
  const raw = String(url || '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return raw;
  try {
    const u = new URL(raw);
    u.pathname = u.pathname
      .split('/')
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join('/');
    return u.toString();
  } catch {
    return raw.replace(/ /g, '%20');
  }
}

export function isNowPaymentsPaid(status) {
  const s = String(status || '').toLowerCase();
  return s === 'finished' || s === 'confirmed';
}

export function isAurpayPaid(status) {
  const s = String(status || '').toUpperCase();
  return s === 'SUCCEED' || s === 'SUCCESS' || s === 'PAID' || s === 'COMPLETED';
}

export function isPaymentoPaid(status) {
  const n = Number(status);
  if (n === 7 || n === 8) return true;
  const s = String(status || '').toLowerCase();
  return s === 'paid' || s === 'approve';
}

export async function verifyPaymentoIpn(rawBody, signature, secret) {
  const secretKey = String(secret || '').trim();
  if (!secretKey || !signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return expected === String(signature || '').trim().toUpperCase();
}

export async function verifyPaymentoPayment(env, token) {
  const apiKey = String(env.PAYMENTO_API_KEY || '').trim();
  if (!apiKey) throw new Error('PAYMENTO_API_KEY not configured');
  const res = await fetch('https://api.paymento.io/v1/payment/verify', {
    method: 'POST',
    headers: {
      'Api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ token: String(token || '').trim() })
  });
  return res.json().catch(() => ({}));
}

export async function createPaymentoRequest(env, { fiatAmount, orderId, returnUrl, email, additionalData }) {
  const apiKey = String(env.PAYMENTO_API_KEY || '').trim();
  if (!apiKey) throw new Error('PAYMENTO_API_KEY not configured');

  const body = {
    fiatAmount: String(fiatAmount),
    fiatCurrency: String(env.FIAT_CURRENCY || 'CNY').toUpperCase(),
    ReturnUrl: returnUrl,
    orderId,
    Speed: 0
  };
  if (email) body.EmailAddress = email;
  if (additionalData?.length) body.additionalData = additionalData;

  const res = await fetch('https://api.paymento.io/v1/payment/request', {
    method: 'POST',
    headers: {
      'Api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'text/plain'
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!data.success || !data.body) {
    throw new Error(data.message || data.error || JSON.stringify(data).slice(0, 200));
  }

  const token = String(data.body).trim();
  return {
    token,
    gatewayUrl: `https://app.paymento.io/gateway?token=${encodeURIComponent(token)}`
  };
}

export function getGmpayConfig(env) {
  const apiUrl = String(env.GMPAY_API_URL || env.EPUSDT_API_URL || '').trim().replace(/\/$/, '');
  const pid = String(env.GMPAY_PID || env.EPUSDT_PID || '').trim();
  const secret = String(env.GMPAY_SECRET || env.EPUSDT_SECRET || '').trim();
  return { apiUrl, pid, secret, configured: !!(apiUrl && pid && secret) };
}

function gmpaySign(params, secretKey) {
  const pairs = Object.keys(params)
    .filter((k) => k !== 'signature' && params[k] !== '' && params[k] !== null && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`);
  return md5Hex(pairs.join('&') + secretKey);
}

export function verifyGmpaySignature(payload, secretKey) {
  const secret = String(secretKey || '').trim();
  if (!secret || !payload) return false;
  const copy = { ...payload };
  const received = String(copy.signature || '').trim().toLowerCase();
  delete copy.signature;
  const expected = gmpaySign(copy, secret);
  return received === expected;
}

export async function createGmpayPayment(env, { amount, orderNo, siteUrl, productName }) {
  const { apiUrl, pid, secret } = getGmpayConfig(env);
  if (!apiUrl || !pid || !secret) throw new Error('GMPAY_API_URL / GMPAY_PID / GMPAY_SECRET not configured');

  const base = siteUrl.replace(/\/$/, '');
  const params = {
    pid,
    order_id: orderNo,
    currency: String(env.FIAT_CURRENCY || 'cny').toLowerCase(),
    token: 'usdt',
    network: 'tron',
    amount,
    notify_url: `${base}/api/payment/gmpay-notify`,
    redirect_url: `${base}/order/search.html?keyword=${encodeURIComponent(orderNo)}`,
    name: String(productName || 'order').slice(0, 50)
  };
  params.signature = gmpaySign(params, secret);

  const res = await fetch(`${apiUrl}/payments/gmpay/v1/order/create-transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status_code !== 200 || !data.data?.receive_address) {
    throw new Error(data.message || JSON.stringify(data).slice(0, 200));
  }

  return {
    tradeId: String(data.data.trade_id),
    payAddress: data.data.receive_address,
    payAmount: data.data.actual_amount,
    payCurrency: String(data.data.token || 'USDT').toUpperCase(),
    network: 'TRC20',
    expirationTime: data.data.expiration_time
  };
}

export async function checkGmpayPaymentStatus(env, tradeId) {
  const { apiUrl } = getGmpayConfig(env);
  if (!apiUrl || !tradeId) return null;
  const res = await fetch(`${apiUrl}/pay/check-status/${encodeURIComponent(tradeId)}`, {
    headers: { Accept: 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status_code !== 200) return null;
  return data.data || null;
}

export function getEpay188Config(env) {
  const apiUrl = String(
    env.EPAY188_API_URL || env.EPAY_API_URL || env.TOKEN188_API_URL || 'https://api2.188pay.top'
  ).trim().replace(/[\r\n]/g, '').replace(/\/$/, '');
  const pid = String(env.EPAY188_PID || env.EPAY_PID || env.TOKEN188_PID || '').trim().replace(/[\r\n]/g, '');
  const secret = String(env.EPAY188_SECRET || env.EPAY_SECRET || env.TOKEN188_SECRET || '').trim().replace(/[\r\n]/g, '');
  return { apiUrl, pid, secret, configured: !!(apiUrl && pid && secret) };
}

export function getSiteUrl(env, fallbackOrigin) {
  return String(env.SITE_URL || fallbackOrigin || '').trim().replace(/[\r\n]/g, '').replace(/\/$/, '');
}

function epay188JsonSign(params, secretKey) {
  const keys = Object.keys(params)
    .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] != null)
    .sort();
  const str = keys.map((k) => `${k}=${params[k]}`).join('&');
  return md5Hex(`${str}&key=${secretKey}`);
}

function epay188EpaySign(params, secretKey) {
  const pairs = Object.keys(params)
    .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] != null)
    .sort()
    .map((k) => `${k}=${params[k]}`);
  return md5Hex(pairs.join('&') + secretKey);
}

export function verifyEpay188EpayCallback(params, secretKey) {
  const secret = String(secretKey || '').trim();
  if (!secret || !params) return false;
  const copy = { ...params };
  const received = String(copy.sign || '').trim().toLowerCase();
  delete copy.sign;
  delete copy.sign_type;
  const expected = epay188EpaySign(copy, secret);
  return received === expected;
}

export function verifyEpay188Callback(payload, secretKey) {
  const secret = String(secretKey || '').trim();
  if (!secret || !payload) return false;
  const copy = { ...payload };
  const received = String(copy.sign || '').trim().toLowerCase();
  delete copy.sign;
  delete copy.sign_type;
  const expected = epay188JsonSign(copy, secret);
  return received === expected;
}

export async function createEpay188Payment(env, { amount, orderNo, siteUrl, productName }) {
  const { apiUrl, pid, secret } = getEpay188Config(env);
  if (!pid || !secret) throw new Error('EPAY188_PID / EPAY188_SECRET not configured');

  const base = getSiteUrl(env, siteUrl);
  const payName = `订单${String(orderNo).slice(-12)}`;
  const params = {
    pid,
    type: 'usdt',
    out_trade_no: orderNo,
    money: Number(amount).toFixed(2),
    name: payName,
    notify_url: `${base}/api/payment/epay188-notify`,
    return_url: `${base}/order/search.html?keyword=${encodeURIComponent(orderNo)}`,
    sign_type: 'MD5'
  };
  params.sign = epay188EpaySign(params, secret);

  const res = await fetch(`${apiUrl}/submit.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params),
    redirect: 'manual'
  });
  const location = res.headers.get('location') || '';
  const tradeId = (location.match(/[?&]id=([^&]+)/) || [])[1] || '';
  if (!tradeId) {
    const text = await res.text().catch(() => '');
    throw new Error(`188Pay 创建订单失败: HTTP ${res.status} ${text.slice(0, 120)}`);
  }

  const orderRes = await fetch(`${apiUrl}/pay/order/${encodeURIComponent(tradeId)}`, {
    headers: { Accept: 'application/json' }
  });
  const orderData = await orderRes.json().catch(() => ({}));
  if (!orderRes.ok || orderData.code !== 0 || !orderData.data?.walletAddress) {
    throw new Error(orderData.msg || '无法获取收款地址');
  }

  return {
    tradeId: String(orderData.data.id || tradeId),
    payAddress: orderData.data.walletAddress,
    payAmount: orderData.data.actualAmount,
    payCurrency: 'USDT',
    network: 'TRC20',
    payUrl: location.startsWith('http') ? location : `${apiUrl}${location.startsWith('/') ? '' : '/'}${location}`,
    expirationTime: orderData.data.expireAt
  };
}

export async function checkEpay188PaymentStatus(env, tradeId) {
  const { apiUrl } = getEpay188Config(env);
  if (!apiUrl || !tradeId) return null;
  const res = await fetch(`${apiUrl}/pay/order/${encodeURIComponent(tradeId)}`, {
    headers: { Accept: 'application/json' }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code !== 0) return null;
  return data.data || null;
}

export async function markOrderPaid(env, orderNo, paymentId) {
  const result = await env.DB.prepare(`
    UPDATE orders SET status = 'paid', paid_at = datetime('now'), payment_id = ?
    WHERE order_no = ? AND status = 'pending'
  `).bind(paymentId, orderNo).run();

  if (result.meta?.changes > 0) {
    const order = await env.DB.prepare('SELECT * FROM orders WHERE order_no = ?').bind(orderNo).first();
    if (order) {
      await env.DB.prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
        .bind(order.qty, order.product_id, order.qty).run();
    }
  }
}

function sortObjectDeep(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortObjectDeep(obj[key]);
    return acc;
  }, {});
}

export async function verifyNowPaymentsIpn(rawBody, signature, ipnSecret) {
  const params = JSON.parse(rawBody);
  const sorted = JSON.stringify(sortObjectDeep(params));
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(ipnSecret.trim()), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(sorted));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === String(signature || '').toLowerCase();
}

export const AURPAY_COINS = {
  usdterc20: { chain: 'ETH', currency: 'USDT-ERC20', label: 'USDT (ERC20)' },
  usdcerc20: { chain: 'ETH', currency: 'USDC-ERC20', label: 'USDC (ERC20)' },
  dai: { chain: 'ETH', currency: 'DAI-ERC20', label: 'DAI (ERC20)' },
  eth: { chain: 'ETH', currency: 'ETH', label: 'ETH' },
  usdttrc20: { chain: 'TRX', currency: 'USDT-TRC20', label: 'USDT (TRC20)' },
  usdctrc20: { chain: 'TRX', currency: 'USDC-TRC20', label: 'USDC (TRC20)' },
  btc: { chain: 'BTC', currency: 'BTC', label: 'BTC' },
  bnb: { chain: 'BNB', currency: 'BNB', label: 'BNB' }
};

export function resolveAurpayCoin(payCurrency) {
  const key = String(payCurrency || 'usdttrc20').trim().toLowerCase();
  return AURPAY_COINS[key] || AURPAY_COINS.usdttrc20;
}

function md5Hex(str) {
  return createHash('md5').update(str).digest('hex');
}

async function aurpaySignedHeaders(method, path, bodyText, env) {
  const token = String(env.AURPAY_API_TOKEN || env.AURPAY_API_KEY || '').trim();
  const secret = String(env.AURPAY_API_SECRET || '').trim();
  if (!token || !secret) throw new Error('AURPAY_API_TOKEN / AURPAY_API_SECRET not configured');

  const algorithm = 'HMAC-SHA256';
  const date = new Date().toISOString();
  const requestInfo = `${method.toUpperCase()} ${path}`;
  const bodyMd5 = bodyText ? md5Hex(bodyText) : '';
  const signatureOrigin = bodyMd5
    ? `${algorithm} | ${date} | ${requestInfo} | ${bodyMd5}`
    : `${algorithm} | ${date} | ${requestInfo}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signatureOrigin));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  const headers = {
    'Content-Type': 'application/json',
    'API-Token': token,
    Algorithm: algorithm,
    Date: date,
    Signature: signature
  };
  if (bodyMd5) headers['Body-MD5'] = bodyMd5;
  return headers;
}

export async function aurpayApiRequest(env, path, { method = 'GET', body } = {}) {
  const bodyText = body ? JSON.stringify(body) : '';
  const headers = await aurpaySignedHeaders(method, path, bodyText, env);
  const res = await fetch(`https://dashboard.aurpay.net${path}`, {
    method,
    headers,
    body: bodyText || undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.result === false) {
    throw new Error(data.message || data.msg || JSON.stringify(data).slice(0, 200));
  }
  return data;
}

export async function verifyAurpayCallback(request, callbackUrl, env) {
  const token = String(env.AURPAY_CALLBACK_TOKEN || '').trim();
  const secret = String(env.AURPAY_CALLBACK_SECRET || '').trim();
  const headerToken = request.headers.get('Callback-Token') || '';
  if (token && headerToken !== token) return false;
  if (!secret) return !!token;

  const date = request.headers.get('Date') || '';
  const signature = request.headers.get('Signature') || '';
  if (!date || !signature) return false;

  const origin = `${date} | ${callbackUrl}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(origin));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signature;
}

export async function createAurpayPayment(env, { amount, orderNo, siteUrl, payCurrency }) {
  const base = siteUrl.replace(/\/$/, '');
  const coin = resolveAurpayCoin(payCurrency);
  const vsCurrency = String(env.FIAT_CURRENCY || 'CNY').toUpperCase();

  const body = {
    chain: coin.chain,
    currency: coin.currency,
    vs_currency: vsCurrency,
    vs_price: amount,
    succeed_url: `${base}/order/result.html?orderNo=${encodeURIComponent(orderNo)}`,
    timeout_url: `${base}/goods.html`,
    callback_url: `${base}/api/payment/aurpay-callback?orderNo=${encodeURIComponent(orderNo)}`,
    timeout_callback: `${base}/api/payment/aurpay-timeout?orderNo=${encodeURIComponent(orderNo)}`,
    fixed_encrypt_price: false,
    enable_post_callback: true
  };

  const data = await aurpayApiRequest(env, '/api/order/pay-info', { method: 'POST', body });
  if (!data.data?.address || !data.data?.order_id) {
    throw new Error('Aurpay 未返回收款地址');
  }

  return {
    paymentId: String(data.data.order_id),
    payAddress: data.data.address,
    payAmount: data.data.amount,
    payCurrency: coin.currency,
    network: coin.chain,
    payUrl: data.data.pay_url || ''
  };
}

export async function createNowPaymentsPayment(env, { amount, orderNo, description, siteUrl, payCurrency }) {
  const apiKey = String(env.NOWPAYMENTS_API_KEY || '').trim();
  if (!apiKey) throw new Error('NOWPAYMENTS_API_KEY not configured');

  const coin = String(payCurrency || '').trim().toLowerCase();
  if (!coin) throw new Error('请选择支付币种');

  const base = siteUrl.replace(/\/$/, '');
  const body = {
    price_amount: amount,
    price_currency: (env.FIAT_CURRENCY || 'cny').toLowerCase(),
    pay_currency: coin,
    order_id: orderNo,
    order_description: description.slice(0, 150),
    ipn_callback_url: `${base}/api/payment/ipn`,
    is_fixed_rate: false,
    is_fee_paid_by_user: false
  };

  const res = await fetch('https://api.nowpayments.io/v1/payment', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || JSON.stringify(data).slice(0, 200));
    err.code = data.code;
    throw err;
  }
  if (!data.pay_address || !data.payment_id) throw new Error('NOWPayments 未返回收款地址');
  return {
    paymentId: String(data.payment_id),
    payAddress: data.pay_address,
    payAmount: data.pay_amount,
    payCurrency: data.pay_currency || coin,
    network: data.network || '',
    expirationEstimateDate: data.expiration_estimate_date || ''
  };
}

export function isNowPaymentsMinAmountError(err) {
  return err?.code === 'AMOUNT_MINIMAL_ERROR' || /less than minimal/i.test(String(err?.message || ''));
}

export function getCryptoMinCny(env) {
  return Number(env.CRYPTO_MIN_CNY || 80);
}

export async function createNowPaymentsInvoice(env, { amount, orderNo, description, siteUrl, payCurrency }) {
  const apiKey = String(env.NOWPAYMENTS_API_KEY || '').trim();
  if (!apiKey) throw new Error('NOWPAYMENTS_API_KEY not configured');

  const base = siteUrl.replace(/\/$/, '');
  const body = {
    price_amount: amount,
    price_currency: (env.FIAT_CURRENCY || 'cny').toLowerCase(),
    order_id: orderNo,
    order_description: description.slice(0, 150),
    ipn_callback_url: `${base}/api/payment/ipn`,
    success_url: `${base}/order/result.html?orderNo=${encodeURIComponent(orderNo)}`,
    cancel_url: `${base}/`,
    is_fixed_rate: false,
    is_fee_paid_by_user: false
  };
  const coin = String(payCurrency || '').trim().toLowerCase();
  if (coin) body.pay_currency = coin;

  const res = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || JSON.stringify(data).slice(0, 200));
  if (!data.invoice_url) throw new Error('NOWPayments 未返回支付链接');
  let invoiceUrl = data.invoice_url;
  if (coin && !invoiceUrl.includes('pay_currency=')) {
    invoiceUrl += (invoiceUrl.includes('?') ? '&' : '?') + `pay_currency=${encodeURIComponent(coin)}`;
  }
  return { invoiceUrl, invoiceId: String(data.id || '') };
}
