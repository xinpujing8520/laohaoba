const https = require('https');

function get(url, query) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    u.search = new URLSearchParams(query).toString();
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
      res.on('end', () => resolve({ status: res.statusCode, body: out }));
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0',
        Origin: 'https://www.accountboy.com',
        Referer: 'https://www.accountboy.com/',
        site: 'accountBoy'
      }
    }, (res) => {
      let out = '';
      res.on('data', (c) => { out += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: out }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  const lib = await post('https://api-web.kardz.cn/anon/goods/library/page', {
    site: 'accountBoy',
    path: 'accountBoy_3',
    page: 1,
    pageSize: 5
  });
  const item = JSON.parse(lib.body).result.data[0];
  console.log('library item', item);

  const tests = [
    ['GET', 'https://api-web.kardz.cn/api/goods/list/info/ext', { goodsLibraryId: item.goodsLibraryId }],
    ['GET', 'https://api-web.kardz.cn/api/goods/list/info/ext', { gameLibraryId: item.goodsLibraryId }],
    ['GET', 'https://api-web.kardz.cn/api/goods/list/info/ext', { libraryId: item.goodsLibraryId, site: 'accountBoy' }],
    ['GET', 'https://api-web.kardz.cn/anon/goods/library/category/goods', { site: 'accountBoy', goodsLibraryId: item.goodsLibraryId }],
    ['GET', 'https://api-web.kardz.cn/anon/goods/categories/byGoodsId', { goodsId: item.defaultGoodsId || item.goodsLibraryId, site: 'accountBoy' }],
    ['POST', 'https://api-web.kardz.cn/api/gameListByCategory', { goodsLibraryId: item.goodsLibraryId, site: 'accountBoy' }]
  ];

  for (const [method, url, q] of tests) {
    const r = method === 'GET' ? await get(url, q) : await post(url, q);
    console.log('\n', method, url.split('.cn')[1], q);
    console.log(r.status, r.body.slice(0, 600));
  }
})();
