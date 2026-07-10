const fs = require('fs');

function extractJson(html, marker) {
  const idx = html.indexOf(marker);
  const start = html.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
}

const html = fs.readFileSync(__dirname + '/ab-home.html', 'utf8');
const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
const d = props[Object.keys(props).find((k) => k.startsWith('static-props'))];
const store = extractJson(html, 'window.__INIT_STORE__');
const cats = store.CommonStore.categoryList;

const byAbCat = {};
for (const g of d.allGoodslist) {
  const k = JSON.stringify(g.accountBoyCategory || g.firstCategory || g.tag || null);
  byAbCat[k] = (byAbCat[k] || 0) + 1;
}
console.log('by accountBoyCategory/firstCategory/tag', byAbCat);

const samples = d.allGoodslist.slice(0, 8).map((g) => ({
  name: g.product_name,
  tag: g.tag,
  accountBoyCategory: g.accountBoyCategory,
  firstCategory: g.firstCategory,
  kardzCategory: g.kardzCategory
}));
console.log(samples);

console.log('categories', cats.map((c) => ({ id: c.id, name: c.name, urlIdentifier: c.urlIdentifier, num: c.num })));
