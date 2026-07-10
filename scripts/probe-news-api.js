const https = require('https');
const fs = require('fs');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        site: 'accountBoy',
        Referer: 'https://www.accountboy.com/'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
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

function parseNewsPage(html) {
  const idx = html.indexOf('window.__INIT_STATIC_PROPS__');
  if (idx < 0) return null;
  const start = html.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  return null;
}

(async () => {
  const urls = [
    'https://www.accountboy.com/zh-cn-usd/news/2',
    'https://www.accountboy.com/zh-cn-cny/news/2',
    'https://www.accountboy.com/zh-cn-usd/news?pageNo=2',
    'https://www.accountboy.com/zh-cn-usd/news?page=2',
    'https://www.accountboy.com/zh-cn-usd/news-2',
    'https://www.accountboy.com/zh-cn-usd/news/index/2'
  ];
  for (const url of urls) {
    const html = await get(url);
    const props = parseNewsPage(html);
    if (!props) {
      console.log(url, 'NO_PROPS', html.length);
      continue;
    }
    const key = Object.keys(props).find((k) => k.startsWith('static-props'));
    const nl = props[key].newsList;
    console.log(url, 'pageNo', props[key].pageNo, 'current', nl.currentPage, 'first', nl.data[0].id);
  }

  const js = fs.readFileSync('scripts/ab-36455.a4bfa2cf.js', 'utf8');
  const apis = [...new Set([...js.matchAll(/anon\/[a-zA-Z0-9/_-]*information[a-zA-Z0-9/_-]*/g)].map((m) => m[0]))];
  console.log('\nAPI paths:', apis);

  const bodies = [
    { currentPage: 2, pageSize: 10, languageCode: 'zh' },
    { pageNo: 2, pageSize: 10, languageCode: 'zh' },
    { currentPage: 2, pageSize: 10, site: 'accountBoy' }
  ];
  for (const body of bodies) {
    const res = await post('https://api-web.kardz.cn/anon/information/list', body);
    if (res.includes('"success":true')) {
      console.log('\nlist ok', body, res.slice(0, 400));
    }
  }
})();
