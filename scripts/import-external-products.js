/**
 * Aggregate products from external sites and generate incremental SQL.
 * Sources:
 *  - https://facebooksecrets.com/
 *  - https://buffortune.com/ (via API)
 *  - https://www.wxhpifa.com/ (best effort)
 *  - https://www.5yqqqq.com/ (best effort)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function request(url, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        ...headers
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, text, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function esc(s) {
  return String(s || '').replace(/'/g, "''");
}

function hashId(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 24);
}

function cleanText(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberOrZero(v) {
  const n = Number(String(v || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function chooseIconByCategory(name) {
  const t = String(name || '').toLowerCase();
  if (t.includes('facebook') || t.includes('fb')) return 'shop-facebook';
  if (t.includes('wechat') || t.includes('微信')) return 'shop-whatsapp';
  if (t.includes('gmail') || t.includes('youtube')) return 'shop-google';
  if (t.includes('sms')) return 'shop-sms';
  return 'shop-other';
}

async function scrapeFacebookSecrets() {
  const { status, text } = await request('https://facebooksecrets.com/');
  if (status !== 200 || !text.includes('tab-pane')) {
    throw new Error(`facebooksecrets unavailable: HTTP ${status}`);
  }

  const categoryMap = new Map();
  const catRe = /<a href="#group-(\d+)"[^>]*class="tab-link"[\s\S]*?<span class="tab-title">\s*([\s\S]*?)\s*<\/span>/g;
  let m;
  while ((m = catRe.exec(text)) !== null) {
    const id = m[1];
    const name = cleanText(m[2]);
    if (name && name !== '全部') categoryMap.set(id, name);
  }

  const products = [];
  const paneRe = /<div class="tab-pane(?:\s+active)?"\s+id="group-(\d+)">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="tab-pane|<div class="tab-pane(?:\s+active)?"\s+id="group-(\d+)">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  // Easier: iterate by category and capture until next tab-pane marker
  for (const [catId, catName] of categoryMap) {
    const start = text.indexOf(`id="group-${catId}"`);
    if (start < 0) continue;
    const next = text.indexOf('id="group-', start + 1);
    const block = next > start ? text.slice(start, next) : text.slice(start);
    const itemRe = /<a href="([^"]+)" class="home-card category[^"]*"[\s\S]*?<p class="name">\s*([\s\S]*?)\s*<\/p>[\s\S]*?<div class="price">\s*<b>\s*([\d.]+)\s*<\/b>/g;
    let x;
    while ((x = itemRe.exec(block)) !== null) {
      const link = x[1];
      const name = cleanText(x[2]);
      const price = numberOrZero(x[3]);
      if (!name || price <= 0) continue;
      const rawId = `${catId}:${link}:${name}:${price}`;
      products.push({
        source: 'facebooksecrets',
        categoryName: catName,
        categoryKey: `facebooksecrets:${catId}`,
        name,
        price,
        stock: 9999,
        sourceId: hashId(rawId)
      });
    }
  }

  return products;
}

async function scrapeBuffortune() {
  const base = 'https://api.buffortune.com/api/v1';
  const cRes = await request(`${base}/product/categories?status=1&have_products=true&limit=100`);
  if (cRes.status !== 200) throw new Error(`buffortune categories HTTP ${cRes.status}`);
  const catJson = JSON.parse(cRes.text);
  const categories = catJson?.data?.categories || [];

  const out = [];
  for (const cat of categories) {
    const categoryId = cat.id;
    const categoryName = cat.name || 'Buffortune';
    let page = 1;
    let totalPages = 1;
    do {
      const url = `${base}/product/products?status=1&stock_classified=true&limit=100&page=${page}&category_id=${encodeURIComponent(categoryId)}`;
      const pRes = await request(url);
      if (pRes.status !== 200) break;
      const pJson = JSON.parse(pRes.text);
      const items = pJson?.data?.products || [];
      const meta = pJson?.data?.meta || {};
      totalPages = Number(meta.total_pages || 1);

      for (const p of items) {
        const name = cleanText(p.name || '');
        if (!name) continue;
        const price = Number(p?.prices?.normal || p.price || 0);
        if (!Number.isFinite(price) || price <= 0) continue;
        out.push({
          source: 'buffortune',
          categoryName,
          categoryKey: `buffortune:${categoryId}`,
          name,
          price,
          stock: Number.isFinite(Number(p.total_stock)) ? Number(p.total_stock) : 9999,
          sourceId: p.id || hashId(`${categoryId}:${name}:${price}`)
        });
      }
      page += 1;
    } while (page <= totalPages);
  }
  return out;
}

async function scrapeBlockedBestEffort(siteName, url) {
  const { status, text } = await request(url);
  if (text.includes('Click to continue') || text.includes('正在加载中') || text.includes('sec_defend')) {
    console.warn(`[skip] ${siteName} blocked by anti-bot challenge`);
    return [];
  }
  if (text.includes('无法访问本站')) {
    console.warn(`[skip] ${siteName} blocked by locale/browser restriction`);
    return [];
  }
  console.warn(`[skip] ${siteName} unsupported HTML format`);
  return [];
}

function buildSql(products) {
  const categories = new Map();
  const productLines = [];
  for (const p of products) {
    const catId = `extcat_${hashId(p.categoryKey)}`;
    const prodId = `extprd_${hashId(`${p.source}:${p.sourceId}`)}`;
    const cat = categories.get(catId) || {
      id: catId,
      name: p.categoryName,
      icon: chooseIconByCategory(p.categoryName),
      count: 0
    };
    cat.count += 1;
    categories.set(catId, cat);

    productLines.push(
      `INSERT INTO products (id, name, price, stock, category_id, icon, min_buy, max_buy, is_on_sale, is_hot, sort_order) ` +
      `VALUES ('${esc(prodId)}', '${esc(p.name)}', ${p.price.toFixed(2)}, ${Math.max(0, Math.floor(p.stock || 0))}, '${esc(catId)}', '${esc(cat.icon)}', 1, 100, 1, 0, 999) ` +
      `ON CONFLICT(id) DO UPDATE SET name=excluded.name, price=excluded.price, stock=excluded.stock, category_id=excluded.category_id, icon=excluded.icon, is_on_sale=1;`
    );
  }

  const categoryLines = Array.from(categories.values()).map((c, idx) =>
    `INSERT INTO categories (id, name, icon, product_count, sort_order) VALUES ('${esc(c.id)}', '${esc(c.name)}', '${esc(c.icon)}', ${c.count}, ${500 + idx}) ` +
    `ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon, product_count=excluded.product_count;`
  );

  return [
    '-- Auto-generated external import SQL',
    ...categoryLines,
    ...productLines
  ].join('\n');
}

async function main() {
  const all = [];

  try {
    const fb = await scrapeFacebookSecrets();
    console.log(`[facebooksecrets] ${fb.length} products`);
    all.push(...fb);
  } catch (e) {
    console.warn('[facebooksecrets] failed:', e.message);
  }

  try {
    const bf = await scrapeBuffortune();
    console.log(`[buffortune] ${bf.length} products`);
    all.push(...bf);
  } catch (e) {
    console.warn('[buffortune] failed:', e.message);
  }

  const wx = await scrapeBlockedBestEffort('wxhpifa', 'https://www.wxhpifa.com/');
  const y5 = await scrapeBlockedBestEffort('5yqqqq', 'https://www.5yqqqq.com/');
  all.push(...wx, ...y5);

  const unique = [];
  const seen = new Set();
  for (const p of all) {
    const key = `${p.source}|${p.categoryKey}|${p.name}|${p.price.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }

  const sql = buildSql(unique);
  const outFile = path.join(__dirname, 'seed-external.sql');
  fs.writeFileSync(outFile, sql, 'utf8');
  console.log(`Generated ${outFile}`);
  console.log(`Total products prepared: ${unique.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
