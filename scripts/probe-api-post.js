const fs = require('fs');
const https = require('https');

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0',
        Origin: 'https://www.accountboy.com',
        Referer: 'https://www.accountboy.com/'
      }
    }, (res) => {
      let out = '';
      res.on('data', (c) => { out += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: out.slice(0, 800) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Origin: 'https://www.accountboy.com',
        Referer: 'https://www.accountboy.com/'
      }
    }, (res) => {
      let out = '';
      res.on('data', (c) => { out += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: out.slice(0, 800) }));
    }).on('error', reject);
  });
}

(async () => {
  const tests = [
    ['GET', 'https://common-server.accountboy.com/classification/list?site=accountBoy'],
    ['GET', 'https://api-web.accountboy.com/classification/list?site=accountBoy'],
    ['POST', 'https://api-web.accountboy.com/game/list', { classificationId: 3, page: 1, pageSize: 50, site: 'accountBoy' }],
    ['POST', 'https://api-web.accountboy.com/goods/page', { classificationId: 3, page: 1, pageSize: 50 }],
    ['POST', 'https://api.accountboy.com/game/list', { classificationId: 3, page: 1, pageSize: 50 }],
    ['POST', 'https://common-server.accountboy.com/game/list', { classificationId: 3, page: 1, pageSize: 50 }],
    ['POST', 'https://api-web.accountboy.com/accountBoy/goods/list', { classificationId: 3, page: 1, pageSize: 50 }]
  ];
  for (const [method, url, body] of tests) {
    const r = method === 'GET' ? await get(url) : await post(url, body);
    console.log(method, url.replace('https://', ''));
    console.log(' ', r.status, r.body.slice(0, 200));
  }
})();
