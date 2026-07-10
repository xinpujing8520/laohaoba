const https = require('https');
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
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
  const pages = [
    'https://www.accountboy.com/zh-cn-cny/news',
    'https://www.accountboy.com/zh-cn-cny/news-2',
    'https://www.accountboy.com/zh-cn-cny/news-26'
  ];
  for (const url of pages) {
    const html = await get(url);
    const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
    const key = Object.keys(props).find((k) => k.startsWith('static-props'));
    const data = props[key];
    const nl = data.newsList;
    console.log(url, 'pageNo', data.pageNo, 'current', nl.currentPage, 'total', nl.totalPages, 'first', nl.data[0].id);
  }
})();
