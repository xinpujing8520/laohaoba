const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'ab-home.html'), 'utf8');

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
const key = Object.keys(props).find((k) => k.startsWith('static-props'));
const d = props[key];

console.log('keys', Object.keys(d).slice(0, 30));
console.log('homeBannerRes', JSON.stringify(d.homeBannerRes || d.bannerList || d.bannerListData || null).slice(0, 2000));

const store = extractJson('window.__INIT_STORE__');
if (store && store.ConfigStore) {
  const cs = store.ConfigStore;
  for (const k of Object.keys(cs)) {
    if (/banner|Banner|home/i.test(k) && cs[k]) {
      console.log('ConfigStore.' + k, JSON.stringify(cs[k]).slice(0, 500));
    }
  }
}

// sample product image
const cats = d.categoriesWithGoods || [];
if (cats[0] && cats[0].goodsList && cats[0].goodsList[0]) {
  const g = cats[0].goodsList[0];
  console.log('sample goods', { name: g.product_name || g.name, list_img: g.list_img, short_img: g.short_img });
}
