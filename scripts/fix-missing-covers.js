/**
 * Repair missing / broken article cover images and strip duplicate leading covers.
 */
const fs = require('fs');
const path = require('path');
const { fetchCoverForTitle } = require('./lib/fetch-cover-image');
const { downloadFile } = require('./lib/local-images');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ARTICLES = path.join(PUBLIC, 'data', 'articles');
const NEWS = path.join(PUBLIC, 'data', 'news-list.json');
const HOME = path.join(PUBLIC, 'data', 'home-content.json');
const FALLBACK = '/assets/laohaoba-logo.svg';

function localPath(rel) {
  return path.join(PUBLIC, String(rel || '').replace(/^\//, '').replace(/\//g, path.sep));
}

function existsLocal(rel) {
  if (!rel || /^https?:\/\//i.test(rel)) return false;
  const p = localPath(rel);
  return fs.existsSync(p) && fs.statSync(p).size > 800;
}

function stripLeadingCover(html, cover) {
  let out = String(html || '');
  if (cover) {
    const esc = String(cover).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(
      new RegExp(`^(?:<!--HTML-->)?\\s*<p>\\s*<img[^>]+src=["']${esc}["'][^>]*>\\s*</p>\\s*`, 'i'),
      (m) => (m.startsWith('<!--HTML-->') ? '<!--HTML-->' : '')
    );
  }
  // Also strip any leading cover under /assets/images/covers/
  out = out.replace(
    /^(?:<!--HTML-->)?\s*<p>\s*<img[^>]+src=["']\/assets\/images\/covers\/[^"']+["'][^>]*>\s*<\/p>\s*/i,
    (m) => (m.startsWith('<!--HTML-->') ? '<!--HTML-->' : '')
  );
  if (!out.startsWith('<!--HTML-->') && out.includes('<')) {
    out = '<!--HTML-->' + out.replace(/^<!--HTML-->/, '');
  }
  return out;
}

async function ensureCover(article) {
  const id = article.id;
  let cover = article.cover || '';

  if (cover && /^https?:\/\//i.test(cover)) {
    try {
      const ext = (cover.match(/\.(jpe?g|png|webp)/i) || ['.jpg'])[0].toLowerCase().replace('jpeg', 'jpg');
      const rel = '/assets/images/covers/' + id + ext;
      const dest = localPath(rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      await downloadFile(cover, dest);
      if (existsLocal(rel)) cover = rel;
    } catch (_) {}
  }

  if (!existsLocal(cover)) {
    cover = await fetchCoverForTitle(article.title, id, FALLBACK);
  }

  if (!existsLocal(cover) && cover !== FALLBACK) {
    cover = FALLBACK;
  }

  article.cover = cover;
  article.content = stripLeadingCover(article.content, cover);
  return cover;
}

async function main() {
  const files = fs.readdirSync(ARTICLES).filter((f) => /^\d+\.json$/.test(f));
  const coverById = new Map();
  let fixed = 0;

  for (const file of files) {
    const fp = path.join(ARTICLES, file);
    const article = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const before = article.cover;
    const beforeContent = article.content;
    const cover = await ensureCover(article);
    coverById.set(Number(article.id) || article.id, cover);
    if (before !== article.cover || beforeContent !== article.content) {
      fs.writeFileSync(fp, JSON.stringify(article, null, 2) + '\n', 'utf8');
      fixed += 1;
      console.log('fixed', article.id, cover);
    }
  }

  for (const listPath of [NEWS, HOME]) {
    if (!fs.existsSync(listPath)) continue;
    const data = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    const items = data.items || data.news || [];
    let changed = false;
    for (const item of items) {
      const c = coverById.get(Number(item.id) || item.id);
      if (c && item.cover !== c) {
        item.cover = c;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(listPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      console.log('updated list', path.basename(listPath));
    }
  }

  console.log('Done. articles touched:', fixed);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
