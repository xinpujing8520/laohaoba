/**
 * Pass 2: colloquial polish for scraped article JSON.
 * Run after scrape-articles.js + migrate-remote-images.js + rewrite-internal-links.js
 *
 *   node scripts/polish-articles.js          # skip already polished
 *   node scripts/polish-articles.js --force  # re-polish all
 */
const fs = require('fs');
const path = require('path');
const { polishArticle } = require('./lib/polish-text');

const ART_DIR = path.join(__dirname, '..', 'public', 'data', 'articles');
const NEWS_LIST = path.join(__dirname, '..', 'public', 'data', 'news-list.json');
const force = process.argv.includes('--force');

let ok = 0;
let skip = 0;

for (const file of fs.readdirSync(ART_DIR).filter((f) => f.endsWith('.json'))) {
  const fp = path.join(ART_DIR, file);
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!force && raw.polishedAt && raw.polishVersion >= 1) {
    skip++;
    continue;
  }
  const polished = polishArticle(raw);
  fs.writeFileSync(fp, JSON.stringify(polished, null, 2), 'utf8');
  ok++;
}

if (fs.existsSync(NEWS_LIST)) {
  const list = JSON.parse(fs.readFileSync(NEWS_LIST, 'utf8'));
  const { polishPlainText } = require('./lib/polish-text');
  list.items = (list.items || []).map((n) => ({
    ...n,
    title: polishPlainText(n.title || ''),
    summary: polishPlainText(n.summary || '')
  }));
  fs.writeFileSync(NEWS_LIST, JSON.stringify(list, null, 2), 'utf8');
  console.log('Polished news-list.json summaries');
}

console.log(`Polished ${ok} articles, skipped ${skip} (already done)`);
