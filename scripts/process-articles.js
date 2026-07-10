/**
 * Full article pipeline:
 *   Pass 1 — scrape list + detail JSON
 *   Local images + internal links
 *   Pass 2 — colloquial polish
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const node = process.execPath;
const force = process.argv.includes('--force') ? ['--force'] : [];

const steps = [
  ['scrape-news-list.js', []],
  ['scrape-articles.js', force],
  ['migrate-remote-images.js', []],
  ['rewrite-internal-links.js', []],
  ['polish-articles.js', force]
];

for (const [script, args] of steps) {
  console.log('\n===', script, '===');
  const res = spawnSync(node, [path.join(__dirname, script), ...args], {
    cwd: root,
    stdio: 'inherit'
  });
  if (res.status !== 0) {
    console.error(`Failed: ${script}`);
    process.exit(res.status || 1);
  }
}
console.log('\nArticle pipeline complete.');
