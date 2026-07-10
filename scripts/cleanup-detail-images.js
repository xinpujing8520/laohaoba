/**
 * Batch-clean leading banner images from library-pages detailHtml.
 * Usage: node scripts/cleanup-detail-images.js
 */
const fs = require('fs');
const path = require('path');
const { sanitizeDetailHtml } = require('./lib/sanitize-detail-html');

const LIB_DIR = path.join(__dirname, '..', 'public', 'data', 'library-pages');

function main() {
  let files = 0;
  let changed = 0;
  for (const file of fs.readdirSync(LIB_DIR).filter((f) => f.endsWith('.json'))) {
    const fp = path.join(LIB_DIR, file);
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (!data.detailHtml) continue;
    files += 1;
    const cleaned = sanitizeDetailHtml(data.detailHtml, {
      iconUrl: data.iconUrl,
      coverImg: data.coverImg
    });
    if (cleaned !== data.detailHtml) {
      data.detailHtml = cleaned;
      fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf8');
      changed += 1;
      console.log('  cleaned:', file);
    }
  }
  console.log('Done: ' + changed + '/' + files + ' library pages updated');
}

main();
