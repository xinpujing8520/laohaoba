const https = require('https');

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
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
        channel: 'accountboycom',
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
  const bases = [
    'https://api-web.accountboy.com',
    'https://api.accountboy.com',
    'https://common-server.accountboy.com'
  ];
  const paths = [
  ['/anon/top/goods/category/list', {}],
  ['/anon/goods/category/search', { classificationId: 3, page: 1, pageSize: 50, site: 'accountBoy' }],
  ['/anon/goods/explore', { classificationId: 3, page: 1, pageSize: 50 }],
  ['/anon/goods/recommend/explore', { classificationId: 3, page: 1, pageSize: 50 }],
  ['/anon/user/top/goods/category/list', { classificationId: 3 }]
  ];
  for (const base of bases) {
    for (const [path, body] of paths) {
      const r = await request('POST', base + path, body);
      const preview = r.body.slice(0, 250).replace(/\s+/g, ' ');
      console.log(base.replace('https://', ''), path, '->', r.status, preview);
    }
  }
})();
