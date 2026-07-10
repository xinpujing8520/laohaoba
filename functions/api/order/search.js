import { json, cors } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const preflight = cors(request);
  if (preflight) return preflight;

  if (request.method !== 'GET') {
    return json({ Code: 405, Message: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword') || url.searchParams.get('orderNo') || '';
  if (!keyword) return json({ Code: 400, Message: '请输入订单号或邮箱' });

  const { results } = await env.DB.prepare(`
    SELECT * FROM orders WHERE order_no = ? OR email = ? ORDER BY created_at DESC LIMIT 20
  `).bind(keyword, keyword).all();

  return json({
    Code: 200,
    Data: results.map(o => ({
      OrderNo: o.order_no,
      ProductName: o.product_name,
      Qty: o.qty,
      TotalAmount: o.total_amount,
      Status: o.status,
      CardContent: o.status === 'paid' ? o.card_content : null,
      CreatedAt: o.created_at,
      PaidAt: o.paid_at
    }))
  });
}
