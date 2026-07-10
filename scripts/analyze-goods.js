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

console.log('allGoodslist', d.allGoodslist.length, 'allIds', d.allIds.length);
for (const c of cats) console.log(c.id, c.name, 'num', c.num, c.urlIdentifier);

const tagToCat = {
  '苹果id': 2,
  '推特账号': 3,
  TikTok: 3,
  '脸书': 3,
  'Instagram账号': 3,
  'twitch账号': 3,
  '谷歌账号': 3,
  '雅虎邮箱': 4,
  '谷歌邮箱': 4,
  '迪士尼账号': 5,
  youtube: 5,
  'steam充值': 9
};

const mapped = {};
for (const g of d.allGoodslist) {
  const catId = tagToCat[g.tag] || guessCat(g, cats);
  mapped[catId] = (mapped[catId] || 0) + 1;
}
console.log('mapped counts', mapped);

function guessCat(g, categories) {
  const text = `${g.product_name} ${g.goodsCategoryName} ${g.tag || ''} ${g.shortEn || ''}`.toLowerCase();
  if (/apple|苹果|itunes/.test(text)) return 2;
  if (/gmail|邮箱|mail|outlook|yahoo|微软/.test(text)) return 4;
  if (/netflix|youtube|hbo|spotify|迪士尼|奈飞|影音/.test(text)) return 5;
  if (/office|duolingo|gamma|办公|学习/.test(text)) return 6;
  if (/chatgpt|gemini|claude|grok|sora|suno|ai/.test(text)) return 7;
  if (/windows|系统|vpn|工具/.test(text)) return 8;
  if (/steam|game|游戏|epic|暴雪/.test(text)) return 9;
  if (/礼品|gift|充值卡|itunes/.test(text)) return 10;
  if (/手机卡|sim|接码/.test(text)) return 63;
  if (/telegram|facebook|fb|twitter|推特|tiktok|ins|discord|linkedin|社交/.test(text)) return 3;
  return 3;
}

const unmapped = d.allGoodslist.filter((g) => !tagToCat[g.tag] && guessCat(g, cats) === 3 && !g.tag);
console.log('no tag sample', unmapped.slice(0, 10).map((g) => ({ name: g.product_name, tag: g.tag, cat: g.goodsCategoryName, shortEn: g.shortEn })));

console.log('shortEn samples', d.allGoodslist.slice(0, 8).map((g) => g.shortEn));
