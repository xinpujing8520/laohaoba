/**
 * Fetch AccountBoy product details for ALL products (by short_en mapping).
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { replaceBrand } = require('./replace-brand-text');
const { cnyToUsdt } = require('./usdt-price');
const { encodeAssetUrl } = require('./encode-asset-url');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'text/html',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Origin: 'https://www.accountboy.com',
  Referer: 'https://www.accountboy.com/'
};

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: HEADERS }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function extractJson(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const start = html.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  return null;
}

function esc(s) {
  return String(s || '').replace(/'/g, "''");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseProductsFromSeed(sql) {
  const products = [];
  const re = /INSERT INTO products[^;]+VALUES \('([^']+)', '((?:[^']|'')*)', ([0-9.]+), \d+, '[^']*', '[^']*', '((?:[^']|'')*)', ([0-9.]+), '((?:[^']|'')*)', '((?:[^']|'')*)', '((?:[^']|'')*)'/g;
  let m;
  while ((m = re.exec(sql))) {
    products.push({
      id: m[1].replace(/''/g, "'"),
      name: m[2].replace(/''/g, "'"),
      price: parseFloat(m[3]),
      description: m[4].replace(/''/g, "'"),
      sourcePrice: parseFloat(m[5]),
      imageUrl: m[6].replace(/''/g, "'"),
      shortEn: m[7].replace(/''/g, "'")
    });
  }
  return products;
}

function parseDetailFromHtml(html) {
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  if (!props) return null;
  const d = props[Object.keys(props).find((k) => k.startsWith('static-props'))];
  if (!d?.goodsDetail) return null;
  const g = d.goodsDetail;
  const cols = typeof g.cols === 'string' ? JSON.parse(g.cols) : (g.cols || {});
  const detailHtml = replaceBrand((cols.h5Detail || g.introduction || g.game_desc || '').replace(/^<!--HTML-->/, ''));
  const priceCny = parseFloat(g.alone?.price ?? g.independ_price ?? 0);
  const sourceCny = parseFloat(g.cost_price ?? g.source_price ?? 0);
  const price = cnyToUsdt(priceCny);
  const sourcePrice = cnyToUsdt(sourceCny > priceCny ? sourceCny : (priceCny > 0 ? Math.ceil(priceCny / 0.8) : 0));
  return {
    goodsId: g.id,
    name: g.product_name,
    detailHtml,
    imageUrl: encodeAssetUrl(g.list_img || cols.goodsIcon || ''),
    price,
    sourcePrice: sourcePrice > price ? sourcePrice : (price > 0 ? cnyToUsdt(Math.ceil(priceCny / 0.8)) : 0),
    shortEn: g.shortEn || ''
  };
}

function fallbackDetail(name, description, price, sourcePrice) {
  const src = sourcePrice > price ? sourcePrice : Math.round((price / 0.8) * 100) / 100;
  const html = replaceBrand(`<p><strong>一.商品介绍</strong></p><p>${description || name}</p><p><strong>二.使用说明</strong></p><p>购买后请在订单中心查看账号信息，收到后请及时修改密码。</p><p><strong>三.注意事项</strong></p><p>账号售出删档，购买后请尽快登录测试。若需大量批发请联系在线客服。</p>`);
  return { detailHtml: html, imageUrl: '', sourcePrice: src, price };
}

async function fetchDetailByShortEn(shortEn) {
  if (!shortEn) return null;
  const slug = String(shortEn).trim().replace(/^buy-/, '');
  const url = `https://www.accountboy.com/zh-cn-cny/buy-${encodeURIComponent(slug)}`;
  try {
    const html = await get(url);
    if (!html.includes('goodsDetail')) return null;
    return parseDetailFromHtml(html);
  } catch {
    return null;
  }
}

async function main() {
  const seedSql = fs.readFileSync(path.join(__dirname, 'seed-accountboy.sql'), 'utf8');
  const products = parseProductsFromSeed(seedSql);
  console.log(`Parsed ${products.length} products from seed`);

  const homeHtml = fs.existsSync(path.join(__dirname, 'ab-home.html'))
    ? fs.readFileSync(path.join(__dirname, 'ab-home.html'), 'utf8')
    : await get('https://www.accountboy.com/');
  const props = extractJson(homeHtml, 'window.__INIT_STATIC_PROPS__');
  const skuList = props?.[Object.keys(props).find((k) => k.startsWith('static-props'))]?.allGoodslist || [];
  const skuShortById = new Map(skuList.map((g) => [String(g.id), g.shortEn || '']));

  const uniqueShorts = [...new Set(products.map((p) => p.shortEn).filter(Boolean))];
  console.log(`Fetching ${uniqueShorts.length} unique short_en pages...`);

  const detailByShort = {};
  for (const shortEn of uniqueShorts) {
    console.log(`  buy-${shortEn}`);
    const detail = await fetchDetailByShortEn(shortEn);
    if (detail) detailByShort[shortEn] = detail;
    await sleep(180);
  }

  const updates = [];
  let withDetail = 0;
  let fallback = 0;

  for (const p of products) {
    let detail = p.shortEn ? detailByShort[p.shortEn] : null;
    if (!detail && p.id.startsWith('ab_') && !p.id.startsWith('ab_lib_')) {
      const gid = p.id.replace(/^ab_/, '');
      const altShort = skuShortById.get(gid);
      if (altShort) detail = detailByShort[altShort];
    }
    if (!detail || !detail.detailHtml) {
      detail = fallbackDetail(p.name, p.description, p.price, p.sourcePrice);
      fallback++;
    } else {
      withDetail++;
    }
    const imageUrl = detail.imageUrl || p.imageUrl || '';
    const sourcePrice = detail.sourcePrice || p.sourcePrice || p.price;
    const price = detail.price > 0 ? detail.price : p.price;
    updates.push(
      `UPDATE products SET price=${Number(price).toFixed(2)}, source_price=${Number(sourcePrice).toFixed(2)}, image_url='${esc(imageUrl)}', detail_html='${esc(detail.detailHtml)}', short_en='${esc(p.shortEn)}' WHERE id='${esc(p.id)}';`
    );
  }

  fs.writeFileSync(path.join(__dirname, 'update-product-details.sql'), updates.join('\n'), 'utf8');
  console.log(`Wrote ${updates.length} updates (${withDetail} from AccountBoy, ${fallback} fallback)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
