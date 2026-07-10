/**
 * Scrape AccountBoy buy-{shortEn} pages into public/data/library-pages/{shortEn}.json
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { replaceBrand, walkStrings } = require('./replace-brand-text');
const { encodeAssetUrl } = require('./encode-asset-url');
const { cnyToUsdt } = require('./usdt-price');
const { buildSkuTree, rechargeFieldsForLeaf } = require('./lib/sku-tree');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }, (res) => {
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

function parseBuyPage(html) {
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  if (!props) return null;
  const data = props[Object.keys(props).find((k) => k.startsWith('static-props'))];
  if (!data?.goodsDetail) return null;
  return data;
}

function parseCols(gd) {
  if (!gd || !gd.cols) return {};
  if (typeof gd.cols === 'string') {
    try { return JSON.parse(gd.cols); } catch { return {}; }
  }
  return gd.cols;
}

function detailHtml(gd) {
  const cols = parseCols(gd);
  let html = String(
    cols.h5Detail || gd.game_desc || gd.introduction || gd.alone_desc || gd.gameDescLib || gd.goodsDetailForward || ''
  ).replace(/^<!--HTML-->/, '').trim();

  const detailPic = cols.h5DetailPic || '';
  if (detailPic && html.indexOf(detailPic) < 0) {
    html = `<p><img src="${encodeAssetUrl(detailPic)}" alt=""></p>${html}`;
  }

  const imgList = gd.detail_img || gd.goodsDetailImg || [];
  const imgs = imgList.map((x) => (typeof x === 'string' ? x : x.url)).filter(Boolean);
  const extraImgs = imgs.filter((u) => !html.includes(u));
  if (extraImgs.length) {
    const imgHtml = extraImgs.map((u) => `<p><img src="${encodeAssetUrl(u)}" alt=""></p>`).join('');
    html = html.length > 50 ? imgHtml + html : imgHtml + (html ? `<div>${html}</div>` : '');
  }

  return html;
}

function mapRelated(list) {
  return (list || []).map((g) => ({
    id: `ab_${g.id}`,
    gameId: g.id,
    shortEn: g.shortEn || '',
    name: replaceBrand(g.product_name || ''),
    categoryName: replaceBrand(g.goodsCategoryName || ''),
    icon: encodeAssetUrl(g.list_img || ''),
    cover: encodeAssetUrl(g.h5LongPic || g.list_img || ''),
    price: cnyToUsdt(g.alone?.price ?? g.price ?? 0)
  }));
}

function mapNews(list) {
  return (list || []).map((n) => ({
    id: n.id,
    title: replaceBrand(n.title || ''),
    cover: encodeAssetUrl(n.coverImage || n.smallImage || ''),
    date: (n.publishTime || '').slice(0, 10),
    summary: replaceBrand(n.mark || '')
  }));
}

function libraryDisplayName(gd, shortEn) {
  const names = { gemini: 'Gemini', chatai: 'ChatGPT', 'apple-id': '苹果ID' };
  if (names[shortEn]) return names[shortEn];
  const n = String(gd.product_name || '').trim();
  return n.split(/[（(]/)[0].trim() || shortEn;
}

async function scrapeOne(shortEn, meta) {
  const slug = encodeURIComponent(shortEn);
  const html = await get(`https://www.accountboy.com/zh-cn-cny/buy-${slug}`);
  const data = parseBuyPage(html);
  if (!data) return null;
  const gd = data.goodsDetail;
  const sku = buildSkuTree(gd.hasSkuTree);
  sku.leaves = sku.leaves.map((leaf) => ({
    ...leaf,
    rechargeFields: rechargeFieldsForLeaf(shortEn, leaf.path)
  }));
  const cat = (data.categoryInfo || []).find((c) => c.name) || {};
  return walkStrings({
    shortEn,
    displayName: meta?.displayName || libraryDisplayName(gd, shortEn),
    iconUrl: meta?.iconUrl || encodeAssetUrl(gd.list_img || ''),
    coverImg: meta?.coverImg || encodeAssetUrl(gd.h5LongPic || gd.list_img || ''),
    categoryName: replaceBrand(cat.name || meta?.categoryName || ''),
    categoryId: cat.id ? `ab_cat_${cat.id}` : meta?.categoryId || '',
    breadcrumb: [replaceBrand(cat.name || ''), libraryDisplayName(gd, shortEn)].filter(Boolean),
    defaultGameId: data.goodsId,
    detailHtml: detailHtml(gd),
    skuTree: sku,
    relatedProducts: mapRelated(data.relatedGoodsList),
    recommendNews: mapNews(data.recommendInformation)
  });
}

(async () => {
  const html = fs.existsSync(path.join(__dirname, 'ab-home.html'))
    ? fs.readFileSync(path.join(__dirname, 'ab-home.html'), 'utf8')
    : await get('https://www.accountboy.com/');
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  const staticData = props[Object.keys(props).find((k) => k.startsWith('static-props'))] || {};

  const shortEnMap = new Map();
  for (const cat of staticData.categoriesWithGoods || []) {
    for (const g of Object.values(cat.goodsList || {})) {
      const key = String(g.shortEn || '').trim();
      if (!key || shortEnMap.has(key)) continue;
      shortEnMap.set(key, {
        displayName: g.gameLibraryName || g.product_name,
        iconUrl: encodeAssetUrl(g.goodsIcon || g.icon || g.list_img || ''),
        coverImg: encodeAssetUrl(g.h5LongPic || g.list_img || ''),
        categoryName: cat.name,
        categoryId: `ab_cat_${cat.id}`
      });
    }
  }
  for (const mod of staticData.recommend2Config || []) {
    const list = Array.isArray(mod.goodsList) ? mod.goodsList : Object.values(mod.goodsList || {});
    for (const g of list) {
      const key = String(g.shortEn || '').trim();
      if (!key || shortEnMap.has(key)) continue;
      shortEnMap.set(key, {
        displayName: g.gameLibraryName || g.product_name,
        iconUrl: encodeAssetUrl(g.goodsIcon || g.icon || ''),
        coverImg: encodeAssetUrl(g.h5LongPic || g.list_img || '')
      });
    }
  }

  const outDir = path.join(__dirname, '..', 'public', 'data', 'library-pages');
  fs.mkdirSync(outDir, { recursive: true });
  const keys = [...shortEnMap.keys()];
  let ok = 0;
  for (let i = 0; i < keys.length; i++) {
    const shortEn = keys[i];
    try {
      const page = await scrapeOne(shortEn, shortEnMap.get(shortEn));
      if (!page || !page.skuTree?.leaves?.length) {
        console.warn('skip', shortEn, 'no leaves');
        continue;
      }
      fs.writeFileSync(path.join(outDir, `${shortEn}.json`), JSON.stringify(page, null, 2), 'utf8');
      console.log(`[${i + 1}/${keys.length}]`, shortEn, page.skuTree.leaves.length, 'leaves', page.relatedProducts.length, 'related');
      ok++;
    } catch (e) {
      console.warn('fail', shortEn, e.message);
    }
    await sleep(200);
  }
  fs.writeFileSync(path.join(outDir, '_index.json'), JSON.stringify(keys.filter((k) => fs.existsSync(path.join(outDir, `${k}.json`))), null, 2));
  console.log(`Done: ${ok} library pages -> ${outDir}`);
})();
