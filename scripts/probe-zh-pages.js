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
  console.log('sample fields', Object.keys(g).filter((k) => /url|slug|short|en|path|forward/i.test(k)));
  console.log('shortEn', g.shortEn, 'english_name', g.english_name, 'aliasName', g.aliasName);

  const urls = [
    'https://www.accountboy.com/zh-cn-cny/',
    'https://www.accountboy.com/zh-cn-cny/apple-id',
    'https://www.accountboy.com/zh-cn-cny/social-media',
    'https://www.accountboy.com/zh-cn-cny/buy-apple-id-us'
  ];
  for (const url of urls) {
    const r = await get(url);
    const props2 = extractJson(r.html, 'window.__INIT_STATIC_PROPS__');
    const key = props2 && Object.keys(props2).find((k) => k.startsWith('static-props'));
    const data = key ? props2[key] : null;
    console.log('\n', url);
    console.log('  len', r.html.length, 'props', !!props2);
    if (data) {
      console.log('  keys', Object.keys(data).join(', '));
      console.log('  allGoodslist', data.allGoodslist?.length);
      console.log('  goodsPage', data.goodsPage?.list?.length);
    }
  }
})();
