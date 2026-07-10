import { json, cors, encodeAssetUrl } from './_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const preflight = cors(request);
  if (preflight) return preflight;

  if (request.method !== 'POST') {
    return json({ Code: 405, Message: 'Method not allowed' }, 405);
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '').replace(/\.html$/i, '');
  if (!id) return json({ Code: 400, Message: '缺少商品ID' }, 400);

  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  if (!product) return json({ Code: 404, Message: '商品不存在' }, 404);

  return json({
    Code: 200,
    Data: {
      id: String(product.id),
      name: product.name,
      price: product.price,
      sourcePrice: product.source_price || product.price,
      stock: product.stock,
      minBuy: product.min_buy,
      maxBuy: Math.min(product.max_buy, product.stock > 0 ? product.stock : product.max_buy),
      description: product.description || product.name,
      detailHtml: product.detail_html || product.description || '',
      imageUrl: encodeAssetUrl(product.image_url || ''),
      categoryName: product.category_name || '',
      categoryId: product.category_id || '',
      shortEn: product.short_en || '',
      icon: product.icon,
      relatedSpecs: await loadRelatedSpecs(env, product)
    }
  });
}

async function loadRelatedSpecs(env, product) {
  if (!product.short_en) {
    return [{
      id: String(product.id),
      name: product.name,
      price: product.price,
      sourcePrice: product.source_price || product.price,
      imageUrl: encodeAssetUrl(product.image_url || ''),
      stock: product.stock
    }];
  }
  const { results } = await env.DB.prepare(`
    SELECT id, name, price, source_price, image_url, stock
    FROM products
    WHERE short_en = ? AND category_id = ? AND is_on_sale = 1
    ORDER BY sort_order ASC, price ASC
    LIMIT 120
  `).bind(product.short_en, product.category_id).all();
  if (!results.length) {
    return [{
      id: String(product.id),
      name: product.name,
      price: product.price,
      sourcePrice: product.source_price || product.price,
      imageUrl: encodeAssetUrl(product.image_url || ''),
      stock: product.stock
    }];
  }
  return results.map((r) => ({
    id: String(r.id),
    name: r.name,
    price: r.price,
    sourcePrice: r.source_price || r.price,
    imageUrl: encodeAssetUrl(r.image_url || ''),
    stock: r.stock
  }));
}
