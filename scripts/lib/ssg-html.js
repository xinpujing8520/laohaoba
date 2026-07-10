/**
 * Shared HTML builders for SSG prerender scripts.
 */
const SITE = 'https://www.laohaoba.com';
const BRAND = '老号吧';
const DEFAULT_IMAGE = SITE + '/assets/laohaoba-logo.svg';
const CSS_VER = '16';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function absUrl(path) {
  if (!path) return SITE + '/';
  if (/^https?:\/\//i.test(path)) return path;
  return SITE + (path.startsWith('/') ? path : '/' + path);
}

function productUrl(id) {
  const pid = String(id || '').replace(/\.html$/i, '');
  return '/goods/' + encodeURIComponent(pid) + '.html';
}

function articleUrl(id) {
  return '/article/' + encodeURIComponent(id) + '.html';
}

function categoryUrl(catId) {
  return catId ? '/?cat=' + encodeURIComponent(catId) : '/';
}

function buildHead(opts) {
  const title = opts.title || BRAND;
  const fullTitle = title.includes(BRAND) ? title : title + ' - ' + BRAND;
  const description = escapeHtml(opts.description || '');
  const canonical = absUrl(opts.canonical || '/');
  const image = absUrl(opts.image || DEFAULT_IMAGE);
  const robots = opts.robots || 'index,follow,max-image-preview:large';
  const ogType = opts.ogType || 'website';

  let head = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="${BRAND}">
  <meta property="og:locale" content="zh_CN">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="icon" href="/assets/laohaoba-logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/laohaoba.css?v=${CSS_VER}">`;

  if (opts.prev) head += `\n  <link rel="prev" href="${escapeHtml(absUrl(opts.prev))}">`;
  if (opts.next) head += `\n  <link rel="next" href="${escapeHtml(absUrl(opts.next))}">`;

  if (opts.jsonLd) {
    head += `\n  <script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>`;
  }

  head += '\n</head>\n<body>\n<div class="ab-site">\n';
  return head;
}

function siteNotice() {
  return `<div class="ab-notice">
  <div class="center ab-notice-inner">
    <span class="ab-notice-tag">NOTICE</span>
    <span>警惕仿冒网站，保护您的资金安全！</span>
    <a href="https://t.me/xiaoqi2888" target="_blank" rel="noopener">→</a>
  </div>
</div>`;
}

function siteHeader() {
  return `<header class="ab-header">
  <div class="center ab-header-inner">
    <a class="ab-logo" href="/">
      <img src="/assets/laohaoba-logo.svg" width="48" height="48" alt="${BRAND}">
      <span class="ab-logo-text"><em>${BRAND}</em> <small>LaoHaoBa</small></span>
    </a>
    <form class="ab-search" action="/" method="get">
      <input type="search" name="key" placeholder="搜索商品" aria-label="搜索商品">
      <button type="submit" aria-label="搜索">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      </button>
    </form>
    <div class="ab-header-links">
      <a class="ab-btn-gold" href="https://t.me/xiaoqi2888" target="_blank" rel="noopener">推广合作</a>
      <a class="ab-btn-outline" href="/order/search.html">订单查询</a>
      <a class="ab-btn-red" href="https://t.me/xiaoqi2888" target="_blank" rel="noopener">联系客服</a>
    </div>
  </div>
</header>`;
}

function legalBar() {
  return '<div class="ab-legal-bar">凡购买本站任何商品必须遵守各个国家法律法规及各大平台规则，非法用途一切后果自负，本站不承担任何法律及连带责任！</div>';
}

function siteFooter() {
  return `<footer class="ab-footer">
  <div class="center">
    <div class="ab-footer-grid">
      <div>
        <img src="/assets/laohaoba-logo.svg" width="48" height="48" alt="${BRAND}" style="margin-bottom:12px;border-radius:10px">
        <p style="font-size:13px;line-height:1.8;color:rgba(255,255,255,.6)">${BRAND} — 海外账号购买平台，USDT TRC20 扫码支付，即时发货。</p>
      </div>
      <div>
        <h4>合作互动</h4>
        <a href="https://t.me/xiaoqi2888" target="_blank" rel="noopener">推广合作</a>
        <a href="/">关于我们</a>
      </div>
      <div>
        <h4>法律法规</h4>
        <a href="/policy.html">退换货说明</a>
        <a href="/policy.html#refund">退款说明</a>
        <a href="/policy.html#pay">支付说明</a>
      </div>
      <div>
        <h4>服务支持</h4>
        <a href="https://t.me/xiaoqi2888" target="_blank" rel="noopener">联系我们</a>
        <a href="/order/search.html">订单查询</a>
      </div>
    </div>
    <div class="ab-footer-bottom">${BRAND} LaoHaoBa.com &copy; 2026</div>
  </div>
</footer>`;
}

function closePage(interactiveUrl) {
  let tail = '</div>\n';
  if (interactiveUrl) {
    tail += `<p class="center" style="padding:12px 20px 24px;font-size:13px;color:#666">
  <a href="${escapeHtml(interactiveUrl)}">进入交互购买页面 →</a>
</p>\n`;
  }
  tail += siteFooter() + '\n</body>\n</html>\n';
  return tail;
}

function rewriteContentLinks(html) {
  return String(html || '')
    .replace(/href="\/goods\.html\?id=([^"#]+)"/gi, (_, id) => `href="${productUrl(decodeURIComponent(id))}"`)
    .replace(/href="\/article\.html\?id=(\d+)"/gi, (_, id) => `href="${articleUrl(id)}"`);
}

function articleJsonLd(article, canonical) {
  const title = article.title || '';
  const desc = truncate(article.summary || stripHtml(article.content), 160);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: '新闻资讯', item: SITE + '/news.html' },
          { '@type': 'ListItem', position: 3, name: title, item: SITE + canonical }
        ]
      },
      {
        '@type': 'Article',
        headline: title,
        description: desc,
        image: absUrl(article.cover),
        datePublished: article.date || undefined,
        author: { '@type': 'Organization', name: BRAND },
        publisher: { '@type': 'Organization', name: BRAND, logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE } },
        mainEntityOfPage: SITE + canonical
      }
    ]
  };
}

function productJsonLd(data, canonical) {
  const name = data.displayName || data.name || '商品';
  const desc = truncate(data.description || stripHtml(data.detailHtml), 160);
  const price = Number(data.price);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: data.categoryName || '商品', item: SITE + categoryUrl(data.categoryId) },
          { '@type': 'ListItem', position: 3, name: name, item: SITE + canonical }
        ]
      },
      {
        '@type': 'Product',
        name,
        description: desc,
        image: absUrl(data.image || data.iconUrl),
        brand: { '@type': 'Brand', name: BRAND },
        offers: {
          '@type': 'Offer',
          url: SITE + canonical,
          priceCurrency: 'USD',
          price: Number.isFinite(price) ? price.toFixed(2) : '0.00',
          availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: BRAND }
        }
      }
    ]
  };
}

module.exports = {
  SITE,
  BRAND,
  DEFAULT_IMAGE,
  escapeHtml,
  stripHtml,
  truncate,
  absUrl,
  productUrl,
  articleUrl,
  categoryUrl,
  buildHead,
  siteNotice,
  siteHeader,
  legalBar,
  siteFooter,
  closePage,
  rewriteContentLinks,
  articleJsonLd,
  productJsonLd
};
