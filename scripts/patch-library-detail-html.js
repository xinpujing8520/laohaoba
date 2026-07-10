/**
 * Fast patch: update detailHtml only in existing library-pages/*.json
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { replaceBrand } = require('./replace-brand-text');
const { encodeAssetUrl } = require('./encode-asset-url');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

function extractJson(html, marker) {
  const idx = html.indexOf(marker);
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

function parseCols(gd) {
  if (!gd || !gd.cols) return {};
  if (typeof gd.cols === 'string') {
    try { return JSON.parse(gd.cols); } catch { return {}; }
  }
  return gd.cols;
}

function buildDetailHtml(gd) {
  const cols = parseCols(gd);
  let html = String(
    cols.h5Detail || gd.game_desc || gd.introduction || gd.alone_desc || gd.gameDescLib || gd.goodsDetailForward || ''
  ).replace(/^<!--HTML-->/, '').trim();

  const detailPic = cols.h5DetailPic || '';
  if (detailPic && html.indexOf(detailPic) < 0) {
    html = `<p><img src="${encodeAssetUrl(detailPic)}" alt=""></p>${html}`;
  }

  const imgList = gd.detail_img || gd.goodsDetailImg || [];
  const imgs = imgList.map((x) => (typeof x === 'string' ? x : x.url)).filter(Boolean);
  const extraImgs = imgs.filter((u) => !html.includes(u));
  if (extraImgs.length) {
    const imgHtml = extraImgs.map((u) => `<p><img src="${encodeAssetUrl(u)}" alt=""></p>`).join('');
    html = html.length > 50 ? imgHtml + html : imgHtml + (html ? `<div>${html}</div>` : '');
  }

  return replaceBrand(html);
}

(async () => {
  const dir = path.join(__dirname, '..', 'public', 'data', 'library-pages');
  const indexPath = path.join(dir, '_index.json');
  const keys = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
    : fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== '_index.json').map((f) => f.replace(/\.json$/, ''));

  let ok = 0;
  for (let i = 0; i < keys.length; i++) {
    const shortEn = keys[i];
    const filePath = path.join(dir, `${shortEn}.json`);
    if (!fs.existsSync(filePath)) continue;
    try {
      const html = await get(`https://www.accountboy.com/zh-cn-cny/buy-${encodeURIComponent(shortEn)}`);
      const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
      const key = Object.keys(props || {}).find((k) => k.startsWith('static-props'));
      const gd = key && props[key].goodsDetail;
      if (!gd) {
        console.warn('skip', shortEn, 'no goodsDetail');
        continue;
      }
      const detail = buildDetailHtml(gd);
      const page = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      page.detailHtml = detail;
      fs.writeFileSync(filePath, JSON.stringify(page, null, 2), 'utf8');
      console.log(`[${i + 1}/${keys.length}]`, shortEn, `detail=${detail.length} chars`);
      ok++;
    } catch (e) {
      console.warn('fail', shortEn, e.message);
    }
    await sleep(150);
  }
  console.log(`Patched detailHtml on ${ok} library pages`);
})();
