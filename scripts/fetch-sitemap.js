const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  const xml = await get('https://www.accountboy.com/sitemap.xml');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const cats = locs.filter((u) => /apple-id|social-media|mail-account|ai-tools|gift-cards|sim-cards|streaming-media|game-account|office-and-learning|system-tools/.test(u));
  const buys = locs.filter((u) => /\/buy-/.test(u));
  console.log('total urls', locs.length, 'category-like', cats.length, 'buy pages', buys.length);
  console.log('sample cats', cats.slice(0, 15));
  console.log('sample buys', buys.slice(0, 10));
  fs.writeFileSync(__dirname + '/ab-sitemap-urls.txt', locs.join('\n'));
})();
