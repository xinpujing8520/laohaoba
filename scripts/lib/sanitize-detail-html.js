/**
 * Strip redundant leading banner images from scraped product detailHtml.
 * Keeps tutorial/screenshot images that appear after text content begins.
 */

function basename(url) {
  if (!url) return '';
  return String(url).split('/').pop().split('?')[0].toLowerCase();
}

function isImageOnlyParagraph(block) {
  const inner = block.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '').trim();
  if (!inner) return true;
  if (/^<img\b[^>]*\/?>(?:\s*<br\s*\/?>)?$/i.test(inner)) return true;
  if (/^(?:<img\b[^>]*\/?>\s*)+$/i.test(inner)) return true;
  return false;
}

function sanitizeDetailHtml(html, opts = {}) {
  let s = String(html || '').trim();
  if (!s) return s;

  const skipNames = new Set();
  for (const u of [opts.iconUrl, opts.coverImg, opts.heroIcon]) {
    const b = basename(u);
    if (b) skipNames.add(b);
  }

  // Remove leading image-only <p> blocks and empty <p><br></p>
  let changed = true;
  while (changed) {
    changed = false;
    const m = s.match(/^(\s*<p[^>]*>[\s\S]*?<\/p>)/i);
    if (!m) break;
    const block = m[1];
    if (isImageOnlyParagraph(block)) {
      s = s.slice(m[0].length).trim();
      changed = true;
      continue;
    }
    // Single <p> with only img matching hero/icon asset
    const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && skipNames.has(basename(imgMatch[1]))) {
      s = s.slice(m[0].length).trim();
      changed = true;
    }
  }

  return s.trim();
}

module.exports = { sanitizeDetailHtml, basename, isImageOnlyParagraph };
