const fs = require('fs');
const s = fs.readFileSync(__dirname + '/ab-36455.a4bfa2cf.js', 'utf8');
const re = /[a-zA-Z_$][a-zA-Z0-9_$]*:e\(\{url:"([^"]+)",method:"([^"]+)"[^}]*baseURL:"([^"]+)"/g;
const hits = [];
let m;
while ((m = re.exec(s))) {
  if (/goods|library|classif|category|game|account/i.test(m[1])) hits.push(m);
}
console.log('hits', hits.length);
for (const [, url, method, base] of hits) {
  console.log(method, base + url);
}
