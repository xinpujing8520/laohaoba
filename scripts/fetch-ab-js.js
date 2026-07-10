const https = require('https');
const fs = require('fs');
const path = require('path');

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
  const js = await get('https://static-kk.accountboy.com/static/js/account-boy-pc.732591dd.js');
  fs.writeFileSync(path.join(__dirname, 'ab-pc.js'), js);
  const patterns = [...js.matchAll(/["'`](\/[a-zA-Z0-9_\-/]+(?:goods|classification|category|game)[a-zA-Z0-9_\-/]*)["'`]/g)].map((m) => m[1]);
  const uniq = [...new Set(patterns)].slice(0, 80);
  console.log('paths', uniq.join('\n'));
})();
