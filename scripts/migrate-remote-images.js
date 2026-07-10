const fs = require('fs');
const path = require('path');
const {
  collectUrlsFromValue,
  replaceUrlsInValue,
  ensureLocalImages
} = require('./lib/local-images');

const PUBLIC = path.join(__dirname, '..', 'public');
const MAP_PATH = path.join(__dirname, 'image-url-map.json');

const TARGETS = [
  path.join(PUBLIC, 'data', 'articles'),
  path.join(PUBLIC, 'data', 'library-pages'),
  path.join(PUBLIC, 'data', 'news-list.json'),
  path.join(PUBLIC, 'data', 'home-content.json'),
  path.join(PUBLIC, 'data', 'category-display.json'),
  path.join(PUBLIC, 'data', 'hot-products.json')
];

function loadJsonFiles() {
  const files = [];
  for (const t of TARGETS) {
    if (!fs.existsSync(t)) continue;
    if (fs.statSync(t).isDirectory()) {
      fs.readdirSync(t).filter((f) => f.endsWith('.json') && f !== '_index.json').forEach((f) => {
        files.push(path.join(t, f));
      });
    } else {
      files.push(t);
    }
  }
  return files;
}

(async () => {
  const jsonFiles = loadJsonFiles();
  const allUrls = new Set();
  const payloads = [];

  for (const file of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    collectUrlsFromValue(data, allUrls);
    payloads.push({ file, data });
  }

  console.log(`Found ${allUrls.size} unique remote image URLs in ${jsonFiles.length} files`);
  const { map, downloaded, skipped, total } = await ensureLocalImages(allUrls, PUBLIC, MAP_PATH);
  console.log(`Images: ${downloaded} downloaded, ${skipped} cached, ${total} total`);

  let rewritten = 0;
  for (const { file, data } of payloads) {
    const next = replaceUrlsInValue(data, map);
    if (JSON.stringify(next) !== JSON.stringify(data)) {
      fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8');
      rewritten++;
    }
  }
  console.log(`Rewrote image URLs in ${rewritten} JSON files`);
})();
