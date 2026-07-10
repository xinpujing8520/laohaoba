const fs = require('fs');
const html = fs.readFileSync('scripts/ab-product-spotify.html', 'utf8');

function extractJson(marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const start = html.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  return null;
}

const props = extractJson('window.__INIT_STATIC_PROPS__');
const key = Object.keys(props).find((k) => k.includes('buy-Spotify') || k.includes('static-props'));
const d = props[key];
const g = d.goodsDetail || {};
console.log('product', g.product_name, 'price', g.price, 'source', g.source_price || g.cost_price);
console.log('list_img', g.list_img);
console.log('sku related keys', Object.keys(d).filter(k => /sku|spec|alone|tree/i.test(k)));
if (d.skuTree) console.log('skuTree len', d.skuTree.length);
if (d.aloneGoodsList) console.log('aloneGoodsList', d.aloneGoodsList.length);

// find styled component class names in HTML
const classes = [...html.matchAll(/class="([^"]{5,80})"/g)].map(m => m[1]).filter(c => /detail|goods|buy|spec|sku|price/i.test(c)).slice(0, 30);
console.log('sample classes', classes);

// legal tip
const legal = html.match(/凡购买本站[^<]{0,200}/);
console.log('legal', legal && legal[0].slice(0, 120));
