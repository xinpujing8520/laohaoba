/**
 * Fetch a title-related cover image (Openverse / Wikimedia) and save locally.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { downloadFile } = require('./local-images');

const ROOT = path.join(__dirname, '..', '..');
const COVER_DIR = path.join(ROOT, 'public', 'assets', 'images', 'covers');

const KEYWORD_MAP = [
  [/chatgpt|gpt|openai/i, 'chatgpt artificial intelligence'],
  [/claude|anthropic/i, 'claude ai'],
  [/gemini|google\s*ai/i, 'google gemini ai'],
  [/netflix|奈飞/i, 'netflix streaming'],
  [/hbo\s*max|max\b/i, 'hbo max streaming'],
  [/disney/i, 'disney plus'],
  [/youtube/i, 'youtube app'],
  [/telegram|电报|tg\b/i, 'telegram messenger'],
  [/whatsapp/i, 'whatsapp app'],
  [/instagram|ins\b/i, 'instagram app'],
  [/facebook|fb\b/i, 'facebook app'],
  [/twitter|\bx\b|推特/i, 'twitter x app'],
  [/tiktok|抖音/i, 'tiktok app'],
  [/apple\s*id|苹果\s*id|itunes/i, 'apple id iphone'],
  [/gmail|谷歌邮箱|google\s*mail/i, 'gmail google'],
  [/google|谷歌/i, 'google logo'],
  [/spotify/i, 'spotify music'],
  [/cursor|windsurf|claude\s*code/i, 'coding developer laptop'],
  [/vpn|科学上网/i, 'vpn network security'],
  [/视频教程|video\s*tutorial/i, 'video tutorial screen']
];

function extractSearchQuery(title) {
  const t = String(title || '');
  for (const [re, q] of KEYWORD_MAP) {
    if (re.test(t)) return q;
  }
  const en = t.match(/[A-Za-z][A-Za-z0-9+.\-]{1,24}/g) || [];
  if (en.length) return en.slice(0, 3).join(' ');
  const cn = t.replace(/[^\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return (cn.slice(0, 2).join(' ') || 'technology digital').slice(0, 40);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: {
        'User-Agent': 'LaoHaoBaArticleBot/1.0 (cover fetch; +https://www.laohaoba.com)',
        Accept: 'application/json'
      }
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        return getJson(next).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function pickOpenverseUrl(query) {
  const url = 'https://api.openverse.org/v1/images/?q=' + encodeURIComponent(query)
    + '&page_size=8&license_type=commercial,modification&format=json';
  const data = await getJson(url);
  const results = data.results || [];
  for (const r of results) {
    const u = r.url || r.thumbnail;
    if (u && /\.(jpe?g|png|webp)(\?|$)/i.test(u)) return u;
    if (u) return u;
  }
  return '';
}

async function pickWikimediaUrl(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search'
    + '&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=1200'
    + '&gsrsearch=' + encodeURIComponent(query) + '&format=json';
  const data = await getJson(url);
  const pages = data.query && data.query.pages ? Object.values(data.query.pages) : [];
  for (const p of pages) {
    const info = p.imageinfo && p.imageinfo[0];
    const u = (info && (info.thumburl || info.url)) || '';
    if (u && !/\.svg(\?|$)/i.test(u)) return u;
  }
  return '';
}

/**
 * @param {string} title
 * @param {string|number} articleId
 * @param {string} [fallback]
 * @returns {Promise<string>} local or fallback cover path
 */
async function fetchCoverForTitle(title, articleId, fallback) {
  const query = extractSearchQuery(title);
  let remote = '';
  try { remote = await pickOpenverseUrl(query); } catch (_) {}
  if (!remote) {
    try { remote = await pickWikimediaUrl(query); } catch (_) {}
  }
  if (!remote) return fallback || '/assets/laohaoba-logo.svg';

  fs.mkdirSync(COVER_DIR, { recursive: true });
  const ext = (remote.match(/\.(jpe?g|png|webp)/i) || ['.jpg'])[0].toLowerCase().replace('jpeg', 'jpg');
  const rel = '/assets/images/covers/' + articleId + ext;
  const dest = path.join(ROOT, 'public', rel.replace(/^\//, '').replace(/\//g, path.sep));
  try {
    await downloadFile(remote, dest);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 2000) return rel;
  } catch (e) {
    console.warn('[cover]', query, e.message || e);
  }
  return fallback || '/assets/laohaoba-logo.svg';
}

module.exports = { fetchCoverForTitle, extractSearchQuery };
