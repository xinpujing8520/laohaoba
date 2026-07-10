import {
  json,
  cors,
  verifyPaymentoIpn,
  isPaymentoPaid,
  verifyPaymentoPayment,
  verifyNowPaymentsIpn,
  isNowPaymentsPaid,
  markOrderPaid
} from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const preflight = cors(request);
  if (preflight) return preflight;

  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const rawBody = await request.text();
  const paymentoSig = request.headers.get('X-Hmac-Sha256-Signature')
    || request.headers.get('X-HMAC-SHA256-SIGNATURE');

  if (paymentoSig) {
    const valid = await verifyPaymentoIpn(rawBody, paymentoSig, env.PAYMENTO_SECRET);
    if (!valid) return json({ error: 'Invalid signature' }, 403);

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const orderNo = payload.OrderId;
    const token = payload.Token;
    const paymentId = String(payload.PaymentId || token || '');

    if (orderNo && token && isPaymentoPaid(payload.OrderStatus)) {
      const verify = await verifyPaymentoPayment(env, token);
      if (verify.success || isPaymentoPaid(verify.body?.orderStatus)) {
        await markOrderPaid(env, verify.body?.orderId || orderNo, paymentId);
      }
    }

    return json({ success: true });
  }

  const signature = request.headers.get('x-nowpayments-sig');
  if (env.NOWPAYMENTS_IPN_SECRET) {
    if (!signature) return json({ error: 'Missing signature' }, 403);
    const valid = await verifyNowPaymentsIpn(rawBody, signature, env.NOWPAYMENTS_IPN_SECRET);
    if (!valid) return json({ error: 'Invalid signature' }, 403);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const orderNo = payload.order_id;
  const paymentStatus = payload.payment_status;
  const paymentId = String(payload.payment_id || payload.invoice_id || '');

  if (orderNo && isNowPaymentsPaid(paymentStatus)) {
    await markOrderPaid(env, orderNo, paymentId);
  }

  return json({ success: true });
}
