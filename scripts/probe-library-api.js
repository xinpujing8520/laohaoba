const https = require('https');

function request(method, url, query, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    if (query) u.search = new URLSearchParams(query).toString();
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        Origin: 'https://www.accountboy.com',
        Referer: 'https://www.accountboy.com/',
        site: 'accountBoy',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let out = '';
      res.on('data', (c) => { out += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: out }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const tests = [
    ['GET', 'https://api-web.kardz.cn/anon/goods/library/category/list', { site: 'accountBoy' }],
    ['GET', 'https://api-web.accountboy.com/anon/goods/library/category/list', { site: 'accountBoy' }],
    ['GET', 'https://api-web.kardz.cn/anon/goods/library/category/goods', { site: 'accountBoy', categoryId: 3 }],
    ['GET', 'https://api-web.kardz.cn/anon/goods/library/category/goods', { site: 'accountBoy', classificationId: 3 }],
    ['POST', 'https://api-web.kardz.cn/anon/goods/library/page', null, { site: 'accountBoy', page: 1, pageSize: 20 }],
    ['POST', 'https://api-web.kardz.cn/anon/goods/library/page', null, { site: 'accountBoy', classificationId: 3, page: 1, pageSize: 20 }],
    ['GET', 'https://api-web.kardz.cn/seo/goods/anon/get/by/goodsid/and/sp', { goodsId: 1578286983, site: 'accountBoy' }]
  ];
  for (const [method, url, query, body] of tests) {
    const r = await request(method, url, query, body);
    console.log('\n', method, url.replace('https://', ''), query || body);
    console.log(r.status, r.body.slice(0, 400));
  }
})();
