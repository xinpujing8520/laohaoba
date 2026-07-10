/**
 * Scrape AccountBoy /news listing (all pages) into public/data/news-list.json
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

function get(url, retries = 3) {
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
        if (left > 1) setTimeout(() => attempt(left - 1), 800);
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

function pageUrl(pageNo) {
  const base = 'https://www.accountboy.com/zh-cn-cny/news';
  return pageNo <= 1 ? base : `${base}-${pageNo}`;
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

function mapRelated(list) {
  return (list || []).map((g) => ({
    id: `ab_${g.goodsId}`,
    shortEn: g.shortEn || '',
    name: replaceBrand(g.goodsName || ''),
    icon: encodeAssetUrl(g.listImg || ''),
    price: cnyToUsdt(Number(g.lowestPrice) || 0)
  }));
}

(async () => {
  const html1 = await get(pageUrl(1));
  const props1 = extractJson(html1, 'window.__INIT_STATIC_PROPS__');
  const key1 = Object.keys(props1).find((k) => k.startsWith('static-props'));
  const data1 = props1[key1];
  const meta = data1.newsList || {};
  const totalPages = Number(meta.totalPages) || 1;
  const items = [];
  const seen = new Set();

  for (let p = 1; p <= totalPages; p++) {
    const html = p === 1 ? html1 : await get(pageUrl(p));
    const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
    if (!props) {
      console.warn('skip page', p, 'no props');
      continue;
    }
    const key = Object.keys(props).find((k) => k.startsWith('static-props'));
    const data = props[key];
    const list = (data.newsList && data.newsList.data) || [];
    list.forEach((n) => {
      if (!n.id || seen.has(n.id)) return;
      seen.add(n.id);
      items.push(mapItem(n));
    });
    console.log(`page ${p}/${totalPages}`, list.length, 'items, total', items.length);
    if (p < totalPages) await sleep(180);
  }

  const out = walkStrings({
    title: '新闻资讯',
    subtitle: '海外账号热门资讯一网打尽，热点头条每日高能放送！',
    total: items.length,
    pageSize: Number(meta.pageSize) || 10,
    totalPages: Math.max(1, Math.ceil(items.length / (Number(meta.pageSize) || 10))),
    relatedProducts: mapRelated(data1.informationRecommendGoods),
    items
  });

  const outPath = path.join(__dirname, '..', 'public', 'data', 'news-list.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${items.length} news items -> ${outPath}`);
})();
