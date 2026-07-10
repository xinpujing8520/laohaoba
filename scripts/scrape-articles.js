/**
 * Scrape AccountBoy news detail pages into public/data/articles/{id}.json
 * Source: public/data/news-list.json (run scrape-news-list.js first)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { replaceBrand, walkStrings } = require('./replace-brand-text');
const { encodeAssetUrl } = require('./encode-asset-url');

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
  throw new Error(`Failed to parse JSON for ${marker}`);
}

function parseDetail(html) {
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  if (!props) return null;
  const key = Object.keys(props).find((k) => k.startsWith('static-props'));
  const data = key ? props[key] : null;
  const detail = data && data.detail;
  if (!detail || !detail.title) return null;
  return detail;
}

function loadNewsItems() {
  const listPath = path.join(__dirname, '..', 'public', 'data', 'news-list.json');
  if (fs.existsSync(listPath)) {
    const list = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    return list.items || [];
  }
  const homePath = path.join(__dirname, '..', 'public', 'data', 'home-content.json');
  const home = JSON.parse(fs.readFileSync(homePath, 'utf8'));
  return home.news || [];
}

(async () => {
  const items = loadNewsItems();
  const outDir = path.join(__dirname, '..', 'public', 'data', 'articles');
  fs.mkdirSync(outDir, { recursive: true });
  const force = process.argv.includes('--force');

  let ok = 0;
  let skip = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = item.id;
    if (!id) continue;
    const outPath = path.join(outDir, `${id}.json`);
    if (!force && fs.existsSync(outPath)) {
      skip++;
      continue;
    }
    const url = `https://www.accountboy.com/zh-cn-cny/news-detail/${id}`;
    try {
      const html = await get(url);
      const detail = parseDetail(html);
      if (!detail) {
        console.warn('skip', id, 'no detail');
        continue;
      }
      const article = walkStrings({
        id,
        title: detail.title,
        summary: detail.mark || item.summary || '',
        cover: encodeAssetUrl(detail.coverImage || detail.smallImage || item.cover || ''),
        date: (detail.publishTime || item.date || '').slice(0, 10),
        content: detail.content || '',
        slug: item.slug || ''
      });
      fs.writeFileSync(outPath, JSON.stringify(article, null, 2), 'utf8');
      console.log(`[${i + 1}/${items.length}] ok`, id, article.title.slice(0, 36));
      ok++;
    } catch (e) {
      console.warn('fail', id, e.message);
    }
    await sleep(150);
  }
  console.log(`Done: ${ok} scraped, ${skip} skipped, ${items.length} total -> ${outDir}`);
})();
