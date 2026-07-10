const https = require('https');
const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : require('http');
    mod.get(url, { headers: HEADERS }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        return get(next).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, html: Buffer.concat(chunks).toString('utf8') }));
    }).on('error', reject);
  });
}

(async () => {
  for (const [name, url] of [
    ['wxhpifa', 'https://www.wxhpifa.com/'],
    ['5yqqqq', 'https://www.5yqqqq.com/']
  ]) {
    const { status, html } = await get(url);
    fs.writeFileSync(path.join(__dirname, `${name}-home.html`), html, 'utf8');
    console.log(name, 'status', status, 'len', html.length);
    const buyLinks = [...html.matchAll(/href="([^"]*buy[^"]*)"/gi)].slice(0, 5);
    console.log('buy links', buyLinks.map((m) => m[1]));
    const goodsLinks = [...html.matchAll(/href="([^"]*goods[^"]*)"/gi)].slice(0, 5);
    console.log('goods links', goodsLinks.map((m) => m[1]));
    const rows = [...html.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)].length;
    console.log('tr count', rows);
  }
})();
