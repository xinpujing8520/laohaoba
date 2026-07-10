const fs = require('fs');
const s = fs.readFileSync(__dirname + '/ab-pc.js', 'utf8');
console.log('len', s.length);
for (const pat of ['classification', 'goodsList', 'goodsPage', 'urlIdentifier', 'allGoods', 'getGame', '/game/']) {
  const idx = s.indexOf(pat);
  console.log(pat, idx >= 0 ? s.slice(Math.max(0, idx - 40), idx + 80) : 'not found');
}
