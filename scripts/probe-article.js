const https = require('https');
function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, url, body: Buffer.concat(chunks).toString('utf8').slice(0, 500) }));
    }).on('error', reject);
  });
}
(async () => {
  const urls = [
    'https://www.accountboy.com/article/1401.html',
    'https://www.accountboy.com/zh-cn-cny/article/1401',
    'https://www.accountboy.com/zh-cn-cny/article/accountboy-access-notice',
    'https://api.accountboy.com/cms/article/1401',
    'https://www.accountboy.com/api/cms/article?id=1401'
  ];
  for (const u of urls) {
    const r = await get(u);
    console.log(r.status, u, r.body.includes('404') ? 'HAS_404' : 'OK', r.body.slice(0, 120).replace(/\s+/g, ' '));
  }
})();
