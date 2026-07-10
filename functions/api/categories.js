import { json, cors } from './_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const preflight = cors(request);
  if (preflight) return preflight;

  if (request.method !== 'GET') {
    return json({ Code: 405, Message: 'Method not allowed' }, 405);
  }

  const { results } = await env.DB.prepare(`
    SELECT c.id, c.name, c.icon, c.sort_order, COUNT(p.id) AS product_count
    FROM categories c
    INNER JOIN products p ON p.category_id = c.id AND p.is_on_sale = 1
    GROUP BY c.id
    HAVING product_count > 0
    ORDER BY c.sort_order
  `).all();
  return json(results);
}
