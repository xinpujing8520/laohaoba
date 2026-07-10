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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
  const paths = [
    'accountBoy_2', 'accountBoy_3', 'accountBoy_4', 'accountBoy_5',
    'accountBoy_6', 'accountBoy_7', 'accountBoy_8', 'accountBoy_9',
    'accountBoy_10', 'accountBoy_63'
  ];
  for (const path of paths) {
    const tests = [
      { site: 'accountBoy', path, page: 1, pageSize: 100 },
      { site: 'accountBoy', categoryPath: path, page: 1, pageSize: 100 },
      { site: 'accountBoy', firstCategoryPath: path, page: 1, pageSize: 100 }
    ];
    for (const body of tests) {
      const r = await post('https://api-web.kardz.cn/anon/goods/library/page', body);
      const key = Object.keys(body).filter((k) => k !== 'site' && k !== 'page' && k !== 'pageSize').join(',');
      console.log(path, key, 'total', r.result?.totalRows, 'sample', (r.result?.data || []).slice(0, 2).map((x) => x.name));
    }
    console.log('---');
  }
})();
