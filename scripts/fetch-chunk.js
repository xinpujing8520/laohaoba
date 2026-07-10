const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

(async () => {
  const js = await get('https://static-kk.accountboy.com/static/js/1355.59b5a112.js');
  fs.writeFileSync(__dirname + '/ab-chunk-1355.js', js);
  const hits = [];
  for (const m of js.matchAll(/["']([a-zA-Z][a-zA-Z0-9_/-]{3,60})["']/g)) {
    const s = m[1];
    if (/goods|classif|category|game|list|detail|accountBoy/i.test(s) && !/node_modules|webpack/.test(s)) {
      hits.push(s);
    }
  }
  console.log([...new Set(hits)].slice(0, 100).join('\n'));
})();
