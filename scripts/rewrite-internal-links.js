/**
 * Normalize article / product internal links to SEO paths.
 * - /goods.html?id=ab_xxx  → /goods/ab_xxx.html
 * - /article.html?id=123   → /article/123.html
 * - /news.html             → /news
 * - accountboy / fake domains → local paths
 * - absolute laohaoba.com goods/article → relative SEO paths
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');

function productUrl(id) {
  const pid = String(id || '').replace(/\.html$/i, '').trim();
  if (!pid) return '/';
  return '/goods/' + encodeURIComponent(pid) + '.html';
}

function articleUrl(id) {
  return '/article/' + encodeURIComponent(String(id)) + '.html';
}

function buildBuySlugMap() {
  const dir = path.join(PUBLIC, 'data', 'library-pages');
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json') || file === '_index.json') continue;
    const page = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const shortEn = String(page.shortEn || file.replace(/\.json$/, '')).trim();
    let productId = page.defaultGameId ? `ab_${page.defaultGameId}` : '';
    if (!productId) {
      const leaf = page.skuTree?.leaves?.[0];
      productId = leaf?.productId || '';
    }
    if (productId) map.set(shortEn.toLowerCase(), productId);
  }
  const aliases = {
    chatai: ['chatgpt', 'chatai', 'gpt'],
    tg: ['telegram', 'tg'],
    tk: ['tiktok', 'tk'],
    x: ['twitter', 'x'],
    ytb: ['youtube', 'ytb'],
    fb: ['facebook', 'fb'],
    'apple-id': ['apple-id', 'appleid', 'apple'],
    instagram: ['instagram', 'ins', 'ig'],
    gmail: ['gmail'],
    google: ['google'],
    wechat: ['wechat', 'weixin']
  };
  for (const [shortEn, productId] of [...map.entries()]) {
    const list = aliases[shortEn] || [shortEn];
    list.forEach((a) => map.set(String(a).toLowerCase(), productId));
  }
  return map;
}

function rewriteHref(href, buyMap) {
  if (!href || typeof href !== 'string') return href;
  let h = href.trim();

  // Fake / typo competitor domains (any subdomain) → salvage product/article or home
  if (/^https?:\/\/(?:[\w-]+\.)*(?:acceboy|accaboy|accboy|accountboy|zuhaohao)\./i.test(h)) {
    try {
      const u = new URL(h);
      const goodsId = (u.pathname + u.search).match(/[?&]id=([^&#]+)/i) || u.pathname.match(/\/goods\/([^/?#]+)/i);
      if (goodsId && /ab_/i.test(goodsId[1])) return productUrl(decodeURIComponent(goodsId[1]));
      const buy = u.pathname.match(/\/buy-([^/?#]+)/i);
      if (buy) {
        const id = buyMap.get(decodeURIComponent(buy[1]).toLowerCase());
        return id ? productUrl(id) : '/';
      }
      const newsDetail = u.pathname.match(/\/news-detail\/(\d+)/i);
      if (newsDetail) return articleUrl(newsDetail[1]);
      if (/\/news/i.test(u.pathname)) return '/news';
    } catch (_) {}
    return '/';
  }

  // Absolute laohaoba URLs → path
  h = h.replace(/^https?:\/\/(?:www\.)?laohaoba\.com/i, '');
  if (!h) return '/';

  // AccountBoy paths (relative leftovers)
  h = h.replace(/^\/zh-cn-[a-z]+\/news-detail\/(\d+)/i, (_, id) => articleUrl(id));
  h = h.replace(/^\/zh-cn-[a-z]+\/buy-([^/?#]+)/i, (_, slug) => {
    const id = buyMap.get(decodeURIComponent(slug).toLowerCase());
    return id ? productUrl(id) : '/';
  });
  h = h.replace(/^\/zh-cn-[a-z]+\/news(?:-\d+)?\/?$/i, '/news');

  // Query forms → SEO
  h = h.replace(/^\/goods\.html\?id=([^&#]+)/i, (_, id) => productUrl(decodeURIComponent(id)));
  h = h.replace(/^\/article\.html\?id=(\d+)/i, (_, id) => articleUrl(id));
  h = h.replace(/^\/news\.html(?:\?page=(\d+))?$/i, (_, p) => {
    const n = Number(p || 1);
    return n > 1 ? '/news/page-' + n : '/news';
  });

  // Already SEO-ish but missing .html
  h = h.replace(/^\/goods\/([^/?#]+?)(?:\.html)?$/i, (_, id) => productUrl(id));
  h = h.replace(/^\/article\/(\d+)(?:\.html)?$/i, (_, id) => articleUrl(id));

  return h;
}

function rewriteHtmlLinks(html, buyMap) {
  if (!html || typeof html !== 'string') return html;
  let s = html;

  // Full AccountBoy absolute URLs first
  s = s.replace(
    /https?:\/\/(?:www\.)?accountboy\.com\/zh-cn-[a-z]+\/news-detail\/(\d+)/gi,
    (_, id) => articleUrl(id)
  );
  s = s.replace(
    /https?:\/\/(?:www\.)?accountboy\.com\/zh-cn-[a-z]+\/buy-([^"'\s?#]+)/gi,
    (_, slug) => {
      const id = buyMap.get(decodeURIComponent(slug).toLowerCase());
      return id ? productUrl(id) : '/';
    }
  );
  s = s.replace(/https?:\/\/(?:www\.)?accountboy\.com\/zh-cn-[a-z]+\/news(?:-\d+)?/gi, '/news');
  s = s.replace(/https?:\/\/(?:www\.)?accountboy\.com\/?(?=["'\s>])/gi, '/');

  // Rewrite every href="..."
  s = s.replace(/href=(["'])([^"']+)\1/gi, (full, q, href) => {
    const next = rewriteHref(href, buyMap);
    return next === href ? full : `href=${q}${next}${q}`;
  });

  // Drop target=_blank on internal links
  s = s.replace(
    /(<a\s[^>]*href="\/(?:article|goods|news)[^"]*"[^>]*)\s+target="_blank"/gi,
    '$1'
  );
  s = s.replace(
    /(<a\s[^>]*href="\/(?:article|goods|news)[^"]*"[^>]*)\s+rel="noopener noreferrer"/gi,
    '$1'
  );

  return s;
}

function rewriteValue(val, buyMap) {
  if (typeof val === 'string') return rewriteHtmlLinks(val, buyMap);
  if (Array.isArray(val)) return val.map((v) => rewriteValue(v, buyMap));
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = rewriteValue(v, buyMap);
    return out;
  }
  return val;
}

function processDir(dir, buyMap) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const fp = path.join(dir, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {
      console.warn('skip bad json', file, e.message);
      continue;
    }
    const next = rewriteValue(data, buyMap);
    if (JSON.stringify(next) !== JSON.stringify(data)) {
      fs.writeFileSync(fp, JSON.stringify(next, null, 2), 'utf8');
      n++;
    }
  }
  return n;
}

function processFile(file, buyMap) {
  if (!fs.existsSync(file)) return 0;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const next = rewriteValue(data, buyMap);
  if (JSON.stringify(next) !== JSON.stringify(data)) {
    fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8');
    return 1;
  }
  return 0;
}

function main() {
  const buyMap = buildBuySlugMap();
  console.log(`Buy slug map: ${buyMap.size} entries`);

  let total = 0;
  total += processDir(path.join(PUBLIC, 'data', 'articles'), buyMap);
  total += processDir(path.join(PUBLIC, 'data', 'library-pages'), buyMap);
  total += processFile(path.join(PUBLIC, 'data', 'news-list.json'), buyMap);
  total += processFile(path.join(PUBLIC, 'data', 'home-content.json'), buyMap);

  console.log(`Rewrote internal links in ${total} files`);
  return total;
}

module.exports = {
  rewriteHtmlLinks,
  rewriteHref,
  productUrl,
  articleUrl,
  buildBuySlugMap,
  main
};

if (require.main === module) main();
