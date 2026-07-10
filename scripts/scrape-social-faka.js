/**
 * Scrape wxhpifa.com (微信) + 5yqqqq.com (QQ) into 社交账号 (ab_cat_3).
 * Usage: node scripts/scrape-social-faka.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { fetchShop } = require('./lib/faka-fetch');
const { cnyToUsdt } = require('./usdt-price');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const CATEGORY_ID = 'ab_cat_3';
const CATEGORY_NAME = '社交账号';

const WECHAT_ICON = '/assets/images/social/wechat.png';
const QQ_ICON = '/assets/images/social/qq.png';

function esc(s) {
  return String(s || '').replace(/'/g, "''");
}

function cleanText(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseStock(text) {
  const t = cleanText(text);
  if (!t || t.includes('缺货')) return 0;
  const m = t.match(/(\d+)/);
  return m ? Number(m[1]) : 99;
}

function parsePrice(text) {
  const m = String(text || '').match(/([\d.]+)/);
  return m ? Number(m[1]) : 0;
}

function parseFakaProducts(html, source) {
  const products = [];
  let currentGroup = '全部商品';
  const rowRe = /<tr class="cid\d+">([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const row = m[1];
    const groupMatch = row.match(/<th[^>]*class="tableth1[^"]*"[^>]*>([\s\S]*?)<\/th>/);
    if (groupMatch) {
      currentGroup = cleanText(groupMatch[1]);
      continue;
    }
    const nameMatch = row.match(/<font size="3" title="([^"]*)">([\s\S]*?)<\/font>/);
    const priceMatch = row.match(/title="商品售价">([\s\S]*?)<\/font>/);
    const stockMatch = row.match(/title="商品库存">([\s\S]*?)<\/font>/);
    const buyMatch = row.match(/href="\.\/\?mod=buy&cid=(\d+)&tid=(\d+)"/);
    if (!nameMatch || !priceMatch || !buyMatch) continue;

    const name = cleanText(nameMatch[1] || nameMatch[2]);
    const cnyPrice = parsePrice(priceMatch[1]);
    const stock = parseStock(stockMatch && stockMatch[1]);
    const cid = buyMatch[1];
    const tid = buyMatch[2];
    if (!name || cnyPrice <= 0) continue;

    const prefix = source === 'wxhpifa' ? 'wxh' : 'qq5';
    products.push({
      source,
      id: `${prefix}_${cid}_${tid}`,
      name,
      group: currentGroup,
      cnyPrice,
      price: cnyToUsdt(cnyPrice),
      stock,
      cid,
      tid,
      shortEn: source === 'wxhpifa' ? 'wechat' : 'qq',
      imageUrl: source === 'wxhpifa' ? WECHAT_ICON : QQ_ICON,
      icon: 'shop-other'
    });
  }
  return products;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        file.close();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        return download(next, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    }).on('error', (e) => {
      file.close();
      reject(e);
    });
  });
}

async function ensureIcons() {
  const socialDir = path.join(PUBLIC, 'assets', 'images', 'social');
  fs.mkdirSync(socialDir, { recursive: true });
  const pairs = [
    ['https://www.wxhpifa.com/assets/img/logo.png', path.join(socialDir, 'wechat.png')],
    ['https://www.5yqqqq.com/assets/img/logo.png', path.join(socialDir, 'qq.png')]
  ];
  for (const [url, dest] of pairs) {
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 500) {
      try {
        await download(url, dest);
        console.log('Downloaded icon', path.basename(dest));
      } catch (e) {
        console.warn('Icon download failed:', url, e.message);
      }
    }
  }
}

function buildLibraryPage(shortEn, displayName, products, iconUrl) {
  const groups = [...new Set(products.map((p) => p.group))];
  const leaves = products.map((p) => ({
    name: p.name,
    gameId: Number(`${p.cid}${p.tid}`) || 0,
    productId: p.id,
    price: p.price,
    originalPrice: cnyToUsdt(p.cnyPrice * 1.15),
    badge: p.stock > 0 ? '' : '缺货',
    icon: '',
    description: p.stock > 0 ? '自动发货' : '暂时缺货',
    isRecharge: false,
    path: [p.group, p.name],
    rechargeFields: []
  }));

  const cheapest = products.filter((p) => p.stock > 0).sort((a, b) => a.price - b.price)[0]
    || products.sort((a, b) => a.price - b.price)[0];

  return {
    page: {
      shortEn,
      displayName,
      iconUrl,
      coverImg: iconUrl,
      categoryName: CATEGORY_NAME,
      categoryId: CATEGORY_ID,
      breadcrumb: [CATEGORY_NAME, displayName],
      defaultGameId: cheapest ? Number(`${cheapest.cid}${cheapest.tid}`) || 0 : 0,
      detailHtml: `<p><img src="${iconUrl}" alt="${displayName}"></p><p>${displayName}，平台自动发货，USDT TRC20 支付。</p><p>购买前请阅读商品说明，虚拟商品发货后不支持退款（账密问题除外）。</p>`,
      skuTree: {
        dimension1: '分类',
        dimension2: '商品',
        dimension3: '',
        leaves
      },
      relatedProducts: [],
      recommendNews: []
    },
    groups,
    cheapest
  };
}

function buildCategoryCard(product, displayName, shortEn, iconUrl, sortOrder) {
  return {
    ID: product.id,
    LinkId: product.id,
    Name: product.name,
    DisplayName: displayName,
    Price: product.price,
    IconUrl: iconUrl,
    CoverImg: iconUrl,
    ImageUrl: iconUrl,
    Tag: '平台账号',
    CategoryName: CATEGORY_NAME,
    Icon: 'shop-other',
    ShortEn: shortEn,
    sortOrder
  };
}

function buildSql(products) {
  const lines = [
    '-- External social account products (wxhpifa + 5yqqqq)',
    `-- Generated ${new Date().toISOString()}`
  ];
  for (const p of products) {
    lines.push(
      `INSERT INTO products (id, name, price, stock, category_id, icon, description, source_price, image_url, short_en, category_name, min_buy, max_buy, is_on_sale, is_hot, sort_order) VALUES (` +
      `'${esc(p.id)}', '${esc(p.name)}', ${p.price.toFixed(2)}, ${Math.max(0, Math.floor(p.stock))}, '${CATEGORY_ID}', '${esc(p.icon)}', '${esc(p.name)}', ${p.cnyPrice.toFixed(2)}, '${esc(p.imageUrl)}', '${esc(p.shortEn)}', '${esc(CATEGORY_NAME)}', 1, 100, ${p.stock > 0 ? 1 : 0}, 0, 900) ` +
      `ON CONFLICT(id) DO UPDATE SET name=excluded.name, price=excluded.price, stock=excluded.stock, category_id=excluded.category_id, image_url=excluded.image_url, short_en=excluded.short_en, category_name=excluded.category_name, source_price=excluded.source_price, is_on_sale=excluded.is_on_sale;`
    );
  }
  const total = products.length;
  lines.push(
    `UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = '${CATEGORY_ID}' AND is_on_sale = 1) WHERE id = '${CATEGORY_ID}';`
  );
  return { sql: lines.join('\n'), total };
}

async function main() {
  await ensureIcons();

  console.log('Fetching wxhpifa.com ...');
  const wxHtml = await fetchShop('https://www.wxhpifa.com/');
  console.log('Fetching 5yqqqq.com ...');
  const qqHtml = await fetchShop('https://www.5yqqqq.com/');

  const wechatProducts = parseFakaProducts(wxHtml, 'wxhpifa');
  const qqProducts = parseFakaProducts(qqHtml, '5yqqqq');
  const all = [...wechatProducts, ...qqProducts];

  if (!all.length) {
    throw new Error('No products parsed — anti-bot or HTML format changed');
  }

  console.log(`Parsed ${wechatProducts.length} WeChat + ${qqProducts.length} QQ products`);

  const wechatLib = buildLibraryPage('wechat', '微信账号', wechatProducts, WECHAT_ICON);
  const qqLib = buildLibraryPage('qq', 'QQ账号', qqProducts, QQ_ICON);

  const libDir = path.join(PUBLIC, 'data', 'library-pages');
  fs.mkdirSync(libDir, { recursive: true });
  fs.writeFileSync(path.join(libDir, 'wechat.json'), JSON.stringify(wechatLib.page, null, 2), 'utf8');
  fs.writeFileSync(path.join(libDir, 'qq.json'), JSON.stringify(qqLib.page, null, 2), 'utf8');
  console.log('Wrote library-pages/wechat.json and qq.json');

  const displayPath = path.join(PUBLIC, 'data', 'category-display.json');
  const display = JSON.parse(fs.readFileSync(displayPath, 'utf8'));
  const existing = display[CATEGORY_ID] || [];
  const withoutExternal = existing.filter((item) => {
    const id = String(item.ID || item.LinkId || '');
    return !id.startsWith('wxh_') && !id.startsWith('qq5_')
      && item.ShortEn !== 'wechat' && item.ShortEn !== 'qq';
  });

  const newCards = [];
  if (wechatLib.cheapest) {
    newCards.push(buildCategoryCard(wechatLib.cheapest, '微信账号', 'wechat', WECHAT_ICON, 0));
  }
  if (qqLib.cheapest) {
    newCards.push(buildCategoryCard(qqLib.cheapest, 'QQ账号', 'qq', QQ_ICON, 1));
  }

  const merged = [...newCards, ...withoutExternal].map((item, idx) => ({ ...item, sortOrder: idx }));
  display[CATEGORY_ID] = merged;
  fs.writeFileSync(displayPath, JSON.stringify(display, null, 2), 'utf8');
  console.log(`Updated category-display.json ab_cat_3 (${merged.length} cards, +${newCards.length} new)`);

  const { sql } = buildSql(all);
  const sqlPath = path.join(__dirname, 'seed-external-social.sql');
  fs.writeFileSync(sqlPath, sql, 'utf8');
  console.log(`Wrote ${sqlPath} (${all.length} products)`);

  fs.writeFileSync(path.join(__dirname, 'external-social-summary.json'), JSON.stringify({
    wechat: wechatProducts.length,
    qq: qqProducts.length,
    total: all.length,
    wechatGroups: wechatLib.groups.length,
    qqGroups: qqLib.groups.length
  }, null, 2), 'utf8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
