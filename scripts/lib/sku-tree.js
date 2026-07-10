const { cnyToUsdt } = require('../usdt-price');
const { encodeAssetUrl } = require('../encode-asset-url');

function parsePrice(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseLeaf(name, node) {
  const priceCny = parsePrice(node.alonePrice ?? node.alone?.price);
  if (!node.gameId || priceCny <= 0) return null;
  return {
    name,
    gameId: node.gameId,
    productId: `ab_${node.gameId}`,
    price: cnyToUsdt(priceCny),
    originalPrice: cnyToUsdt(parsePrice(node.originalPrice || node.officialPrice || priceCny)),
    badge: node.firstTag || '',
    icon: encodeAssetUrl(node.icon || node.listImg || ''),
    description: node.richTextDescription || node.h5PromotionDescription || node.goodsDetailContext || '',
    isRecharge: Boolean(node.isSelfRecharge) || String(name).includes('代充')
  };
}

function walkLeaves(node, pathParts, out) {
  if (!node || typeof node !== 'object') return;
  if (node.gameId && (!node.subSku || node.isLeaf)) {
    const leaf = parseLeaf(pathParts[pathParts.length - 1] || node.productName || '', node);
    if (leaf) out.push({ ...leaf, path: [...pathParts] });
    return;
  }
  if (node.subSku?.skuMap) {
    for (const [k, v] of Object.entries(node.subSku.skuMap)) {
      walkLeaves(v, [...pathParts, k], out);
    }
  } else if (node.gameId) {
    const leaf = parseLeaf(pathParts[pathParts.length - 1] || '', node);
    if (leaf) out.push({ ...leaf, path: [...pathParts] });
  }
}

function buildSkuTree(hasSkuTree) {
  if (!hasSkuTree?.skuMap) return { dimension1: '', leaves: [], maxDepth: 0 };
  const leaves = [];
  for (const [k, v] of Object.entries(hasSkuTree.skuMap)) {
    walkLeaves(v, [k], leaves);
  }
  const maxDepth = leaves.reduce((m, l) => Math.max(m, l.path.length), 0);
  return {
    dimension1: hasSkuTree.skuCategoryName || '类别',
    dimension2: leaves.some((l) => l.path.length >= 3) ? '套餐' : (hasSkuTree.skuMap && Object.values(hasSkuTree.skuMap)[0]?.subSku?.skuCategoryName) || '',
    dimension3: leaves.some((l) => l.path.length >= 3) ? '时长' : '',
    leaves,
    maxDepth
  };
}

const RECHARGE_TEMPLATES = {
  chatai: [
    { key: 'loginType', label: '登录方式', type: 'select', required: true, options: [{ value: 'chatgpt', label: 'ChatGPT专用' }], defaultValue: 'chatgpt' },
    { key: 'account', label: '账号', type: 'text', required: true, placeholder: '请输入账号' },
    { key: 'apiCode', label: 'api代码', type: 'text', required: true, placeholder: '请使用电脑在已登录GPT的浏览器获取代码', tip: '必须使用电脑浏览器获取代码' },
    { key: 'contact', label: '联系方式', type: 'text', required: true, placeholder: '请填写有效联系方式（手机号或者邮箱）' }
  ],
  default: [
    { key: 'account', label: '充值账号', type: 'text', required: true, placeholder: '请输入账号' },
    { key: 'contact', label: '联系方式', type: 'text', required: true, placeholder: '手机号或邮箱' }
  ]
};

function rechargeFieldsForLeaf(shortEn, path) {
  if (!path[0] || !String(path[0]).includes('代充')) return [];
  if (RECHARGE_TEMPLATES[shortEn]) return RECHARGE_TEMPLATES[shortEn];
  return RECHARGE_TEMPLATES.default;
}

module.exports = { buildSkuTree, rechargeFieldsForLeaf, parseLeaf };
