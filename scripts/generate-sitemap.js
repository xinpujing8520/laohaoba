/**
 * Generate public/sitemap.xml from articles, news pages, and product library data.
 * Usage: node scripts/generate-sitemap.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SITE = 'https://www.laohaoba.com';

function loadJson(fp, fallback) {
  if (!fs.existsSync(fp)) return fallback;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlEntry(loc, opts = {}) {
  let xml = '  <url>\n    <loc>' + xmlEscape(loc) + '</loc>\n';
  if (opts.lastmod) xml += '    <lastmod>' + opts.lastmod + '</lastmod>\n';
  if (opts.changefreq) xml += '    <changefreq>' + opts.changefreq + '</changefreq>\n';
  if (opts.priority) xml += '    <priority>' + opts.priority + '</priority>\n';
  xml += '  </url>\n';
  return xml;
}

function collectProductIds() {
  const ids = new Set();

  const catDisplay = loadJson(path.join(PUBLIC, 'data', 'category-display.json'), {});
  for (const list of Object.values(catDisplay)) {
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      const id = p.LinkId || p.ID;
      if (id) ids.add(String(id));
    }
  }

  const libDir = path.join(PUBLIC, 'data', 'library-pages');
  if (fs.existsSync(libDir)) {
    for (const file of fs.readdirSync(libDir).filter((f) => f.endsWith('.json'))) {
      const lib = loadJson(path.join(libDir, file), {});
      if (lib.defaultGameId) ids.add('ab_' + lib.defaultGameId);
      const leaves = lib.skuTree && lib.skuTree.leaves;
      if (Array.isArray(leaves)) {
        for (const leaf of leaves) {
          if (leaf.productId) ids.add(String(leaf.productId));
        }
      }
    }
  }

  return [...ids];
}

function main() {
  const urls = [];
  const today = new Date().toISOString().slice(0, 10);

  urls.push({ loc: SITE + '/', changefreq: 'daily', priority: '1.0', lastmod: today });
  urls.push({ loc: SITE + '/news', changefreq: 'daily', priority: '0.9', lastmod: today });

  const newsList = loadJson(path.join(PUBLIC, 'data', 'news-list.json'), {});
  const totalPages = newsList.totalPages || 1;
  for (let p = 2; p <= totalPages; p++) {
    urls.push({ loc: SITE + '/news/page-' + p, changefreq: 'weekly', priority: '0.7' });
  }

  const articlesDir = path.join(PUBLIC, 'data', 'articles');
  if (fs.existsSync(articlesDir)) {
    for (const file of fs.readdirSync(articlesDir).filter((f) => /^\d+\.json$/.test(f))) {
      const id = path.basename(file, '.json');
      const article = loadJson(path.join(articlesDir, file), {});
      urls.push({
        loc: SITE + '/article/' + id + '.html',
        changefreq: 'monthly',
        priority: '0.8',
        lastmod: article.date || today
      });
    }
  }

  for (const id of collectProductIds()) {
    urls.push({
      loc: SITE + '/goods/' + encodeURIComponent(id) + '.html',
      changefreq: 'weekly',
      priority: '0.8'
    });
  }

  urls.push({ loc: SITE + '/policy.html', changefreq: 'yearly', priority: '0.3' });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const u of urls) xml += urlEntry(u.loc, u);
  xml += '</urlset>\n';

  const out = path.join(PUBLIC, 'sitemap.xml');
  fs.writeFileSync(out, xml, 'utf8');
  console.log('Wrote ' + urls.length + ' URLs to ' + out);
}

main();
