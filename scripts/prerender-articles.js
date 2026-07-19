/**
 * SSG: prerender article JSON → public/article/{id}.html
 */
const fs = require('fs');
const path = require('path');
const {
  buildHead, siteNotice, siteHeader, legalBar, closePage,
  rewriteContentLinks, articleJsonLd, articleUrl, absUrl, truncate, stripHtml, escapeHtml
} = require('./lib/ssg-html');

const ROOT = path.join(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'public', 'data', 'articles');
const OUT_DIR = path.join(ROOT, 'public', 'article');

function stripLeadingCoverDuplicate(html, cover) {
  let out = String(html || '');
  if (cover) {
    const esc = String(cover).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(
      new RegExp(`^(?:<!--HTML-->)?\\s*<p>\\s*<img[^>]+src=["']${esc}["'][^>]*>\\s*</p>\\s*`, 'i'),
      (m) => (m.startsWith('<!--HTML-->') ? '<!--HTML-->' : '')
    );
  }
  out = out.replace(
    /^(?:<!--HTML-->)?\s*<p>\s*<img[^>]+src=["']\/assets\/images\/covers\/[^"']+["'][^>]*>\s*<\/p>\s*/i,
    (m) => (m.startsWith('<!--HTML-->') ? '<!--HTML-->' : '')
  );
  return out;
}

function renderArticle(article) {
  const id = article.id;
  const canonical = articleUrl(id);
  const description = truncate(article.summary || stripHtml(article.content), 160);
  const rawContent = stripLeadingCoverDuplicate(
    article.content && article.content.startsWith('<!--HTML-->')
      ? article.content
      : '<!--HTML-->' + (article.content || ''),
    article.cover
  );
  const content = rewriteContentLinks(rawContent);

  let html = buildHead({
    title: article.title,
    description,
    canonical,
    image: absUrl(article.cover),
    keywords: article.title,
    ogType: 'article',
    jsonLd: articleJsonLd(article, canonical)
  });
  html += siteNotice();
  html += siteHeader();
  html += legalBar();
  html += `<div class="center ab-article-page">
  <nav class="ab-breadcrumb">
    <a href="/">首页</a><span>›</span>
    <a href="/news">新闻&amp;促销</a><span>›</span>
    <span>${escapeHtml(article.title)}</span>
  </nav>
  <article class="ab-article-card">`;
  if (article.cover) {
    // Decorative hero: h1 already carries the title — avoid repeating it as visible alt on broken imgs
    html += `\n    <img class="ab-article-cover" src="${escapeHtml(article.cover)}" alt="" width="1200" height="630" loading="eager">`;
  }
  html += `
    <h1 class="ab-article-title">${escapeHtml(article.title)}</h1>`;
  if (article.date) {
    html += `\n    <div class="ab-article-meta"><time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time></div>`;
  }
  html += `
    <div class="ab-article-content">${content.replace(/^<!--HTML-->/, '')}</div>
  </article>
</div>`;

  // No SPA fallback link — static page is the canonical article view.
  html += closePage(null);
  return html;
}

function main() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    console.log('No articles directory, skip.');
    return 0;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => /^\d+\.json$/.test(f));
  let count = 0;
  for (const file of files) {
    const article = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8'));
    if (!article.id || !article.title) continue;
    const out = path.join(OUT_DIR, article.id + '.html');
    fs.writeFileSync(out, renderArticle(article), 'utf8');
    count += 1;
  }
  console.log('Prerendered ' + count + ' articles → public/article/');
  return count;
}

if (require.main === module) main();
module.exports = { main, renderArticle };
