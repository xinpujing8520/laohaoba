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
        channel: 'accountboycom'
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

(async () => {
  const url = 'https://api-web.accountboy.com/anon/goods/category/search';
  const tests = [
    { classificationId: 2, page: 1, pageSize: 5 },
    { classificationId: 3, page: 1, pageSize: 5 },
    { classificationId: 7, page: 1, pageSize: 5 },
    { urlIdentifier: 'apple-id', page: 1, pageSize: 5 },
    { urlIdentifier: 'social-media', page: 1, pageSize: 5 },
    { urlIdentifier: 'ai-tools', page: 1, pageSize: 5 },
    { path: 'accountBoy_3', page: 1, pageSize: 5 },
    { site: 'accountBoy', classificationId: 3, page: 1, pageSize: 5 },
    { categoryId: 3, page: 1, pageSize: 5 },
    { parentId: 1, classificationId: 3, page: 1, pageSize: 5 }
  ];
  for (const body of tests) {
    const r = await post(url, body);
    const names = (r.result?.data || []).map((x) => x.name || x.product_name).slice(0, 3);
    console.log(JSON.stringify(body), 'total', r.result?.totalRows, 'sample', names.join(' | '));
  }

  const all = await post(url, { page: 1, pageSize: 200 });
  fs.writeFileSync(__dirname + '/ab-api-sample.json', JSON.stringify(all, null, 2));
  console.log('saved sample, total', all.result?.totalRows);
})();
