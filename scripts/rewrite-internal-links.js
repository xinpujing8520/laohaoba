const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');

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
    chatai: ['chatgpt', 'chatai'],
    tg: ['telegram', 'tg'],
    tk: ['tiktok', 'tk'],
    x: ['twitter', 'x'],
    ytb: ['youtube', 'ytb'],
    fb: ['facebook', 'fb'],
    'apple-id': ['apple-id', 'appleid'],
    instagram: ['instagram'],
    gmail: ['gmail'],
    google: ['google']
  };
  for (const [shortEn, productId] of [...map.entries()]) {
    const list = aliases[shortEn] || [shortEn];
    list.forEach((a) => map.set(String(a).toLowerCase(), productId));
  }
  return map;
}

function rewriteHtmlLinks(html, buyMap) {
  if (!html || typeof html !== 'string') return html;
  let s = html;

  // news detail -> article
  s = s.replace(
    /https?:\/\/(?:www\.)?accountboy\.com\/zh-cn-[a-z]+\/news-detail\/(\d+)/gi,
    '/article.html?id=$1'
  );
  s = s.replace(/\/zh-cn-[a-z]+\/news-detail\/(\d+)/gi, '/article.html?id=$1');

  // buy pages -> goods
  s = s.replace(
    /https?:\/\/(?:www\.)?accountboy\.com\/zh-cn-[a-z]+\/buy-([^"'\s?#]+)/gi,
    (_, slug) => {
      const key = decodeURIComponent(slug).toLowerCase();
      const id = buyMap.get(key);
      return id ? `/goods.html?id=${id}` : '/';
    }
  );
  s = s.replace(/\/zh-cn-[a-z]+\/buy-([^"'\s?#]+)/gi, (_, slug) => {
    const key = decodeURIComponent(slug).toLowerCase();
    const id = buyMap.get(key);
    return id ? `/goods.html?id=${id}` : '/';
  });

  // news list
  s = s.replace(/https?:\/\/(?:www\.)?accountboy\.com\/zh-cn-[a-z]+\/news(-\d+)?/gi, '/news.html');
  s = s.replace(/\/zh-cn-[a-z]+\/news(-\d+)?/gi, '/news.html');

  // homepage
  s = s.replace(/https?:\/\/(?:www\.)?accountboy\.com\/?(?=["'\s>])/gi, '/');

  // internal links: drop target=_blank
  s = s.replace(/(<a\s[^>]*href="\/(?:article|goods|news)[^"]*"[^>]*)\s+target="_blank"/gi, '$1');
  s = s.replace(/(<a\s[^>]*href="\/(?:article|goods|news)[^"]*"[^>]*)\s+rel="noopener noreferrer"/gi, '$1');

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
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
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

(async () => {
  const buyMap = buildBuySlugMap();
  console.log(`Buy slug map: ${buyMap.size} entries`);

  let total = 0;
  total += processDir(path.join(PUBLIC, 'data', 'articles'), buyMap);
  total += processDir(path.join(PUBLIC, 'data', 'library-pages'), buyMap);
  total += processFile(path.join(PUBLIC, 'data', 'news-list.json'), buyMap);
  total += processFile(path.join(PUBLIC, 'data', 'home-content.json'), buyMap);

  console.log(`Rewrote internal links in ${total} files`);
})();
