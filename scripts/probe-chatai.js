const fs = require('fs');
const https = require('https');

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
  if (node.gameId && (!node.subSku || node.isLeaf)) {
    out.push({
      path: parts.join(' | '),
      gameId: node.gameId,
      isSelfRecharge: node.isSelfRecharge,
      rechargeId: node.rechargeId,
      skuId: node.skuId
    });
  }
  const sub = node.subSku;
  if (sub?.skuMap) {
    for (const [k, v] of Object.entries(sub.skuMap)) walk(v, [...parts, k], out);
  }
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', site: 'accountBoy', Referer: 'https://www.accountboy.com/' }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

(async () => {
  const html = fs.readFileSync(__dirname + '/ab-buy-chatai.html', 'utf8');
  const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
  const data = props[Object.keys(props).find((k) => k.startsWith('static-props'))];
  const leaves = [];
  for (const [k, v] of Object.entries(data.goodsDetail.hasSkuTree.skuMap)) walk(v, [k], leaves);
  const dc = leaves.filter((l) => l.path.startsWith('代充'));
  console.log('代充 leaves', dc);

  for (const leaf of dc.slice(0, 2)) {
    const gid = leaf.gameId;
    for (const q of [
      `goodsId=${gid}`,
      `rechargeId=${gid}`,
      `goodsId=${gid}&skuId=${leaf.skuId || ''}`,
      `rechargeID=${gid}`
    ]) {
      const url = `https://api-web.kardz.cn/anon/mobile/recharge/field/word/col/list/v1?${q}`;
      const body = await get(url);
      if (body.includes('登录') || body.includes('api') || body.includes('ChatGPT') || body.includes('联系方式')) {
        console.log('\n', url);
        console.log(body.slice(0, 1500));
      }
    }
  }
})();
