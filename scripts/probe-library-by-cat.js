const https = require('https');

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

(async () => {
  for (const id of [2, 3, 4, 5, 6, 7, 8, 9, 10, 63]) {
    const r = await post('https://api-web.kardz.cn/anon/goods/library/page', {
      site: 'accountBoy',
      categoryId: id,
      page: 1,
      pageSize: 100
    });
    console.log('cat', id, 'total', r.result?.totalRows, 'sample', (r.result?.data || []).slice(0, 2).map((x) => x.name));
  }
})();
