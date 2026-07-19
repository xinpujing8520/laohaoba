/**
 * SSG: prerender news listing pages → public/news/page-{n}.html
 * Page 1 is written to public/news.html (served at /news) as static HTML
 * so pagination never flashes the Vue SPA mustache template.
 * Pages 2+ are static HTML under public/news/.
 */
const fs = require('fs');
const path = require('path');
const {
  buildHead, siteNotice, siteHeader, legalBar, closePage,
  articleUrl, productUrl, absUrl, truncate, escapeHtml
} = require('./lib/ssg-html');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'news');

function loadJson(fp, fallback) {
  if (!fs.existsSync(fp)) return fallback;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function newsPageHref(page) {
  const p = Number(page) || 1;
  if (p <= 1) return '/news';
  return '/news/page-' + p;
}

function renderNewsPage(meta, items, page, totalPages) {
  const canonical = newsPageHref(page);
  const title = page > 1 ? meta.title + ' - 第' + page + '页' : meta.title;
  const description = truncate(meta.subtitle || '老号吧行业新闻与账号购买教程。', 160);

  let html = buildHead({
    title,
    description,
    canonical,
    ogType: 'website',
    prev: page > 1 ? newsPageHref(page - 1) : null,
    next: page < totalPages ? newsPageHref(page + 1) : null,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: absUrl(canonical)
    }
  });
  html += siteNotice();
  html += siteHeader();
  html += legalBar();
  html += `<div class="center ab-news-page">
  <nav class="ab-breadcrumb"><a href="/">首页</a><span>›</span><span>${escapeHtml(meta.title)}</span></nav>
  <div class="ab-news-page-head"><h1>${escapeHtml(meta.title)}</h1>`;
  if (meta.subtitle) html += `<p>${escapeHtml(meta.subtitle)}</p>`;
  html += `</div><div class="ab-news-list">`;

  for (const n of items) {
    const href = articleUrl(n.id);
    html += `<a class="ab-news-list-item" href="${escapeHtml(href)}">
      <div class="ab-news-list-cover"${n.cover ? ` style="background-image:url('${escapeHtml(n.cover)}')"` : ''} role="img" aria-label="${escapeHtml(n.title)}"></div>
      <div class="ab-news-list-body">
        <h2 class="ab-news-list-title">${escapeHtml(n.title)}</h2>`;
    if (n.summary) html += `<p class="ab-news-list-summary">${escapeHtml(n.summary)}</p>`;
    if (n.date) html += `<div class="ab-news-list-date">发布时间 ${escapeHtml(n.date)}</div>`;
    html += `</div></a>`;
  }

  html += '</div>';

  if (totalPages > 1) {
    html += '<div class="ab-pagination">';
    if (page > 1) {
      html += `<a class="ab-page-btn" href="${newsPageHref(page - 1)}">‹</a>`;
    }
    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - page) > 2) {
        if (p === 3 || p === totalPages - 2) html += '<span class="ab-page-btn ellipsis">…</span>';
        continue;
      }
      html += `<a class="ab-page-btn${p === page ? ' active' : ''}" href="${newsPageHref(p)}">${p}</a>`;
    }
    if (page < totalPages) {
      html += `<a class="ab-page-btn" href="${newsPageHref(page + 1)}">›</a>`;
    }
    html += '</div>';
  }

  const related = meta.relatedProducts || [];
  if (related.length) {
    html += '<section class="ab-goods-section"><h2 class="ab-section-title ab-section-title-bar">相关推荐</h2><div class="ab-related-row">';
    for (const item of related.slice(0, 8)) {
      html += `<a class="ab-related-card" href="${escapeHtml(productUrl(item.id))}">
        <img src="${escapeHtml(item.icon || '')}" alt="${escapeHtml(item.name)}" loading="lazy">
        <div class="ab-related-name">${escapeHtml(item.name)}</div></a>`;
    }
    html += '</div></section>';
  }

  html += '</div>';
  html += closePage('/news');
  return html;
}

function main() {
  const data = loadJson(path.join(ROOT, 'public', 'data', 'news-list.json'), { items: [], totalPages: 1, pageSize: 10 });
  const meta = {
    title: data.title || '新闻资讯',
    subtitle: data.subtitle || '',
    relatedProducts: data.relatedProducts || []
  };
  const items = data.items || [];
  const pageSize = data.pageSize || 10;
  const totalPages = data.totalPages || Math.max(1, Math.ceil(items.length / pageSize));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let count = 0;

  for (let page = 2; page <= totalPages; page++) {
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    const out = path.join(OUT_DIR, 'page-' + page + '.html');
    fs.writeFileSync(out, renderNewsPage(meta, pageItems, page, totalPages), 'utf8');
    count += 1;
  }

  // Page 1 → news.html (Cloudflare serves /news from news.html) — fully static, no Vue flash
  const page1 = renderNewsPage(meta, items.slice(0, pageSize), 1, totalPages);
  fs.writeFileSync(path.join(ROOT, 'public', 'news.html'), page1, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'page-1.html'), page1, 'utf8');
  count += 1;

  console.log('Prerendered ' + count + ' news pages → public/news.html + public/news/');
  return count;
}

if (require.main === module) main();
module.exports = { main };
