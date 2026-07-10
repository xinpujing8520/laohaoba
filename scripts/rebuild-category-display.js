/**
 * Rebuild category-display.json from cached ab-home.html (library cards with AB icons/gradients).
 */
const fs = require('fs');
const path = require('path');
const { cnyToUsdt } = require('./usdt-price');
const { encodeAssetUrl } = require('./encode-asset-url');

function extractJson(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const start = html.indexOf('{', idx);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error(`Failed to parse JSON for ${marker}`);
}

const cardNames = {
  '推特账号': 'X',
  'Telegram账号': 'Telegram',
  'TikTok账号': 'TikTok',
  '谷歌id': 'Google ID',
  'Instagram账号': 'Instagram',
  'Facebook账号': 'Facebook',
  '奈飞Netflix': 'Netflix'
};

function mapIcon(name, shortEn) {
  const t = `${name} ${shortEn || ''}`.toLowerCase();
  if (/chatgpt|openai|claude|cursor|ai|svg/.test(t)) return 'shop-SVG';
  if (/google|gemini|gmail/.test(t)) return 'shop-google';
  if (/telegram|tg/.test(t)) return 'shop-telegram';
  if (/facebook|fb/.test(t)) return 'shop-facebook';
  if (/tiktok|tk/.test(t)) return 'shop-tiktok';
  if (/instagram|ins/.test(t)) return 'shop-Instagram';
  if (/twitter|推特|x/.test(t)) return 'shop-twitter-circle-fill';
  if (/netflix|奈飞/.test(t)) return 'shop-netflix-icon';
  if (/apple|苹果/.test(t)) return 'shop-apple';
  return 'shop-other';
}

function goodsListToCard(g, cat, idx) {
  return {
    ID: `ab_${g.lowestPriceGoodsId || g.id}`,
    LinkId: `ab_${g.lowestPriceGoodsId || g.id}`,
    Name: String(g.product_name || '').trim(),
    DisplayName: cardNames[g.gameLibraryName] || g.gameLibraryName || String(g.product_name || '').trim(),
    Price: cnyToUsdt(g.lowestPrice ?? g.alone?.price ?? 0),
    IconUrl: encodeAssetUrl(g.goodsIcon || g.icon || ''),
    CoverImg: encodeAssetUrl(g.h5LongPic || g.list_img || ''),
    ImageUrl: encodeAssetUrl(g.list_img || ''),
    Tag: String(g.accountTypes || '平台账号').replace(/,/g, ', '),
    CategoryName: cat.name,
    Icon: mapIcon(g.product_name, g.shortEn || ''),
    ShortEn: g.shortEn || '',
    sortOrder: idx
  };
}

function buildLibraryMeta(staticData) {
  const map = new Map();
  function ingest(g) {
    const key = String(g.shortEn || g.gameLibraryId || '').trim();
    if (!key) return;
    map.set(key, {
      displayName: cardNames[g.gameLibraryName] || g.gameLibraryName || String(g.product_name || '').trim(),
      iconUrl: encodeAssetUrl(g.goodsIcon || g.icon || ''),
      coverImg: encodeAssetUrl(g.h5LongPic || g.list_img || ''),
      tag: String(g.accountTypes || '平台账号').replace(/,/g, ', ')
    });
  }
  for (const cat of staticData.categoriesWithGoods || []) {
    for (const g of Object.values(cat.goodsList || {})) ingest(g);
  }
  for (const mod of staticData.recommend2Config || []) {
    const list = Array.isArray(mod.goodsList) ? mod.goodsList : Object.values(mod.goodsList || {});
    for (const g of list) ingest(g);
  }
  return map;
}

const html = fs.readFileSync(path.join(__dirname, 'ab-home.html'), 'utf8');
const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
const staticData = props[Object.keys(props).find((k) => k.startsWith('static-props'))] || {};
const libraryMeta = buildLibraryMeta(staticData);

const existingPath = path.join(__dirname, '..', 'public', 'data', 'category-display.json');
let existing = {};
try {
  existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
} catch {
  existing = {};
}

const categoryDisplay = { ...existing };
for (const cat of staticData.categoriesWithGoods || []) {
  const catId = `ab_cat_${cat.id}`;
  const goodsArr = Object.values(cat.goodsList || {});
  if (goodsArr.length >= 6) {
    categoryDisplay[catId] = goodsArr
      .map((g, idx) => goodsListToCard(g, cat, idx))
      .filter((c) => c.Price > 0);
    continue;
  }
  if (Array.isArray(existing[catId])) {
    categoryDisplay[catId] = existing[catId].map((p, idx) => {
      const meta = libraryMeta.get(p.ShortEn) || {};
      return {
        ...p,
        DisplayName: p.DisplayName || meta.displayName || String(p.Name || '').split(' | ')[0],
        IconUrl: p.IconUrl || meta.iconUrl || p.ImageUrl,
        CoverImg: p.CoverImg || meta.coverImg || p.ImageUrl,
        Tag: p.Tag || meta.tag || '平台账号',
        sortOrder: idx
      };
    });
  }
}

const out = path.join(__dirname, '..', 'public', 'data', 'category-display.json');
fs.writeFileSync(out, JSON.stringify(categoryDisplay, null, 2), 'utf8');
console.log('Wrote', out);
console.log('ab_cat_7 sample', categoryDisplay.ab_cat_7?.[0]);
