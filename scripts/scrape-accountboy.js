/**
 * Scrape accountboy.com catalog into seed-accountboy.sql for laohaoba D1.
 * Sources: homepage SSR (SKU details) + library/category API (categories + product groups).
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { cnyToUsdt, getUsdtCnyRate } = require('./usdt-price');
const { encodeAssetUrl } = require('./encode-asset-url');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/json',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Origin: 'https://www.accountboy.com',
  Referer: 'https://www.accountboy.com/',
  site: 'accountBoy'
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(url, query) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    if (query) u.search = new URLSearchParams(query).toString();
    https.get(u, { headers: HEADERS }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function esc(s) {
  return String(s || '').replace(/'/g, "''");
}

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

function mapIcon(name, urlIdentifier) {
  const t = `${name} ${urlIdentifier || ''}`.toLowerCase();
  if (t.includes('facebook') || t.includes('fb') || t.includes('脸书')) return 'shop-facebook';
  if (t.includes('telegram') || t.includes('电报')) return 'shop-telegram';
  if (t.includes('google') || t.includes('gmail') || t.includes('gemini') || t.includes('谷歌')) return 'shop-google';
  if (t.includes('apple') || t.includes('苹果') || t.includes('itunes')) return 'shop-apple';
  if (t.includes('twitter') || t.includes('推特') || t === 'x') return 'shop-twitter-circle-fill';
  if (t.includes('instagram') || t.includes('ins')) return 'shop-Instagram';
  if (t.includes('tiktok') || t.includes('tk')) return 'shop-tiktok';
  if (t.includes('discord')) return 'shop-discord';
  if (t.includes('youtube') || t.includes('油管')) return 'shop-youtube';
  if (t.includes('netflix') || t.includes('奈飞')) return 'shop-netflix-icon';
  if (t.includes('steam')) return 'shop-steam';
  if (t.includes('whatsapp')) return 'shop-whatsapp';
  if (t.includes('line')) return 'shop-line';
  if (t.includes('microsoft') || t.includes('outlook')) return 'shop-microsoft';
  if (t.includes('chatgpt') || t.includes('openai') || t.includes('claude') || t.includes('cursor') || t.includes('ai')) return 'shop-SVG';
  if (t.includes('sms') || t.includes('接码') || t.includes('手机卡')) return 'shop-sms';
  if (t.includes('gift') || t.includes('礼品')) return 'shop-apple';
  if (t.includes('amazon')) return 'shop-amazon-circle-fill';
  return 'shop-other';
}

function parsePrice(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseCategoryPath(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] || null;
  const s = String(val).trim();
  if (!s) return null;
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr[0] : null;
    } catch {
      return null;
    }
  }
  if (s.startsWith('accountBoy_')) return s;
  const slugMap = {
    'gift-cards': 'accountBoy_10',
    'apple-id': 'accountBoy_2',
    'social-media': 'accountBoy_3',
    'mail-account': 'accountBoy_4',
    'streaming-media': 'accountBoy_5',
    'office-and-learning': 'accountBoy_6',
    'ai-tools': 'accountBoy_7',
    'system-tools': 'accountBoy_8',
    'game-account': 'accountBoy_9',
    'sim-cards': 'accountBoy_63'
  };
  return slugMap[s] || null;
}

function guessPathByText(text) {
  const t = String(text || '').toLowerCase();
  if (/apple|苹果|itunes|shadowrocket|quantumult|小火箭|圈x/.test(t)) return 'accountBoy_2';
  if (/gmail|邮箱|mail|outlook|yahoo|雅虎|proton/.test(t)) return 'accountBoy_4';
  if (/netflix|youtube|hbo|spotify|迪士尼|奈飞|影音/.test(t)) return 'accountBoy_5';
  if (/office|duolingo|gamma|process on|办公|学习/.test(t)) return 'accountBoy_6';
  if (/chatgpt|gemini|claude|grok|sora|suno|cursor|colab|ai/.test(t)) return 'accountBoy_7';
  if (/windows|系统|vpn/.test(t)) return 'accountBoy_8';
  if (/steam|game|游戏|epic|暴雪|战网/.test(t)) return 'accountBoy_9';
  if (/礼品|gift|mycard|充值卡|itunes卡/.test(t)) return 'accountBoy_10';
  if (/手机卡|sim|接码/.test(t)) return 'accountBoy_63';
  if (/telegram|facebook|fb|twitter|推特|tiktok|ins|discord|linkedin|社交|pinterest|twitch/.test(t)) return 'accountBoy_3';
  return 'accountBoy_3';
}

function buildDisplayName(g) {
  const sku = String(g.skuName || '').trim();
  const base = String(g.product_name || g.name || '').trim();
  if (!sku || sku === base) return base;
  if (sku.includes('|')) return sku;
  return `${base} | ${sku}`;
}

function skuPriceCny(g) {
  // AccountBoy USDT display price lives in alone.price — do not use lowestPrice/price.
  return parsePrice(g.alone?.price ?? g.independ_price);
}

function libraryPriceCny(lib, skus) {
  const skuPrices = (skus || [])
    .map((g) => parsePrice(g.alone?.price ?? g.independ_price))
    .filter((n) => n > 0);
  if (skuPrices.length) return Math.min(...skuPrices);
  return parsePrice(lib.lowestPrice ?? lib.price);
}

function pickImage(g, lib) {
  return encodeAssetUrl(g.list_img || g.icon || lib?.image || '');
}

function skuPrice(g) {
  return cnyToUsdt(skuPriceCny(g));
}

async function fetchLibrariesForPath(catPath) {
  const items = [];
  let page = 1;
  while (true) {
    const res = await postJson('https://api-web.kardz.cn/anon/goods/library/page', {
      site: 'accountBoy',
      path: catPath,
      page,
      pageSize: 100
    });
    const rows = res.result?.data || [];
    items.push(...rows);
    if (page >= (res.result?.totalPages || 1)) break;
    page += 1;
    await sleep(120);
  }
  return items;
}

function walkSkuLeaves(node, pathParts, out) {
  if (!node || typeof node !== 'object') return;
  if (node.gameId && node.isLeaf) {
    const priceCny = parsePrice(node.alone?.price ?? node.alonePrice);
    if (priceCny <= 0) return;
    out.push({
      gameId: node.gameId,
      name: pathParts.join(' | ') || node.productName || '',
      productName: node.productName || '',
      priceCny,
      imageUrl: node.listImg || ''
    });
    return;
  }
  if (node.subSku?.skuMap) {
    for (const [k, v] of Object.entries(node.subSku.skuMap)) {
      walkSkuLeaves(v, [...pathParts, k], out);
    }
  }
}

function extractBuyPageData(html) {
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  if (!props) return null;
  const data = props[Object.keys(props).find((k) => k.startsWith('static-props'))];
  if (!data?.goodsDetail) return null;
  const tree = data.goodsDetail.hasSkuTree;
  if (!tree?.skuMap) return null;
  const leaves = [];
  for (const [catName, catNode] of Object.entries(tree.skuMap)) {
    walkSkuLeaves(catNode, [catName], leaves);
  }
  return { goodsDetail: data.goodsDetail, leaves };
}

async function fetchBuyPageSkus(shortEn) {
  const slug = encodeURIComponent(String(shortEn).trim());
  if (!slug) return null;
  try {
    const html = await get(`https://www.accountboy.com/zh-cn-cny/buy-${slug}`);
    return extractBuyPageData(html);
  } catch (e) {
    console.warn(`buy-${shortEn} failed: ${e.message}`);
    return null;
  }
}

function buildLibraryMeta(staticData) {
  const cardNames = {
    '推特账号': 'X',
    'Telegram账号': 'Telegram',
    'TikTok账号': 'TikTok',
    '谷歌id': 'Google ID',
    'Instagram账号': 'Instagram',
    'Facebook账号': 'Facebook',
    '奈飞Netflix': 'Netflix'
  };
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

function goodsListToCard(g, cat, idx, cardNames) {
  const names = cardNames || {};
  return {
    ID: `ab_${g.lowestPriceGoodsId || g.id}`,
    LinkId: `ab_${g.lowestPriceGoodsId || g.id}`,
    Name: String(g.product_name || '').trim(),
    DisplayName: names[g.gameLibraryName] || g.gameLibraryName || String(g.product_name || '').trim(),
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

function productToCard(p, libraryMeta, idx) {
  const meta = libraryMeta.get(p.shortEn) || {};
  const displayName = meta.displayName || String(p.name || '').split(' | ')[0].trim() || p.name;
  return {
    ID: p.id,
    LinkId: p.id,
    Name: p.name,
    DisplayName: displayName,
    Price: p.price,
    IconUrl: meta.iconUrl || p.imageUrl,
    CoverImg: meta.coverImg || p.imageUrl,
    ImageUrl: p.imageUrl,
    Tag: meta.tag || '平台账号',
    CategoryName: p.categoryName,
    Icon: p.icon,
    ShortEn: p.shortEn,
    sortOrder: idx
  };
}

function getDisplayCardIdsToSkip(staticData) {
  const skip = new Set();
  for (const cat of staticData.categoriesWithGoods || []) {
    for (const g of Object.values(cat.goodsList || {})) {
      const ref = String(g.lowestPriceGoodsId || '');
      const id = String(g.id || '');
      if (ref && ref !== id) skip.add(id);
    }
  }
  return skip;
}

function collectExpandedSkus(homeSkus, staticData) {
  const map = new Map();
  for (const g of homeSkus) map.set(String(g.id), g);
  for (const cat of staticData.categoriesWithGoods || []) {
    for (const g of Object.values(cat.goodsList || {})) {
      if (!map.has(String(g.id))) {
        map.set(String(g.id), { ...g, accountBoyCategory: cat.path });
      }
      const ref = String(g.lowestPriceGoodsId || '');
      if (ref && ref !== String(g.id) && !map.has(ref)) {
        map.set(ref, {
          ...g,
          id: Number(ref),
          skuName: g.skuName || '',
          product_name: g.product_name,
          alone: { price: g.lowestPrice ?? g.alone?.price ?? g.price },
          lowestPrice: g.lowestPrice,
          price: g.lowestPrice ?? g.price,
          list_img: g.list_img,
          shortEn: g.shortEn,
          gameLibraryId: g.gameLibraryId,
          sale_num: Number(g.sale_num) || 0,
          accountBoyCategory: cat.path,
          goodsCategoryName: cat.name
        });
      }
    }
  }
  return [...map.values()];
}

async function main() {
  console.log(`USDT pricing: AB display / ${getUsdtCnyRate()} = settlement USDT`);
  console.log('Fetching accountboy.com homepage SSR...');
  const html = await get('https://www.accountboy.com/');
  fs.writeFileSync(path.join(__dirname, 'ab-home.html'), html);

  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  const propsKey = Object.keys(props || {}).find((k) => k.startsWith('static-props'));
  const staticData = props?.[propsKey] || {};
  const homeSkus = staticData.allGoodslist || [];
  const skuList = collectExpandedSkus(homeSkus, staticData);
  const skipCardIds = getDisplayCardIdsToSkip(staticData);
  console.log(`Homepage SKUs: ${homeSkus.length}, expanded: ${skuList.length}, skip display cards: ${skipCardIds.size}`);

  console.log('Fetching category tree...');
  const catRes = JSON.parse(await get('https://api-web.kardz.cn/anon/goods/library/category/list', { site: 'accountBoy' }));
  const root = catRes.result || {};
  const categories = (root.children || []).filter((c) => c.name !== '推荐');
  console.log(`Categories: ${categories.length}`);

  const pathToCat = new Map();
  for (const c of categories) {
    pathToCat.set(c.path, c);
    for (const ch of c.children || []) pathToCat.set(ch.path, ch);
  }

  const libraries = [];
  for (const cat of categories) {
    console.log(`Fetching libraries: ${cat.name} (${cat.path})...`);
    const rows = await fetchLibrariesForPath(cat.path);
    for (const row of rows) libraries.push({ ...row, _catPath: cat.path, _catId: cat.id });
    for (const ch of cat.children || []) {
      const subRows = await fetchLibrariesForPath(ch.path);
      for (const row of subRows) libraries.push({ ...row, _catPath: ch.path, _catId: ch.id });
    }
    await sleep(150);
  }

  const libraryById = new Map();
  for (const lib of libraries) libraryById.set(String(lib.goodsLibraryId), lib);

  const skusByLibrary = new Map();
  for (const g of skuList) {
    const lid = String(g.gameLibraryId || '');
    if (!lid) continue;
    if (!skusByLibrary.has(lid)) skusByLibrary.set(lid, []);
    skusByLibrary.get(lid).push(g);
  }

  const products = new Map();

  function addProduct(rec) {
    if (!rec.id || !rec.name || rec.price <= 0) return;
    products.set(rec.id, rec);
  }

  for (const g of skuList) {
    if (skipCardIds.has(String(g.id))) continue;
    const catPath = parseCategoryPath(g.accountBoyCategory) || guessPathByText(`${g.product_name} ${g.goodsCategoryName} ${g.tag || ''}`);
    const cat = pathToCat.get(catPath) || categories.find((c) => c.path === catPath);
    const catId = cat ? `ab_cat_${cat.id}` : `ab_cat_${catPath.replace('accountBoy_', '')}`;
    const lib = libraryById.get(String(g.gameLibraryId));
    const price = skuPrice(g);
    const sourceCny = parsePrice(g.source_price || g.cost_price) || Math.ceil(skuPriceCny(g) / 0.8);
    const sourcePrice = cnyToUsdt(sourceCny > skuPriceCny(g) ? sourceCny : skuPriceCny(g));
    addProduct({
      id: `ab_${g.id}`,
      name: buildDisplayName(g),
      price,
      sourcePrice: sourcePrice > price ? sourcePrice : price,
      stock: 99,
      categoryId: catId,
      categoryName: cat?.name || '',
      icon: mapIcon(g.product_name, lib?.shortEn || cat?.urlIdentifier || ''),
      imageUrl: pickImage(g, lib),
      shortEn: g.shortEn || '',
      description: String(g.introduction || g.gameDesc || g.goodsCategoryName || g.product_name || '').trim(),
      isHot: !!(g.newHotGame || Number(g.sale_num) >= 1000),
      sortKey: Number(g.sale_num) || 0
    });
  }

  for (const lib of libraryById.values()) {
    const lid = String(lib.goodsLibraryId);
    if (skusByLibrary.has(lid)) continue;
    const libSkus = skuList.filter((g) => String(g.gameLibraryId) === lid);
    const priceCny = libraryPriceCny(lib, libSkus);
    const price = cnyToUsdt(priceCny);
    if (price <= 0) continue;
    const cat = pathToCat.get(lib._catPath) || categories.find((c) => c.id === lib._catId);
    const catId = cat ? `ab_cat_${cat.id}` : `ab_cat_3`;
    const coverSku = libSkus.find((g) => g.list_img) || libSkus[0];
    addProduct({
      id: `ab_lib_${lid}`,
      name: String(lib.name || '').trim(),
      price,
      sourcePrice: cnyToUsdt(Math.ceil(priceCny / 0.8)),
      stock: 99,
      categoryId: catId,
      categoryName: cat?.name || '',
      icon: mapIcon(lib.name, lib.shortEn || cat?.urlIdentifier || ''),
      imageUrl: encodeAssetUrl(coverSku?.list_img || lib.image || ''),
      shortEn: lib.shortEn || '',
      description: String(lib.name || '').trim(),
      isHot: Number(lib.sales) >= 500,
      sortKey: Number(lib.sales) || 0
    });
  }

  const shortEnToLib = new Map();
  for (const lib of libraries) {
    if (lib.shortEn) shortEnToLib.set(lib.shortEn, lib);
  }
  for (const cat of staticData.categoriesWithGoods || []) {
    for (const g of Object.values(cat.goodsList || {})) {
      if (!g.shortEn || shortEnToLib.has(g.shortEn)) continue;
      shortEnToLib.set(g.shortEn, {
        shortEn: g.shortEn,
        name: g.product_name,
        _catPath: cat.path,
        _catId: cat.id,
        image: g.list_img
      });
    }
  }

  const buyPageShortEns = [...shortEnToLib.keys()];
  console.log(`Fetching buy pages for ${buyPageShortEns.length} product libraries...`);
  let buySkuCount = 0;
  for (let i = 0; i < buyPageShortEns.length; i++) {
    const shortEn = buyPageShortEns[i];
    const lib = shortEnToLib.get(shortEn);
    const page = await fetchBuyPageSkus(shortEn);
    if (!page?.leaves?.length) {
      await sleep(100);
      continue;
    }
    const cat = pathToCat.get(lib._catPath) || categories.find((c) => c.id === lib._catId);
    const catId = cat ? `ab_cat_${cat.id}` : `ab_cat_${String(lib._catPath || 'accountBoy_3').replace('accountBoy_', '')}`;
    const rootDetail = page.goodsDetail;
    for (const leaf of page.leaves) {
      const price = cnyToUsdt(leaf.priceCny);
      const sourcePrice = cnyToUsdt(Math.ceil(leaf.priceCny / 0.8));
      addProduct({
        id: `ab_${leaf.gameId}`,
        name: leaf.name,
        price,
        sourcePrice: sourcePrice > price ? sourcePrice : price,
        stock: 99,
        categoryId: catId,
        categoryName: cat?.name || '',
        icon: mapIcon(leaf.name, shortEn),
        imageUrl: encodeAssetUrl(leaf.imageUrl || rootDetail.list_img || lib.image || ''),
        shortEn,
        description: String(rootDetail.introduction || leaf.productName || lib.name || '').trim(),
        isHot: Number(rootDetail.sale_num) >= 500,
        sortKey: Number(rootDetail.sale_num) || 0
      });
      buySkuCount += 1;
    }
    if ((i + 1) % 25 === 0) {
      console.log(`  buy pages ${i + 1}/${buyPageShortEns.length}, SKU leaves ${buySkuCount}`);
    }
    await sleep(120);
  }
  console.log(`Buy page SKU leaves: ${buySkuCount}`);

  const productList = [...products.values()].sort((a, b) => b.sortKey - a.sortKey);
  console.log(`Final products: ${productList.length}`);

  const categoryDisplay = {};
  const libraryMeta = buildLibraryMeta(staticData);
  const cardNames = {
    '推特账号': 'X',
    'Telegram账号': 'Telegram',
    'TikTok账号': 'TikTok',
    '谷歌id': 'Google ID',
    'Instagram账号': 'Instagram',
    'Facebook账号': 'Facebook',
    '奈飞Netflix': 'Netflix'
  };
  for (const cat of staticData.categoriesWithGoods || []) {
    const catId = `ab_cat_${cat.id}`;
    const skusInCat = productList.filter((p) => p.categoryId === catId);
    const goodsArr = Object.values(cat.goodsList || {});
    if (goodsArr.length >= 6 && skusInCat.length > goodsArr.length) {
      const libIds = new Set(goodsArr.map((g) => String(g.gameLibraryId || '')));
      categoryDisplay[catId] = goodsArr
        .map((g, idx) => goodsListToCard(g, cat, idx, cardNames))
        .filter((c) => c.Price > 0);
      const extras = skusInCat
        .filter((p) => p.id.startsWith('ab_lib_') && !libIds.has(p.id.replace(/^ab_lib_/, '')))
        .map((p, idx) => productToCard(p, libraryMeta, goodsArr.length + idx));
      categoryDisplay[catId] = [...categoryDisplay[catId], ...extras];
    } else {
      categoryDisplay[catId] = skusInCat.map((p, idx) => productToCard(p, libraryMeta, idx));
    }
  }

  const publicDataDir = path.join(__dirname, '..', 'public', 'data');
  fs.mkdirSync(publicDataDir, { recursive: true });
  fs.writeFileSync(
    path.join(publicDataDir, 'category-display.json'),
    JSON.stringify(categoryDisplay, null, 2),
    'utf8'
  );
  console.log(`Wrote category-display.json (${Object.keys(categoryDisplay).length} categories)`);

  const hotMod = (staticData.recommend2Config || []).find((r) => r.title === '热门商品');
  if (hotMod) {
    const hotList = Array.isArray(hotMod.goodsList) ? hotMod.goodsList : Object.values(hotMod.goodsList || {});
    const hotNames = {
      '推特账号': 'X',
      'Telegram账号': 'Telegram',
      'TikTok账号': 'TikTok',
      '谷歌id': 'Google ID',
      'Instagram账号': 'Instagram',
      'Facebook账号': 'Facebook',
      '奈飞Netflix': 'Netflix'
    };
    const hotProducts = {
      bg: hotMod.bg || '',
      title: hotMod.title || '热门商品',
      desc: hotMod.desc || '平台最受欢迎产品',
      products: hotList.map((g, idx) => ({
        ID: `ab_${g.lowestPriceGoodsId || g.id}`,
        LinkId: `ab_${g.lowestPriceGoodsId || g.id}`,
        Name: hotNames[g.gameLibraryName] || g.gameLibraryName || g.product_name,
        Price: cnyToUsdt(g.lowestPrice ?? g.alone?.price ?? 0),
        IconUrl: encodeAssetUrl(g.goodsIcon || g.icon || ''),
        CoverImg: encodeAssetUrl(g.h5LongPic || g.list_img || ''),
        Tag: String(g.accountTypes || '平台账号').replace(/,/g, ', '),
        ShortEn: g.shortEn || '',
        sortOrder: idx
      })).filter((p) => p.Price > 0)
    };
    fs.writeFileSync(path.join(publicDataDir, 'hot-products.json'), JSON.stringify(hotProducts, null, 2), 'utf8');
    console.log(`Wrote hot-products.json (${hotProducts.products.length} items)`);
  }

  const lines = [
    '-- AccountBoy catalog import for laohaoba',
    'DELETE FROM products;',
    'DELETE FROM categories;'
  ];

  categories.forEach((cat, idx) => {
    const catId = `ab_cat_${cat.id}`;
    const count = productList.filter((p) => p.categoryId === catId).length;
    const icon = cat.icon && String(cat.icon).startsWith('http') ? cat.icon : mapIcon(cat.name, cat.urlIdentifier || '');
    lines.push(
      `INSERT INTO categories (id, name, icon, product_count, sort_order) VALUES (` +
      `'${esc(catId)}', '${esc(cat.name)}', '${esc(icon)}', ${count}, ${idx});`
    );
  });

  productList.forEach((p, idx) => {
    lines.push(
      `INSERT INTO products (id, name, price, stock, category_id, icon, description, source_price, image_url, short_en, category_name, min_buy, max_buy, is_on_sale, is_hot, sort_order) VALUES (` +
      `'${esc(p.id)}', '${esc(p.name)}', ${p.price.toFixed(2)}, ${Math.floor(p.stock)}, '${esc(p.categoryId)}', '${esc(p.icon)}', '${esc(p.description)}', ${(p.sourcePrice || p.price).toFixed(2)}, '${esc(p.imageUrl)}', '${esc(p.shortEn)}', '${esc(p.categoryName)}', 1, 100, 1, ${p.isHot ? 1 : 0}, ${idx});`
    );
  });

  const out = path.join(__dirname, 'seed-accountboy.sql');
  fs.writeFileSync(out, lines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'accountboy-import-summary.json'), JSON.stringify({
    categories: categories.length,
    products: productList.length,
    skusFromHome: skuList.length,
    libraries: libraryById.size
  }, null, 2), 'utf8');
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
