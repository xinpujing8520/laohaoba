/**
 * Remove fake/competitor domains from public content:
 * acceboy.com / accaboy.com / accboy.com / accountboy.com / zuhaohao.com
 * and affiliate-looking *.accboy*.laohaoba.com subdomains.
 */
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const SITE = 'https://www.laohaoba.com';
const SITE_HOST = 'www.laohaoba.com';

const FAKE_HOST =
  '(?:acceboy|accaboy|accboy|accountboy|zuhaohao)\\.(?:com|cn|net|org)';

function scrubText(s) {
  if (!s || typeof s !== 'string') return s;
  let t = s;

  // Affiliate subdomains like https://accboyduoplus.laohaoba.com/
  t = t.replace(
    /https?:\/\/[a-z0-9-]*(?:acceboy|accaboy|accboy|accountboy)[a-z0-9-]*\.laohaoba\.com\/?/gi,
    SITE + '/'
  );

  // Absolute fake domains (any path)
  t = t.replace(
    new RegExp(`https?:\\/\\/(?:www\\.)?${FAKE_HOST}[^\\s"'<>]*`, 'gi'),
    SITE + '/'
  );

  // Bare www.fake.com / fake.com (not part of a longer token)
  t = t.replace(
    new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?${FAKE_HOST}`, 'gi'),
    SITE_HOST
  );

  // Anchor text that is only the fake domain → laohaoba
  t = t.replace(
    /(<a\b[^>]*>)\s*(?:https?:\/\/)?(?:www\.)?(?:acceboy|accaboy|accboy|accountboy|zuhaohao)\.(?:com|cn|net|org)\s*(<\/a>)/gi,
    `$1${SITE_HOST}$2`
  );

  // Promo copy leftovers: 「联盟推广域名为…」「达人推广：二级域名+…」
  t = t.replace(
    /，?\s*联盟推广域名为\s*<a\b[^>]*>[^<]*<\/a>\s*，?\s*以及子站\s*<a\b[^>]*>[^<]*<\/a>/gi,
    ''
  );
  t = t.replace(
    /达人推广：\s*二级域名\+?\s*<a\b[^>]*>[^<]*<\/a>/gi,
    `达人推广：请认准官网 <a href="/">${SITE_HOST}</a>`
  );
  t = t.replace(
    /或\s*(?:https?:\/\/)?(?:www\.)?(?:acceboy|accaboy|accboy)\.com\s*访问/gi,
    `或 ${SITE} 访问`
  );

  // Final sweep for leftover bare host strings in prose
  t = t.replace(
    new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?${FAKE_HOST}`, 'gi'),
    SITE_HOST
  );

  return t;
}

function walk(obj) {
  if (typeof obj === 'string') return scrubText(obj);
  if (Array.isArray(obj)) return obj.map(walk);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = walk(v);
    return out;
  }
  return obj;
}

function processJsonFile(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  if (!/(?:acceboy|accaboy|accboy|accountboy\.com|zuhaohao\.com)/i.test(raw)) {
    return false;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return false;
  }
  const next = walk(data);
  if (JSON.stringify(next) === JSON.stringify(data)) return false;
  fs.writeFileSync(fp, JSON.stringify(next, null, 2) + '\n', 'utf8');
  return true;
}

function walkDir(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walkDir(fp, out);
    else if (name.endsWith('.json')) out.push(fp);
  }
  return out;
}

function main() {
  const files = walkDir(path.join(PUBLIC, 'data'));
  let n = 0;
  for (const fp of files) {
    if (processJsonFile(fp)) {
      n += 1;
      console.log('scrubbed', path.relative(PUBLIC, fp));
    }
  }

  // Also scrub prerendered article HTML if present
  const artDir = path.join(PUBLIC, 'article');
  if (fs.existsSync(artDir)) {
    for (const name of fs.readdirSync(artDir).filter((f) => f.endsWith('.html'))) {
      const fp = path.join(artDir, name);
      const raw = fs.readFileSync(fp, 'utf8');
      const next = scrubText(raw);
      if (next !== raw) {
        fs.writeFileSync(fp, next, 'utf8');
        n += 1;
        console.log('scrubbed', path.relative(PUBLIC, fp));
      }
    }
  }

  // Verify
  let left = 0;
  for (const fp of walkDir(path.join(PUBLIC, 'data'))) {
    const t = fs.readFileSync(fp, 'utf8');
    if (/(?:acceboy|accaboy|accboy\.com|accountboy\.com|zuhaohao\.com)/i.test(t)) {
      left += 1;
      console.log('REMAINING', path.relative(PUBLIC, fp));
    }
  }
  console.log(`Done. files changed: ${n}, remaining hits: ${left}`);
}

main();
