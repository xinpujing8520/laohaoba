const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
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
  const urls = [
    'https://www.accountboy.com/apple-id',
    'https://www.accountboy.com/social-media',
    'https://www.accountboy.com/mail-account',
    'https://www.accountboy.com/ai-tools'
  ];
  for (const url of urls) {
    const { status, html } = await get(url);
    const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
    const key = props && Object.keys(props).find((k) => k.startsWith('static-props'));
    const d = key ? props[key] : null;
    console.log(url);
    console.log('  status', status, 'len', html.length);
    console.log('  key', key);
    console.log('  keys', d ? Object.keys(d).join(', ') : 'none');
    if (d?.allGoodslist) console.log('  allGoodslist', d.allGoodslist.length);
    if (d?.goodsPage?.list) console.log('  goodsPage', d.goodsPage.list.length);
    if (d?.goodsList) console.log('  goodsList', d.goodsList.length);
    if (d?.classificationList) console.log('  classificationList', d.classificationList.length);
    fs.writeFileSync(`scripts/ab-cat-${url.split('/').pop()}.html`, html.slice(0, 500000));
  }
})();
