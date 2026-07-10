import { verifyAurpayCallback } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const callbackUrl = request.url;

  if (env.AURPAY_CALLBACK_TOKEN || env.AURPAY_CALLBACK_SECRET) {
    const valid = await verifyAurpayCallback(request, callbackUrl, env);
    if (!valid) return new Response('Invalid signature', { status: 403 });
  }

  return new Response('ok', { status: 200 });
}
