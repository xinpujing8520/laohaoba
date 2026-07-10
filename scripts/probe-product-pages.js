const fs = require('fs');
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
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
  const html = fs.readFileSync(__dirname + '/ab-home.html', 'utf8');
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  const d = props[Object.keys(props).find((k) => k.startsWith('static-props'))];
  const g = d.allGoodslist[0];
  const urls = [
    `https://www.accountboy.com/goods/${g.id}`,
    `https://www.accountboy.com/detail/${g.id}`,
    `https://www.accountboy.com/${g.id}`,
    `https://www.accountboy.com/product/${g.id}`,
    g.goodsDetailForward ? `https://www.accountboy.com${g.goodsDetailForward}` : null
  ].filter(Boolean);
  for (const url of urls) {
    const r = await get(url);
    const hasProps = r.html.includes('__INIT_STATIC_PROPS__');
    const hasDetail = r.html.includes('gameDesc') || r.html.includes('introduction');
    console.log(url, 'status', r.status, 'len', r.html.length, 'props', hasProps, 'detail', hasDetail);
  }
  console.log('goodsDetailForward sample', d.allGoodslist.slice(0, 3).map((x) => x.goodsDetailForward));
})();
