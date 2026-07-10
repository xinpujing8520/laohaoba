/**
 * Collect product topics from category-display + library SKU leaves.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC_DATA = path.join(ROOT, 'public', 'data');

function loadJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function collectFromCategoryDisplay() {
  const display = loadJson(path.join(PUBLIC_DATA, 'category-display.json'));
  const topics = [];
  for (const [catId, items] of Object.entries(display)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const name = String(item.DisplayName || item.Name || '').trim();
      const productName = String(item.Name || name).trim();
      if (!name) continue;
      topics.push({
        key: `cd:${item.ID || item.LinkId || name}`,
        displayName: name,
        productName,
        productId: item.ID || item.LinkId || '',
        shortEn: item.ShortEn || '',
        categoryId: catId,
        categoryName: item.CategoryName || '',
        price: Number(item.Price) || 0,
        icon: item.IconUrl || item.ImageUrl || item.CoverImg || ''
      });
    }
  }
  return topics;
}

function collectFromLibrary(shortEn) {
  const fp = path.join(PUBLIC_DATA, 'library-pages', `${shortEn}.json`);
  if (!fs.existsSync(fp)) return [];
  const lib = loadJson(fp);
  const leaves = lib?.skuTree?.leaves || [];
  const displayName = lib.displayName || shortEn;
  return leaves.map((leaf) => ({
    key: `lib:${shortEn}:${leaf.productId || leaf.name}`,
    displayName,
    productName: leaf.path && leaf.path.length > 1
      ? `${displayName} | ${leaf.path.slice(1).join(' / ')}`
      : (leaf.name || displayName),
    productId: leaf.productId || '',
    shortEn,
    categoryId: lib.categoryId || '',
    categoryName: lib.categoryName || '',
    price: Number(leaf.price) || 0,
    icon: lib.iconUrl || ''
  }));
}

function loadAllTopics() {
  const map = new Map();
  for (const t of collectFromCategoryDisplay()) map.set(t.key, t);
  for (const shortEn of ['wechat', 'qq', 'tg', 'apple-id', 'gmail', 'chatai', 'X', 'Instagram', 'Google', 'fb', 'TK']) {
    for (const t of collectFromLibrary(shortEn)) {
      if (!map.has(t.key)) map.set(t.key, t);
    }
  }
  return [...map.values()];
}

function pickTopic(state, topics) {
  const used = new Set(state.usedKeys || []);
  const queue = topics.filter((t) => !used.has(t.key));
  const pool = queue.length ? queue : topics;
  if (!queue.length) {
    state.usedKeys = [];
    state.rotations = (state.rotations || 0) + 1;
  }
  const daySeed = new Date().toISOString().slice(0, 10);
  const idx = Math.abs(hash(daySeed + String(state.rotations || 0))) % pool.length;
  return pool[idx];
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return h;
}

const ARTICLE_TYPES = [
  { type: 'tutorial', label: '使用教程', titleTpl: '{name}怎么用？新手入门教程（{year}）' },
  { type: 'guide', label: '选购指南', titleTpl: '{name}怎么选？一文看懂常见规格与避坑' },
  { type: 'faq', label: '常见问题', titleTpl: '{name}常见问题解答：注册、登录与风控说明' },
  { type: 'tips', label: '实用技巧', titleTpl: '{name}实用技巧：老手都在用的 5 个细节' },
  { type: 'compare', label: '对比说明', titleTpl: '{name}和白号/新号有什么区别？该怎么买' }
];

function pickArticleType(state) {
  const i = (state.articleTypeIndex || 0) % ARTICLE_TYPES.length;
  return { ...ARTICLE_TYPES[i], index: i };
}

module.exports = {
  loadAllTopics,
  pickTopic,
  pickArticleType,
  ARTICLE_TYPES
};
