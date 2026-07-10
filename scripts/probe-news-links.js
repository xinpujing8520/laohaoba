const https = require('https');
const fs = require('fs');
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'zh-CN' } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}
(async () => {
  const html = await get('https://www.accountboy.com/zh-cn-usd/news');
  fs.writeFileSync('scripts/ab-news.html', html);
  const links = [...new Set([...html.matchAll(/href="([^"]*news[^"]*)"/g)].map((m) => m[1]))];
  console.log('news links', links.slice(0, 20));
  const apis = [...new Set([...html.matchAll(/api-web[^"']+/g)].map((m) => m[0]))];
  console.log('apis', apis.slice(0, 10));
})();
