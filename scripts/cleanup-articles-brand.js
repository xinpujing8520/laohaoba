/**
 * Remove article by id + purge AccountBoy/账号星球 from public user-facing data.
 * Usage: node scripts/cleanup-articles-brand.js [--remove-id=1401]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ARTICLES_DIR = path.join(PUBLIC, 'data', 'articles');
const NEWS_LIST = path.join(PUBLIC, 'data', 'news-list.json');
const HOME_CONTENT = path.join(PUBLIC, 'data', 'home-content.json');
const CATEGORY_DISPLAY = path.join(PUBLIC, 'data', 'category-display.json');
const LIBRARY_DIR = path.join(PUBLIC, 'data', 'library-pages');

const REMOVE_ID = (() => {
  const arg = process.argv.find((a) => a.startsWith('--remove-id='));
  return arg ? Number(arg.split('=')[1]) : 1401;
})();

const BRAND = '老号吧';
const SITE = 'https://www.laohaoba.com';

function replaceBrand(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/https?:\/\/[a-z0-9-]*(?:acceboy|accaboy|accboy|accountboy)[a-z0-9-]*\.laohaoba\.com\/?/gi, `${SITE}/`)
    .replace(/https?:\/\/(?:www\.)?(?:acceboy|accaboy|accboy|accountboy|zuhaohao)\.(?:com|cn)\/?/gi, `${SITE}/`)
    .replace(/(?:www\.)?(?:acceboy|accaboy|accboy)\.(?:com|cn)/gi, 'www.laohaoba.com')
    .replace(/https?:\/\/(?:www\.)?accountboy\.com\/zh-cn-[a-z]+/gi, SITE)
    .replace(/https?:\/\/(?:www\.)?accountboy\.com\/?/gi, `${SITE}/`)
    .replace(/账号星球（AccountBoy）/g, BRAND)
    .replace(/账号星球\(AccountBoy\)/g, BRAND)
    .replace(/账号星球/g, BRAND)
    .replace(/AccountBoy/g, BRAND)
    .replace(/Accountboy/g, BRAND)
    .replace(/https?:\/\/share\.adspower\.net\/accountboy/gi, 'https://share.adspower.net/laohaoba')
    .replace(/([?&])source=accountboy/gi, '$1source=laohaoba')
    .replace(/accountboy-buy-facebook/gi, 'laohaoba-buy-facebook')
}

function walk(obj) {
  if (typeof obj === 'string') return replaceBrand(obj);
  if (Array.isArray(obj)) return obj.map(walk);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'slug' && v === 'accountboy-access-notice') {
        out[k] = 'laohaoba-access-notice';
      } else {
        out[k] = walk(v);
      }
    }
    return out;
  }
  return obj;
}

function loadJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function saveJson(fp, data) {
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

function removeFromNewsList(data, id) {
  const before = (data.items || []).length;
  data.items = (data.items || []).filter((x) => x.id !== id);
  const removed = before - data.items.length;
  if (removed > 0) {
    data.total = Math.max(0, (data.total || before) - removed);
    const pageSize = data.pageSize || 10;
    data.totalPages = Math.max(1, Math.ceil(data.items.length / pageSize));
  }
  return removed;
}

function removeFromHomeNews(data, id) {
  const before = (data.news || []).length;
  data.news = (data.news || []).filter((x) => x.id !== id);
  return before - data.news.length;
}

function cleanLibraryPages(removeArticleId) {
  let files = 0;
  let stripped = 0;
  for (const name of fs.readdirSync(LIBRARY_DIR)) {
    if (!name.endsWith('.json')) continue;
    const fp = path.join(LIBRARY_DIR, name);
    const lib = loadJson(fp);
    let changed = false;
    const updated = walk(lib);
    if (JSON.stringify(updated) !== JSON.stringify(lib)) {
      Object.assign(lib, updated);
      changed = true;
    }
    if (Array.isArray(lib.recommendNews)) {
      const next = lib.recommendNews.filter((n) => n.id !== removeArticleId);
      if (next.length !== lib.recommendNews.length) {
        lib.recommendNews = next;
        changed = true;
        stripped += 1;
      }
    }
    if (changed) {
      saveJson(fp, lib);
      files += 1;
    }
  }
  return { files, stripped };
}

function cleanArticles() {
  let updated = 0;
  for (const name of fs.readdirSync(ARTICLES_DIR)) {
    if (!name.endsWith('.json')) continue;
    const fp = path.join(ARTICLES_DIR, name);
    const raw = loadJson(fp);
    const next = walk(raw);
    if (JSON.stringify(next) !== JSON.stringify(raw)) {
      saveJson(fp, next);
      updated += 1;
    }
  }
  return updated;
}

function main() {
  const id = REMOVE_ID;
  const articlePath = path.join(ARTICLES_DIR, `${id}.json`);
  if (fs.existsSync(articlePath)) {
    fs.unlinkSync(articlePath);
    console.log(`Deleted ${articlePath}`);
  }

  const news = loadJson(NEWS_LIST);
  const newsRemoved = removeFromNewsList(news, id);
  const newsPurged = walk(news);
  saveJson(NEWS_LIST, newsPurged);
  console.log(`news-list.json: removed ${newsRemoved} item(s), brand scrubbed`);

  const home = loadJson(HOME_CONTENT);
  const homeRemoved = removeFromHomeNews(home, id);
  const homePurged = walk(home);
  saveJson(HOME_CONTENT, homePurged);
  console.log(`home-content.json: removed ${homeRemoved} news item(s), brand scrubbed`);

  if (fs.existsSync(CATEGORY_DISPLAY)) {
    const cd = walk(loadJson(CATEGORY_DISPLAY));
    saveJson(CATEGORY_DISPLAY, cd);
    console.log('category-display.json: brand scrubbed');
  }

  const lib = cleanLibraryPages(id);
  console.log(`library-pages: updated ${lib.files} files, stripped article ${id} from ${lib.stripped} recommendNews lists`);

  const articleUpdates = cleanArticles();
  console.log(`articles: brand scrubbed in ${articleUpdates} files`);

  // verify
  let remaining = 0;
  const scanDir = (dir, ext) => {
    for (const name of fs.readdirSync(dir)) {
      const fp = path.join(dir, name);
      if (fs.statSync(fp).isDirectory()) {
        if (name === 'articles' || name === 'library-pages' || fp.includes('data')) scanDir(fp, ext);
        continue;
      }
      if (ext && !name.endsWith(ext)) continue;
      const t = fs.readFileSync(fp, 'utf8');
      if (/accountboy|AccountBoy|账号星球|Accountboy/i.test(t)) remaining += 1;
    }
  };
  scanDir(path.join(PUBLIC, 'data'), '.json');
  console.log(`Remaining public JSON files with brand hits: ${remaining}`);
}

main();
