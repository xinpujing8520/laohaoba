const fs = require('fs');
const files = ['ab-36455.a4bfa2cf.js', 'ab-22714.60e46744.js'];
for (const f of files) {
  const s = fs.readFileSync(__dirname + '/' + f, 'utf8');
  const paths = new Set();
  for (const m of s.matchAll(/["'](\/[a-zA-Z0-9][a-zA-Z0-9_./-]{2,80})["']/g)) paths.add(m[1]);
  const filtered = [...paths].filter((p) => /goods|game|classif|category|list|detail|account|search|page/i.test(p));
  console.log('\n', f, 'paths', filtered.length);
  console.log(filtered.sort().join('\n'));
}
