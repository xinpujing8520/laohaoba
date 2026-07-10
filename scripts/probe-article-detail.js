const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
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
}

(async () => {
  const urls = [
    'https://www.accountboy.com/zh-cn-cny/information-detail/1401',
    'https://www.accountboy.com/zh-cn-cny/news-detail/1401',
    'https://www.accountboy.com/zh-cn-cny/news-detail/accountboy-access-notice',
    'https://www.accountboy.com/information-detail/1401.html'
  ];
  for (const url of urls) {
    const html = await get(url);
    const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
    console.log('\n', url);
    if (!props) { console.log(' no static props'); continue; }
    for (const [k, v] of Object.entries(props)) {
      if (!v) { console.log(k, 'null'); continue; }
      console.log(k, Object.keys(v).slice(0, 20));
      const info = v.informationDetail || v.newsDetail || v.detail || v.news;
      if (info) {
        console.log(' title', info.title);
        console.log(' content len', String(info.content || '').length);
        console.log(' sample', String(info.content || info.mark || '').slice(0, 200));
      }
    }
  }
})();
