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
const g = props[Object.keys(props).find((k) => k.startsWith('static-props'))].goodsDetail;
for (const k of ['gameDescLib', 'notice', 'howToUse', 'share_desc', 'alone_desc', 'cols', 'goodsDetailImg']) {
  const v = g[k];
  console.log('\n===', k, '===');
  if (typeof v === 'string') console.log(v.slice(0, 500));
  else console.log(JSON.stringify(v)?.slice(0, 500));
}
