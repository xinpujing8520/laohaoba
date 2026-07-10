const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const REMOTE_HOSTS = [
  'm-files.kardz.cn',
  'files.kardz.cn',
  'files.accountboy.com',
  'files.zuhaohao.com',
  'm-files.zuhaohao.com'
];

const URL_RE = /https?:\/\/(?:m-files\.kardz\.cn|files\.kardz\.cn|files\.accountboy\.com|files\.zuhaohao\.com|m-files\.zuhaohao\.com)\/[^\s"'<>\\)]+\.(?:jpe?g|png|gif|webp|svg|bmp|ico)(?:\?[^\s"'<>\\)]*)?/gi;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRemoteImageUrl(url) {
  try {
    const u = new URL(url);
    return REMOTE_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

function localPathFromUrl(url) {
  const u = new URL(url);
  const bucket = u.hostname.split('.')[0];
  const rawName = decodeURIComponent(path.basename(u.pathname)) || 'file';
  const safeName = rawName.replace(/[<>:"|?*]/g, '_').replace(/\s+/g, '_');
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
  const ext = path.extname(safeName) || '.bin';
  const base = path.basename(safeName, ext).slice(0, 80) || 'img';
  const rel = path.posix.join('/assets/images', bucket, `${base}_${hash}${ext}`);
  return rel;
}

function downloadFile(url, destPath, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://www.accountboy.com/'
        }
      }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          return downloadFile(next, destPath, left).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          if (left > 1) return setTimeout(() => attempt(left - 1), 800);
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          fs.writeFileSync(destPath, Buffer.concat(chunks));
          resolve(destPath);
        });
      }).on('error', (err) => {
        if (left > 1) setTimeout(() => attempt(left - 1), 800);
        else reject(err);
      });
    };
    attempt(retries);
  });
}

function collectUrlsFromValue(val, out) {
  if (typeof val === 'string') {
    const matches = val.match(URL_RE) || [];
    matches.forEach((u) => out.add(u.replace(/&amp;/g, '&')));
    return;
  }
  if (Array.isArray(val)) val.forEach((v) => collectUrlsFromValue(v, out));
  else if (val && typeof val === 'object') {
    Object.values(val).forEach((v) => collectUrlsFromValue(v, out));
  }
}

function replaceUrlsInValue(val, map) {
  if (typeof val === 'string') {
    let s = val;
    for (const [remote, local] of Object.entries(map)) {
      if (s.includes(remote)) s = s.split(remote).join(local);
      const enc = remote.replace(/&/g, '&amp;');
      if (s.includes(enc)) s = s.split(enc).join(local);
    }
    return s;
  }
  if (Array.isArray(val)) return val.map((v) => replaceUrlsInValue(v, map));
  if (val && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = replaceUrlsInValue(v, map);
    return out;
  }
  return val;
}

async function ensureLocalImages(urls, publicRoot, mapPath) {
  const existing = fs.existsSync(mapPath)
    ? JSON.parse(fs.readFileSync(mapPath, 'utf8'))
    : {};
  const map = { ...existing };
  const list = [...urls].filter(isRemoteImageUrl);
  let downloaded = 0;
  let skipped = 0;

  for (let i = 0; i < list.length; i++) {
    const url = list[i];
    if (map[url] && fs.existsSync(path.join(publicRoot, map[url].replace(/^\//, '')))) {
      skipped++;
      continue;
    }
    const rel = localPathFromUrl(url);
    const abs = path.join(publicRoot, rel.replace(/^\//, ''));
    try {
      await downloadFile(url, abs);
      map[url] = rel;
      downloaded++;
      if ((i + 1) % 50 === 0) console.log(`  images ${i + 1}/${list.length} (new ${downloaded})`);
      await sleep(40);
    } catch (e) {
      console.warn('  fail', url.slice(0, 80), e.message);
    }
  }
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2), 'utf8');
  return { map, downloaded, skipped, total: list.length };
}

module.exports = {
  REMOTE_HOSTS,
  URL_RE,
  isRemoteImageUrl,
  localPathFromUrl,
  collectUrlsFromValue,
  replaceUrlsInValue,
  ensureLocalImages
};
