/**
 * 从 www.zhanghaoya.com 抓取商品和分类数据，生成 seed.sql
 */
const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({
      hostname: u.hostname,
      path: u.pathname,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Charset': 'utf-8' }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); }
        catch (e) { reject(new Error(chunks.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function esc(s) {
  return (s || '').replace(/'/g, "''");
}

function parseCategories(html) {
  const map = new Map();
  const re = /onClickHandler\('([0-9a-f-]{36})',\s*'([^']+)'\)[\s\S]*?xlink:href="#(shop-[^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    map.set(m[1], { id: m[1], name: m[2], icon: m[3] });
  }
  return map;
}

async function main() {
  console.log('正在抓取首页分类...');
  const homeHtml = await get('https://www.zhanghaoya.com/');
  const catMap = parseCategories(homeHtml);
  console.log(`解析到 ${catMap.size} 个分类名称`);

  console.log('正在抓取商品数据...');
  const products = await post('https://www.zhanghaoya.com/product/search', {
    page: 1,
    pageSize: 9999,
    keyword: '',
    categoryId: ''
  });

  const list = Array.isArray(products) ? products : (products.value || products.data || []);
  console.log(`共抓取 ${list.length} 个商品`);

  const catCounts = new Map();
  for (const p of list) {
    if (!p.CategoryId) continue;
    catCounts.set(p.CategoryId, (catCounts.get(p.CategoryId) || 0) + 1);
    if (!catMap.has(p.CategoryId)) {
      catMap.set(p.CategoryId, {
        id: p.CategoryId,
        name: p.Icon ? p.Icon.replace('shop-', '').replace(/-/g, ' ') : p.CategoryId.slice(0, 8),
        icon: p.Icon || 'shop-default'
      });
    }
  }

  const lines = ['-- Auto-generated seed data', 'DELETE FROM products;', 'DELETE FROM categories;'];

  let sort = 0;
  for (const [id, cat] of catMap) {
    const count = catCounts.get(id) || 0;
    lines.push(`INSERT INTO categories (id, name, icon, product_count, sort_order) VALUES ('${esc(id)}', '${esc(cat.name)}', '${esc(cat.icon)}', ${count}, ${sort++});`);
  }

  for (const p of list) {
    const id = p.ID || p.LinkId;
    lines.push(`INSERT INTO products (id, name, price, stock, category_id, icon, min_buy, max_buy, is_on_sale, is_hot) VALUES ('${esc(id)}', '${esc(p.Name)}', ${p.Price || 0}, ${p.InStock || 0}, '${esc(p.CategoryId)}', '${esc(p.Icon || '')}', ${Math.max(1, p.MinBuy || 1)}, ${Math.max(1, p.MaxBuy || 100)}, ${p.IsOnSale ? 1 : 0}, ${p.IsHot ? 1 : 0});`);
  }

  const out = lines.join('\n');
  fs.writeFileSync(__dirname + '/seed.sql', out, 'utf8');
  fs.writeFileSync(__dirname + '/categories.json', JSON.stringify([...catMap.values()], null, 2), 'utf8');
  console.log(`已写入 scripts/seed.sql (${list.length} 商品, ${catMap.size} 分类)`);
}

main().catch(e => { console.error(e); process.exit(1); });
