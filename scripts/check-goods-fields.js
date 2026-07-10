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
const g = d.allGoodslist[0];
console.log('goodsLibraryId fields', Object.keys(g).filter((k) => /library|category|game/i.test(k)));
console.log('sample', {
  id: g.id,
  gameLibraryId: g.gameLibraryId,
  goodsCategoryId: g.goodsCategoryId,
  goodsCategoryName: g.goodsCategoryName,
  tag: g.tag
});
