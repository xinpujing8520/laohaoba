const https = require('https');
const fs = require('fs');

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
      res.on('end', () => resolve(JSON.parse(out)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

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
      res.on('end', () => resolve(JSON.parse(out)));
    }).on('error', reject);
  });
}

(async () => {
  const all = [];
  let page = 1;
  while (true) {
    const r = await post('https://api-web.kardz.cn/anon/goods/library/page', { page, pageSize: 100 });
    const rows = r.result?.data || [];
    all.push(...rows);
    if (page >= (r.result?.totalPages || 1)) break;
    page += 1;
  }
  console.log('total libraries', all.length);
  const byUrl = {};
  for (const item of all) {
    const k = item.urlIdentifier || 'unknown';
    byUrl[k] = (byUrl[k] || 0) + 1;
  }
  console.log('by urlIdentifier', byUrl);

  const tests = [
    ['GET', 'https://api-web.kardz.cn/anon/gameLibrary/info/get/by/id', { id: all[0].goodsLibraryId, site: 'accountBoy' }],
    ['GET', 'https://api-web.kardz.cn/api/goods/list/info/ext', { goodsLibraryId: all[0].goodsLibraryId, site: 'accountBoy' }],
    ['GET', 'https://api-web.kardz.cn/anon/goods/display/category/goodsCategoryId', { goodsLibraryId: all[0].goodsLibraryId, site: 'accountBoy' }],
    ['GET', 'https://api-web.kardz.cn/seo/goods/anon/get/by/goodsid/and/sp', { goodsId: all[0].defaultGoodsId || 1578286983, sp: 'accountBoy' }]
  ];
  for (const [method, url, q] of tests) {
    const r = await get(url, q);
    console.log('\n', method, url.split('.cn')[1], q);
    console.log(JSON.stringify(r).slice(0, 500));
  }

  fs.writeFileSync(__dirname + '/ab-libraries.json', JSON.stringify(all, null, 2));
})();
