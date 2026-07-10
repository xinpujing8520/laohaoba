/**
 * Extract AccountBoy homepage news + reviews into public JSON.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { replaceBrand, walkStrings } = require('./replace-brand-text');

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

(async () => {
  let html = fs.existsSync(path.join(__dirname, 'ab-home.html'))
    ? fs.readFileSync(path.join(__dirname, 'ab-home.html'), 'utf8')
    : null;
  if (!html || !html.includes('commentList')) {
    html = await get('https://www.accountboy.com/');
    fs.writeFileSync(path.join(__dirname, 'ab-home.html'), html);
  }

  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  const d = props[Object.keys(props).find((k) => k.startsWith('static-props'))];

  const news = (d.news || []).map((n) => ({
    id: n.id,
    title: replaceBrand(n.title),
    summary: replaceBrand(n.mark || ''),
    cover: n.coverImage || n.smallImage || '',
    date: (n.publishTime || '').slice(0, 10),
    slug: (n.shortEn || '') === 'accountboy-access-notice' ? 'laohaoba-access-notice' : (n.shortEn || '')
  }));

  const reviews = (d.commentList || [])
    .sort((a, b) => Number(a.sort) - Number(b.sort))
    .map((c) => ({
      name: c.name,
      avatar: c.img || '',
      rate: Number(c.rate) || 5,
      date: c.time || '',
      content: replaceBrand(c.content || '')
    }));

  const banners = (d.recommendList || [])
    .sort((a, b) => Number(a.sort) - Number(b.sort))
    .map((b) => ({
      img: b.img || '',
      title: replaceBrand(b.title || ''),
      url: b.url || '',
      jump: b.jump || 'in'
    }));

  const out = walkStrings({ banners, news, reviews });
  const publicPath = path.join(__dirname, '..', 'public', 'data', 'home-content.json');
  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.writeFileSync(publicPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${publicPath} (${banners.length} banners, ${news.length} news, ${reviews.length} reviews)`);
})();
