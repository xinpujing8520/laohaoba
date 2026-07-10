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
  const pageTests = [
    { categoryId: 2, page: 1, pageSize: 50 },
    { classificationId: 2, page: 1, pageSize: 50 },
    { libraryCategoryId: 2, page: 1, pageSize: 50 },
    { parentCategoryId: 2, page: 1, pageSize: 50 },
    { path: 'accountBoy_2', page: 1, pageSize: 50 },
    { categoryPath: 'accountBoy_2', page: 1, pageSize: 50 },
    { firstCategoryId: 2, page: 1, pageSize: 50 }
  ];
  for (const body of pageTests) {
    const r = await post('https://api-web.kardz.cn/anon/goods/library/page', body);
    console.log(body, 'total', r.result?.totalRows, 'sample', (r.result?.data || []).slice(0, 2).map((x) => x.name));
  }

  const getTests = [
    { site: 'accountBoy', categoryId: 2 },
    { site: 'accountBoy', libraryCategoryId: 2 },
    { site: 'accountBoy', classificationId: 2 },
    { site: 'accountBoy', path: 'accountBoy_2' },
    { site: 'accountBoy', firstCategoryId: 2 }
  ];
  for (const q of getTests) {
    const r = await get('https://api-web.kardz.cn/anon/goods/library/category/goods', q);
    console.log('GET', q, 'len', r.result?.length, 'sample', (r.result || []).slice(0, 2).map((x) => x.name || x.product_name));
  }

  const all = await post('https://api-web.kardz.cn/anon/goods/library/page', { page: 1, pageSize: 200 });
  fs.writeFileSync(__dirname + '/ab-library-all.json', JSON.stringify(all, null, 2));
  console.log('saved library all', all.result?.totalRows);
})();
