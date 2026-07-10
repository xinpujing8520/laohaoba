import { json, verifyAurpayCallback, isAurpayPaid, markOrderPaid } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const callbackUrl = request.url;

  if (request.method === 'GET') {
    if (env.AURPAY_CALLBACK_TOKEN || env.AURPAY_CALLBACK_SECRET) {
      const valid = await verifyAurpayCallback(request, callbackUrl, env);
      if (!valid) return new Response('Invalid signature', { status: 403 });
    }
    return new Response('ok', { status: 200 });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (env.AURPAY_CALLBACK_TOKEN || env.AURPAY_CALLBACK_SECRET) {
    const valid = await verifyAurpayCallback(request, callbackUrl, env);
    if (!valid) return new Response('Invalid signature', { status: 403 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const aurpayOrderId = String(payload.order_id || '');
  const status = payload.status;
  const orderNo = new URL(callbackUrl).searchParams.get('orderNo');

  if (isAurpayPaid(status)) {
    if (orderNo) {
      await markOrderPaid(env, orderNo, aurpayOrderId);
    } else if (aurpayOrderId) {
      await env.DB.prepare(`
        UPDATE orders SET status = 'paid', paid_at = datetime('now'), payment_id = ?
        WHERE payment_id = ? AND status = 'pending'
      `).bind(aurpayOrderId, aurpayOrderId).run();
    }
  }

  return new Response('ok', { status: 200 });
}
