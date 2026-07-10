const fs = require('fs');
const files = fs.readdirSync(__dirname).filter((f) => f.startsWith('ab-') && f.endsWith('.js'));
for (const f of files) {
  const s = fs.readFileSync(__dirname + '/' + f, 'utf8');
  for (const term of ['libraryCategory', 'goodsApis', 'classificationGoods', 'categoryGoods', 'goodsLibrary', 'listByCategory', 'accountBoy/goods']) {
    if (s.includes(term)) {
      const i = s.indexOf(term);
      console.log(f, term, s.slice(Math.max(0, i - 60), i + 120));
      console.log('---');
    }
  }
}
