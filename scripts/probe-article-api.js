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
        site: 'accountBoy',
        Referer: 'https://www.accountboy.com/'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', site: 'accountBoy' }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

(async () => {
  const gid = 1578295901;
  const tries = [
    ['GET', `https://api-web.kardz.cn/proxy/recharge/order/template/message/list?goodsId=${gid}`],
    ['GET', `https://api-web.kardz.cn/anon/proxy/recharge/merchant/order/message/list?goodsId=${gid}`],
    ['POST', 'https://api-web.kardz.cn/proxy/recharge/order/template/message/list', { goodsId: gid }],
    ['POST', 'https://api-web.kardz.cn/anon/proxy/recharge/merchant/order/message/list', { goodsId: gid, skuId: 60596 }],
    ['GET', `https://api-web.kardz.cn/anon/mobile/recharge/field/word/col/list/v1?goodsId=${gid}&skuId=60596`]
  ];
  for (const [method, url, body] of tries) {
    const res = method === 'GET' ? await get(url) : await post(url, body);
    if (res.includes('登录') || res.includes('api') || res.includes('ChatGPT') || (res.includes('"success":true') && res.length > 400)) {
      console.log('\n', method, url);
      console.log(res.slice(0, 2000));
    }
  }
})();
