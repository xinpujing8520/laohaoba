const fs = require('fs');
const s = fs.readFileSync(__dirname + '/ab-36455.a4bfa2cf.js', 'utf8');
const idxs = [];
let pos = 0;
while (true) {
  const i = s.indexOf('accountBoy', pos);
  if (i < 0) break;
  idxs.push(i);
  pos = i + 1;
}
console.log('accountBoy occurrences', idxs.length);
for (const i of idxs.slice(0, 30)) {
  console.log('---');
  console.log(s.slice(Math.max(0, i - 80), i + 160));
}
