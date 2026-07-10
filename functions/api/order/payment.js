import {
  json, cors, checkEpay188PaymentStatus, checkGmpayPaymentStatus, markOrderPaid
} from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const preflight = cors(request);
  if (preflight) return preflight;

  if (request.method !== 'GET') {
    return json({ Code: 405, Message: 'Method not allowed' }, 405);
  }

  const orderNo = new URL(request.url).searchParams.get('orderNo');
  if (!orderNo) return json({ Code: 400, Message: '缺少订单号' });

  const order = await env.DB.prepare('SELECT * FROM orders WHERE order_no = ?').bind(orderNo).first();
  if (!order) return json({ Code: 404, Message: '订单不存在' });

  let payInfo = null;
  try {
    payInfo = JSON.parse(order.payment_token || '');
  } catch {
    payInfo = null;
  }

  const supported = payInfo && ['epay188', 'gmpay', 'aurpay', 'direct'].includes(payInfo.mode);
  if (!supported) {
    return json({ Code: 400, Message: '支付信息不存在' });
  }

  let paid = order.status === 'paid';
  if (!paid && payInfo.trade_id) {
    if (payInfo.mode === 'epay188') {
      const status = await checkEpay188PaymentStatus(env, payInfo.trade_id);
      if (status && String(status.status).toUpperCase() === 'SUCCESS') {
        await markOrderPaid(env, orderNo, payInfo.trade_id);
        paid = true;
      }
    } else if (payInfo.mode === 'gmpay') {
      const status = await checkGmpayPaymentStatus(env, payInfo.trade_id);
      if (status && Number(status.status) === 2) {
        await markOrderPaid(env, orderNo, payInfo.trade_id);
        paid = true;
      }
    }
  }

  return json({
    Code: 200,
    Data: {
      OrderNo: order.order_no,
      ProductName: order.product_name,
      TotalAmount: order.total_amount,
      Email: order.email,
      PayAddress: payInfo.pay_address,
      PayAmount: payInfo.pay_amount,
      PayCurrency: String(payInfo.pay_currency || 'USDT').toUpperCase(),
      Network: payInfo.network || 'TRC20',
      PayUrl: payInfo.pay_url || '',
      Status: paid ? 'PAID' : 'PENDING',
      Paid: paid
    }
  });
}
