import { json, cors } from '../_utils.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const preflight = cors(request);
  if (preflight) return preflight;

  if (request.method !== 'GET') {
    return json({ Code: 405, Message: 'Method not allowed' }, 405);
  }

  const id = String(params.id || '').replace(/\.html$/i, '');
  if (!id || id === 'search') return json({ Code: 404, Message: '商品不存在' }, 404);

  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  if (!product) return json({ Code: 404, Message: '商品不存在' }, 404);

  return json({
    Code: 200,
    Data: {
      id: String(product.id),
      name: product.name,
      price: product.price,
      stock: product.stock,
      minBuy: product.min_buy,
      maxBuy: Math.min(product.max_buy, product.stock > 0 ? product.stock : product.max_buy),
      description: product.description || product.name,
      icon: product.icon
    }
  });
}
