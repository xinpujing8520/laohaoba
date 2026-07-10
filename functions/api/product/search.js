import { json, cors, encodeAssetUrl } from '../_utils.js';

const STOP_WORDS = new Set(['会员', '账号', '商品', '购买', '代充', '安装包']);

function tokenizeKeyword(keyword) {
  const text = String(keyword || '').trim();
  if (!text) return [];

  const tokens = new Set();
  const chunks = text
    .replace(/[|｜,/\\+：:;；]+/g, ' ')
    .replace(/[（）()【】\[\]《》<>「」""'’]+/g, ' ')
    .split(/\s+/);

  for (const chunk of chunks) {
    const part = chunk.trim();
    if (!part) continue;
    if (part.length >= 2 && !STOP_WORDS.has(part)) tokens.add(part);

    const pieces = part.match(/[\u4e00-\u9fa5]{2,}|\d+天|\d+个月|\d+人|[A-Za-z][A-Za-z0-9+]*|HD/g);
    if (pieces) {
      for (const piece of pieces) {
        if (piece.length >= 2 && !STOP_WORDS.has(piece)) tokens.add(piece);
      }
    }
  }

  return [...tokens];
}

function searchScore(row, keyword, tokens) {
  const full = String(keyword || '').trim().toLowerCase();
  const name = String(row.name || '').toLowerCase();
  const desc = String(row.description || '').toLowerCase();
  const cat = String(row.category_name || '').toLowerCase();
  const hay = `${name} ${desc} ${cat}`;

  let score = 0;
  if (full && name.includes(full)) score += 200;
  else if (full && hay.includes(full)) score += 120;

  for (const token of tokens) {
    const t = token.toLowerCase();
    if (name.includes(t)) score += 30;
    else if (hay.includes(t)) score += 12;
  }

  if (row.is_hot) score += 5;
  return score;
}

export async function onRequest(context) {
  const { request, env } = context;
  const preflight = cors(request);
  if (preflight) return preflight;

  if (request.method !== 'POST') {
    return json({ Code: 405, Message: 'Method not allowed' }, 405);
  }

  const body = await request.json().catch(() => ({}));
  const { keyword = '', categoryId = '', page = 1, pageSize = 50 } = body;
  const offset = (page - 1) * pageSize;
  const trimmed = String(keyword || '').trim();
  const tokens = tokenizeKeyword(trimmed);

  let sql = 'SELECT * FROM products WHERE is_on_sale = 1';
  const params = [];

  if (categoryId) {
    sql += ' AND category_id = ?';
    params.push(categoryId);
  }

  if (trimmed) {
    if (tokens.length <= 1) {
      sql += ' AND (name LIKE ? OR description LIKE ? OR category_name LIKE ? OR short_en LIKE ?)';
      const like = `%${trimmed}%`;
      params.push(like, like, like, like);
    } else {
      const parts = tokens.map(() => '(name LIKE ? OR description LIKE ? OR category_name LIKE ? OR short_en LIKE ?)');
      sql += ` AND (${parts.join(' OR ')})`;
      for (const token of tokens) {
        const like = `%${token}%`;
        params.push(like, like, like, like);
      }
    }
  }

  sql += ' ORDER BY is_hot DESC, sort_order ASC, price ASC';

  const { results } = await env.DB.prepare(sql).bind(...params).all();
  let rows = results;

  if (trimmed && tokens.length > 1) {
    rows = [...rows].sort((a, b) => searchScore(b, trimmed, tokens) - searchScore(a, trimmed, tokens));
  }

  const paged = rows.slice(offset, offset + pageSize);
  const items = paged.map((r) => ({
    ID: String(r.id),
    LinkId: String(r.id),
    Name: r.name,
    Price: r.price,
    InStock: r.stock,
    CategoryId: r.category_id,
    CategoryName: r.category_name || '',
    ShortEn: r.short_en || '',
    Icon: r.icon,
    ImageUrl: encodeAssetUrl(r.image_url || ''),
    MinBuy: r.min_buy,
    MaxBuy: r.max_buy,
    IsOnSale: !!r.is_on_sale,
    IsHot: !!r.is_hot
  }));

  return json(items);
}
