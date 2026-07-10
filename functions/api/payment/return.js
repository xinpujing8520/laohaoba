import { json, cors, verifyPaymentoPayment, markOrderPaid } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const preflight = cors(request);
  if (preflight) return preflight;

  if (request.method !== 'GET') {
    return json({ Code: 405, Message: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const orderNo = url.searchParams.get('orderNo');
  const token = url.searchParams.get('Token') || url.searchParams.get('token');

  if (!orderNo) {
    return json({ Code: 400, Message: '缺少订单号' }, 400);
  }

  if (!token || !env.PAYMENTO_API_KEY) {
    return json({ Code: 200, orderNo, paid: false, message: '请在订单查询中查看支付状态' });
  }

  try {
    const verify = await verifyPaymentoPayment(env, token);
    const paid = !!verify.success;
    if (paid) {
      await markOrderPaid(env, verify.body?.orderId || orderNo, verify.body?.token || token);
    }
    return json({
      Code: 200,
      orderNo,
      paid,
      status: verify.body?.orderStatus || '',
      message: paid ? '支付已确认' : '支付处理中，请稍后到订单查询查看'
    });
  } catch (e) {
    return json({ Code: 200, orderNo, paid: false, message: e.message });
  }
}
