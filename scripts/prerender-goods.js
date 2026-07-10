/**
 * SSG: prerender product pages → public/goods/{id}.html
 */
const fs = require('fs');
const path = require('path');
const {
  buildHead, siteNotice, siteHeader, legalBar, closePage,
  rewriteContentLinks, productJsonLd, productUrl, categoryUrl,
  absUrl, truncate, stripHtml, escapeHtml
} = require('./lib/ssg-html');
const { sanitizeDetailHtml } = require('./lib/sanitize-detail-html');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'goods');

function loadJson(fp, fallback) {
  if (!fs.existsSync(fp)) return fallback;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function buildProductIndex() {
  const index = new Map();

  const catDisplay = loadJson(path.join(ROOT, 'public', 'data', 'category-display.json'), {});
  for (const list of Object.values(catDisplay)) {
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      const id = String(p.LinkId || p.ID || '');
      if (!id) continue;
      index.set(id, {
        productId: id,
        name: p.Name || p.DisplayName || '',
        displayName: p.DisplayName || String(p.Name || '').split(' | ')[0] || '',
        price: Number(p.Price) || 0,
        iconUrl: p.IconUrl || p.ImageUrl || '',
        image: p.IconUrl || p.CoverImg || p.ImageUrl || '',
        categoryName: p.CategoryName || p.categoryName || '商品',
        categoryId: p.CategoryId || '',
        shortEn: p.ShortEn || '',
        detailHtml: ''
      });
    }
  }

  const libDir = path.join(ROOT, 'public', 'data', 'library-pages');
  if (fs.existsSync(libDir)) {
    for (const file of fs.readdirSync(libDir).filter((f) => f.endsWith('.json'))) {
      const lib = loadJson(path.join(libDir, file), {});
      const base = {
        displayName: lib.displayName || '',
        iconUrl: lib.iconUrl || '',
        image: lib.iconUrl || lib.coverImg || '',
        categoryName: lib.categoryName || '商品',
        categoryId: lib.categoryId || '',
        shortEn: lib.shortEn || '',
        detailHtml: lib.detailHtml || ''
      };

      const leaves = lib.skuTree && lib.skuTree.leaves;
      if (Array.isArray(leaves)) {
        for (const leaf of leaves) {
          const id = String(leaf.productId || '');
          if (!id) continue;
          const prev = index.get(id) || {};
          index.set(id, {
            productId: id,
            name: leaf.path ? leaf.path.join(' | ') : (prev.name || base.displayName),
            displayName: base.displayName || prev.displayName || '',
            price: Number(leaf.price) || prev.price || 0,
            iconUrl: base.iconUrl || prev.iconUrl || '',
            image: base.image || prev.image || '',
            categoryName: base.categoryName || prev.categoryName || '商品',
            categoryId: base.categoryId || prev.categoryId || '',
            shortEn: base.shortEn || prev.shortEn || '',
            detailHtml: base.detailHtml || prev.detailHtml || ''
          });
        }
      }

      if (lib.defaultGameId) {
        const id = 'ab_' + lib.defaultGameId;
        const prev = index.get(id) || {};
        if (!index.has(id) || !prev.detailHtml) {
          index.set(id, Object.assign({}, prev, base, { productId: id, price: prev.price || 0 }));
        }
      }
    }
  }

  return index;
}

function renderProduct(data) {
  const id = data.productId;
  const canonical = productUrl(id);
  const title = data.displayName || data.name || '商品详情';
  const description = truncate(
    stripHtml(data.detailHtml) || '在老号吧购买' + title + '，USDT TRC20 扫码支付，即时发货。',
    160
  );
  const detailHtml = rewriteContentLinks(
    sanitizeDetailHtml(data.detailHtml || '', { iconUrl: data.iconUrl, coverImg: data.coverImg || data.image })
  );
  const price = Number(data.price);
  const priceText = Number.isFinite(price) ? price.toFixed(2) : '—';
  const buyUrl = '/goods.html?id=' + encodeURIComponent(id);

  let html = buildHead({
    title,
    description,
    canonical,
    image: absUrl(data.image || data.iconUrl),
    ogType: 'product',
    jsonLd: productJsonLd(data, canonical)
  });
  html += siteNotice();
  html += siteHeader();
  html += legalBar();
  html += `<div class="center ab-goods-page">
  <nav class="ab-breadcrumb">
    <a href="/">首页</a><span>›</span>
    <a href="${escapeHtml(categoryUrl(data.categoryId))}">${escapeHtml(data.categoryName || '商品')}</a><span>›</span>
    <span>${escapeHtml(title)}</span>
  </nav>
  <div class="ab-product-wrap">
    <div class="ab-product-main">
      <div class="ab-product-card">
        <div class="ab-goods-hero">`;
  if (data.iconUrl) {
    html += `\n          <img class="ab-goods-icon" src="${escapeHtml(data.iconUrl)}" alt="${escapeHtml(title)}">`;
  }
  html += `
          <h1 class="ab-product-title ab-product-title-hero">${escapeHtml(title)}</h1>
        </div>
        <div class="ab-badges">
          <div class="ab-badge"><span class="ab-badge-icon" aria-hidden="true">🛡</span><div><strong>官方渠道</strong><span>渠道正规可查</span></div></div>
          <div class="ab-badge"><span class="ab-badge-icon" aria-hidden="true">⚡</span><div><strong>极速发货</strong><span>5分钟内发货</span></div></div>
          <div class="ab-badge"><span class="ab-badge-icon" aria-hidden="true">💬</span><div><strong>24小时客服</strong><span>售后无忧</span></div></div>
        </div>`;
  if (data.name && data.name !== title) {
    html += `\n        <p style="margin:12px 0;color:#666;font-size:14px">规格：${escapeHtml(data.name)}</p>`;
  }
  html += `
        <div class="ab-price-lines" style="margin:20px 0">
          <div class="ab-price-line final"><span>到手价</span><span class="val">USDT ${priceText}</span></div>
        </div>
        <p><a class="ab-btn-red" href="${escapeHtml(buyUrl)}" style="display:inline-block;padding:12px 28px;text-decoration:none">立即购买</a></p>
        <h2 class="ab-section-title ab-section-title-bar">${escapeHtml(title)}商品详情</h2>`;
  if (detailHtml) {
    html += `\n        <div class="ab-detail-box">${detailHtml}</div>`;
  } else {
    html += `\n        <div class="ab-detail-box"><p>${escapeHtml(description)}</p></div>`;
  }
  html += `
      </div>
    </div>
  </div>
</div>`;

  html += closePage(buyUrl);
  return html;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const index = buildProductIndex();
  let count = 0;
  for (const [id, data] of index.entries()) {
    const out = path.join(OUT_DIR, id + '.html');
    fs.writeFileSync(out, renderProduct(data), 'utf8');
    count += 1;
  }
  console.log('Prerendered ' + count + ' goods pages → public/goods/');
  return count;
}

if (require.main === module) main();
module.exports = { main, buildProductIndex, renderProduct };
