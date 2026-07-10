const fs = require('fs');
const path = require('path');

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

function walk(node, parts, out) {
  if (!node) return;
  if (node.isLeaf || (node.gameId && !node.subSku)) {
    out.push({
      path: parts.join(' | '),
      gameId: node.gameId,
      alonePrice: node.alonePrice,
      isSelfRecharge: node.isSelfRecharge,
      selfRecharge: node.selfRecharge
    });
    return;
  }
  const sub = node.subSku;
  if (!sub?.skuMap) {
    if (node.gameId) out.push({ path: parts.join(' | '), gameId: node.gameId, alonePrice: node.alonePrice, isSelfRecharge: node.isSelfRecharge });
    return;
  }
  for (const [k, v] of Object.entries(sub.skuMap)) walk(v, [...parts, k], out);
}

for (const file of ['ab-buy-gemini.html', 'ab-buy-chatai.html']) {
  const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  const data = props[Object.keys(props).find((k) => k.startsWith('static-props'))];
  const gd = data.goodsDetail;
  console.log('\n===', file, '===');
  console.log('selfRecharge top', gd.selfRecharge ? JSON.stringify(gd.selfRecharge).slice(0, 500) : 'none');
  const tree = gd.hasSkuTree;
  const leaves = [];
  for (const [k, v] of Object.entries(tree.skuMap || {})) walk(v, [k], leaves);
  console.log('leaves', leaves.length);
  console.log('sample paths', leaves.slice(0, 8).map((l) => l.path));
  const sr = leaves.find((l) => l.isSelfRecharge || l.selfRecharge);
  if (sr) console.log('self recharge leaf', JSON.stringify(sr, null, 2).slice(0, 800));
  console.log('related', data.relatedGoodsList?.length, 'news', data.recommendInformation?.length);
  console.log('categoryInfo', data.categoryInfo);
}
