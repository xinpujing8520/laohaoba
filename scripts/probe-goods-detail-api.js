const https = require('https');

function get(url, q) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    if (q) u.search = new URLSearchParams(q).toString();
    https.get(u, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Origin: 'https://www.accountboy.com',
        Referer: 'https://www.accountboy.com/',
        site: 'accountBoy'
      }
    }, (res) => {
      let out = '';
      res.on('data', (c) => { out += c; });
      res.on('end', () => resolve(out));
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
  const apis = [
    ['https://api-web.kardz.cn/seo/goods/anon/get/by/goodsid/and/sp', { goodsId: 1578288578, sp: 'accountBoy' }],
    ['https://api-web.kardz.cn/seo/goods/anon/get/by/goodsid/and/sp', { goodsId: 1578288578, site: 'accountBoy' }],
    ['https://api-web.kardz.cn/anon/gameLibrary/info/get/by/id', { id: 1578282037, site: 'accountBoy' }]
  ];
  for (const [url, q] of apis) {
    const body = await get(url, q);
    console.log(url.split('.cn')[1], q, body.slice(0, 300));
  }

  const html = await get('https://www.accountboy.com/zh-cn-cny/buy-pinterest');
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  const g = props[Object.keys(props).find((k) => k.startsWith('static-props'))].goodsDetail;
  console.log('h5Detail len', g.cols?.h5Detail?.length);
})();
