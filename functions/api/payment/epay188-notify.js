import {
  verifyEpay188Callback, verifyEpay188EpayCallback, markOrderPaid
} from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const secret = String(
    env.EPAY188_SECRET || env.EPAY_SECRET || env.TOKEN188_SECRET || ''
  ).trim();

  if (request.method === 'GET') {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    if (!secret || !verifyEpay188EpayCallback(params, secret)) {
      return new Response('Invalid signature', { status: 403 });
    }
    const orderNo = params.out_trade_no;
    const tradeId = String(params.trade_no || '');
    if (orderNo && String(params.trade_status || '').toUpperCase() === 'TRADE_SUCCESS') {
      await markOrderPaid(env, orderNo, tradeId);
    }
    return new Response('success', { status: 200 });
  }

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

  if (!secret || !verifyEpay188Callback(payload, secret)) {
    return new Response('Invalid signature', { status: 403 });
  }

  const orderNo = payload.out_trade_no;
  const tradeId = String(payload.trade_no || '');
  if (orderNo && String(payload.status || '').toUpperCase() === 'SUCCESS') {
    await markOrderPaid(env, orderNo, tradeId);
  }

  return new Response('success', { status: 200 });
}
