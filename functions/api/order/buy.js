import {
  json, cors, genOrderNo, genId,
  getEpay188Config, createEpay188Payment,
  getGmpayConfig, createGmpayPayment, createPaymentoRequest, getSiteUrl
} from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const preflight = cors(request);
  if (preflight) return preflight;

  if (request.method !== 'POST') {
    return json({ Code: 405, Message: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  let data;
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await request.json();
  } else {
    data = Object.fromEntries(new URLSearchParams(await request.text()));
  }

  const productId = data.ProductId || data.productId;
  const qty = parseInt(data.Qty || data.qty || 1, 10);
  const email = data.Email || data.email || '';

  const epay188 = getEpay188Config(env);
  const gmpay = getGmpayConfig(env);
  if (!epay188.configured && !gmpay.configured && !env.PAYMENTO_API_KEY) {
    return json({ Code: 503, Message: '支付未配置，请设置 EPAY188 / GMPAY / PAYMENTO 密钥' }, 503);
  }

  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ? AND is_on_sale = 1').bind(productId).first();
  if (!product) return json({ Code: 400, Message: '商品不存在或已下架' });
  if (product.stock < qty) return json({ Code: 400, Message: '库存不足' });
  if (qty < product.min_buy || qty > product.max_buy) {
    return json({ Code: 400, Message: `购买数量需在 ${product.min_buy}-${product.max_buy} 之间` });
  }

  const totalAmount = Math.round(product.price * qty * 100) / 100;
  const orderId = genId();
  const orderNo = genOrderNo();
  const siteUrl = getSiteUrl(env, url.origin);
  const base = siteUrl;

  try {
    if (epay188.configured) {
      const payment = await createEpay188Payment(env, {
        amount: totalAmount,
        orderNo,
        siteUrl,
        productName: product.name
      });

      const paymentToken = JSON.stringify({
        mode: 'epay188',
        trade_id: payment.tradeId,
        pay_address: payment.payAddress,
        pay_amount: payment.payAmount,
        pay_currency: payment.payCurrency,
        network: payment.network,
        pay_url: payment.payUrl
      });

      await env.DB.prepare(`
        INSERT INTO orders (id, order_no, product_id, product_name, qty, unit_price, total_amount, email, status, payment_token, payment_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(
        orderId, orderNo, product.id, product.name, qty, product.price, totalAmount, email,
        paymentToken, payment.tradeId
      ).run();

      return json({
        Code: 200,
        Data: {
          PayType: 'USDT',
          Entity: { ID: orderId, OrderNo: orderNo },
          PaymentUrl: `${base}/order/pay.html?orderNo=${encodeURIComponent(orderNo)}`
        }
      });
    }

    if (gmpay.configured) {
      const payment = await createGmpayPayment(env, {
        amount: totalAmount,
        orderNo,
        siteUrl,
        productName: product.name
      });

      const paymentToken = JSON.stringify({
        mode: 'gmpay',
        trade_id: payment.tradeId,
        pay_address: payment.payAddress,
        pay_amount: payment.payAmount,
        pay_currency: payment.payCurrency,
        network: payment.network
      });

      await env.DB.prepare(`
        INSERT INTO orders (id, order_no, product_id, product_name, qty, unit_price, total_amount, email, status, payment_token, payment_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(
        orderId, orderNo, product.id, product.name, qty, product.price, totalAmount, email,
        paymentToken, payment.tradeId
      ).run();

      return json({
        Code: 200,
        Data: {
          PayType: 'USDT',
          Entity: { ID: orderId, OrderNo: orderNo },
          PaymentUrl: `${base}/order/pay.html?orderNo=${encodeURIComponent(orderNo)}`
        }
      });
    }

    const payment = await createPaymentoRequest(env, {
      fiatAmount: totalAmount,
      orderId: orderNo,
      returnUrl: `${base}/order/result.html?orderNo=${encodeURIComponent(orderNo)}`,
      email,
      additionalData: [{ key: 'product', value: product.name }]
    });

    const paymentToken = JSON.stringify({ mode: 'paymento', token: payment.token });

    await env.DB.prepare(`
      INSERT INTO orders (id, order_no, product_id, product_name, qty, unit_price, total_amount, email, status, payment_token, payment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(
      orderId, orderNo, product.id, product.name, qty, product.price, totalAmount, email,
      paymentToken, payment.token
    ).run();

    return json({
      Code: 200,
      Data: {
        PayType: 'Paymento',
        Entity: { ID: orderId, OrderNo: orderNo },
        PaymentUrl: payment.gatewayUrl
      }
    });
  } catch (e) {
    return json({ Code: 500, Message: '创建支付失败: ' + e.message }, 500);
  }
}
