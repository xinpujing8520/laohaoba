const fs = require('fs');
const h = fs.readFileSync(__dirname + '/ab-buy-gemini.html', 'utf8');
const i = h.indexOf('window.__INIT_STATIC_PROPS__');
const s = h.indexOf('{', i);
let depth = 0;
let j = '';
for (let k = s; k < h.length; k++) {
  if (h[k] === '{') depth++;
  else if (h[k] === '}') {
    depth--;
    if (depth === 0) {
      j = h.slice(s, k + 1);
      break;
    }
  }
}
const props = JSON.parse(j);
const data = props[Object.keys(props).find((k) => k.startsWith('static-props'))];
const tree = data.goodsDetail?.hasSkuTree?.skuMap || {};

function walk(obj, prefix) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v && v.id) {
      console.log(v.id, prefix + k, 'alone', v.alone?.price, 'price', v.price, (v.skuName || v.product_name || '').slice(0, 60));
    } else if (v && typeof v === 'object') {
      walk(v, `${prefix}${k}/`);
    }
  }
}
walk(tree, '');
console.log('has 7866', h.includes('1578297866'));
