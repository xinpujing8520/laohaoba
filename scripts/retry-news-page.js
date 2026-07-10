/**
 * Retry a single news list page and merge into news-list.json
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { replaceBrand, walkStrings } = require('./replace-brand-text');
const { encodeAssetUrl } = require('./encode-asset-url');
const { cnyToUsdt } = require('./usdt-price');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(url, retries = 5) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }).on('error', (err) => {
        if (left > 1) setTimeout(() => attempt(left - 1), 1200);
        else reject(err);
      });
    };
    attempt(retries);
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

function mapItem(n) {
  const slug = String(n.shortEn || '');
  return {
    id: n.id,
    title: replaceBrand(n.title || ''),
    summary: replaceBrand(n.mark || ''),
    cover: encodeAssetUrl(n.coverImage || n.smallImage || ''),
    date: (n.publishTimeStr || n.publishTime || '').slice(0, 10),
    slug: slug === 'accountboy-access-notice' ? 'laohaoba-access-notice' : slug
  };
}

(async () => {
  const pageNo = parseInt(process.argv[2] || '18', 10);
  const url = pageNo <= 1
    ? 'https://www.accountboy.com/zh-cn-cny/news'
    : `https://www.accountboy.com/zh-cn-cny/news-${pageNo}`;

  await sleep(500);
  const html = await get(url);
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  if (!props) throw new Error('no static props on page ' + pageNo);
  const key = Object.keys(props).find((k) => k.startsWith('static-props'));
  const list = (props[key].newsList && props[key].newsList.data) || [];
  const mapped = list.map(mapItem);
  console.log('page', pageNo, 'got', mapped.length, 'items, ids:', mapped.map((x) => x.id).join(','));

  const listPath = path.join(__dirname, '..', 'public', 'data', 'news-list.json');
  const data = JSON.parse(fs.readFileSync(listPath, 'utf8'));
  const seen = new Set(data.items.map((x) => x.id));
  let added = 0;
  mapped.forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    data.items.push(item);
    added++;
  });
  data.items.sort((a, b) => b.id - a.id);
  data.total = data.items.length;
  data.pageSize = data.pageSize || 10;
  data.totalPages = Math.max(1, Math.ceil(data.items.length / data.pageSize));
  const out = walkStrings(data);
  fs.writeFileSync(listPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Merged +${added} -> total ${data.total} (${data.totalPages} pages)`);
})();
