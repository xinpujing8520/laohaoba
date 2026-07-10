import { verifyGmpaySignature, markOrderPaid } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await request.text();
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const secret = String(env.GMPAY_SECRET || env.EPUSDT_SECRET || '').trim();
  if (!secret || !verifyGmpaySignature(payload, secret)) {
    return new Response('Invalid signature', { status: 403 });
  }

  const orderNo = payload.order_id;
  const tradeId = String(payload.trade_id || '');
  if (orderNo && Number(payload.status) === 2) {
    await markOrderPaid(env, orderNo, tradeId);
  }

  return new Response('ok', { status: 200 });
}
