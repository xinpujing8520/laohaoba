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
      res.on('end', () => resolve(JSON.parse(out)));
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
      res.on('end', () => resolve(JSON.parse(out)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getCats(node, out = []) {
  if (!node) return out;
  if (node.id && node.path) out.push(node);
  for (const ch of node.children || []) getCats(ch, out);
  return out;
}

(async () => {
  const cats = await get('https://api-web.kardz.cn/anon/goods/library/category/list', { site: 'accountBoy' });
  const flat = getCats(cats.result);
  console.log('flat categories', flat.length);
  let total = 0;
  for (const c of flat) {
    const r = await post('https://api-web.kardz.cn/anon/goods/library/page', {
      site: 'accountBoy',
      path: c.path,
      page: 1,
      pageSize: 200
    });
    total += r.result?.totalRows || 0;
    console.log(c.id, c.name, c.path, 'rows', r.result?.totalRows);
  }
  console.log('sum rows', total);
})();
