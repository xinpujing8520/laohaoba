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

const html = fs.readFileSync(__dirname + '/ab-product-pinterest.html', 'utf8');
const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
const d = props[Object.keys(props).find((k) => k.startsWith('static-props'))];
const g = d.goodsDetail;
console.log('name', g.product_name);
console.log('cost_price', g.cost_price, 'alone', g.alone?.price, 'price', g.price);
console.log('list_img', g.list_img);
console.log('gameDescLib', g.gameDescLib?.slice?.(0, 200) || g.gameDescLib);
console.log('game_desc', g.game_desc);
console.log('introduction', g.introduction?.slice?.(0, 200));
console.log('haidaohaiGoodsDtoList', g.haidaoHaiGoodsDtoList || g.haidaoHaiGoodsDtoList);
