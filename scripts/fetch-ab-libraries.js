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

(async () => {
  const all = [];
  let page = 1;
  while (true) {
    const r = await post('https://api-web.kardz.cn/anon/goods/library/page', { page, pageSize: 100 });
    const rows = r.result?.data || [];
    all.push(...rows);
    console.log('page', page, 'rows', rows.length, 'total', r.result?.totalRows);
    if (page >= (r.result?.totalPages || 1)) break;
    page += 1;
  }
  const byUrl = {};
  for (const item of all) byUrl[item.urlIdentifier || 'none'] = (byUrl[item.urlIdentifier || 'none'] || 0) + 1;
  console.log('by urlIdentifier', byUrl);
  fs.writeFileSync(__dirname + '/ab-libraries-accountboy.json', JSON.stringify(all, null, 2));
})();
