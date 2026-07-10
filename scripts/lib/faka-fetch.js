/**
 * Bypass sec_defend cookie and fetch faka shop pages
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HEADERS_BASE = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function get(url, cookie = '') {
  return new Promise((resolve, reject) => {
    const headers = { ...HEADERS_BASE };
    if (cookie) headers.Cookie = cookie;
    https.get(url, { headers }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        return get(next, cookie).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function runSecDefend(html) {
  const m = html.match(/function setCookie[\s\S]*?else window\.location\.reload\(\);/);
  if (!m) return null;
  const cookies = {};
  const sandbox = {
    document: {
      get cookie() {
        return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
      },
      set cookie(val) {
        const part = String(val).split(';')[0];
        const i = part.indexOf('=');
        if (i > 0) cookies[part.slice(0, i).trim()] = part.slice(i + 1).trim();
      }
    },
    window: {
      location: {
        href: '',
        reload() {}
      }
    },
    escape, unescape, RegExp, Date, parseInt, Array, Object, String, Number
  };
  vm.createContext(sandbox);
  vm.runInContext(m[0], sandbox);
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function fetchShop(baseUrl) {
  const root = baseUrl.replace(/\/$/, '');
  let home = await get(baseUrl);
  let cookie = runSecDefend(home) || '';
  if (home.includes('sec_defend')) {
    home = await get(baseUrl, cookie);
    cookie = runSecDefend(home) || cookie;
  }
  let page = await get(`${root}/index.php`, cookie);
  if (page.includes('sec_defend') && page.length < 8000) {
    cookie = runSecDefend(page) || cookie;
    page = await get(`${root}/index.php`, cookie);
  }
  return page;
}

if (require.main === module) {
  (async () => {
    for (const [name, url] of [
      ['wxhpifa', 'https://www.wxhpifa.com/'],
      ['5yqqqq', 'https://www.5yqqqq.com/']
    ]) {
      const html = await fetchShop(url);
      const out = path.join(__dirname, `${name}-index.html`);
      fs.writeFileSync(out, html, 'utf8');
      console.log(name, 'len', html.length, 'has table', html.includes('<table') || html.includes('商品名称'));
    }
  })();
}

module.exports = { fetchShop, get };
