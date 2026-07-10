const https = require('https');

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
  const rt = await get('https://static-kk.accountboy.com/static/js/runtime.56cb3138.js');
  for (const id of [66503, 59254, 79143, 11734, 16031]) {
    const re = new RegExp(id + '===e\\?"static/js/"\\+e\\+"\\.([0-9a-f]+)\\.js"');
    const m = rt.match(re);
    console.log(id, m ? m[1] : 'not found');
  }
})();
