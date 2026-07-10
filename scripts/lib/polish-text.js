/**
 * Rule-based colloquial polish for 老号吧 article copy.
 * Pass 2 after JSON scrape — preserves HTML tags, href, src.
 */

const PHRASES = [
  [/账号星球（AccountBoy）/g, '老号吧'],
  [/账号星球/g, '老号吧'],
  [/AccountBoy/g, '老号吧'],
  [/我们将为您?讲解/g, '这篇给你讲清楚'],
  [/我们将为你讲解/g, '这篇给你讲清楚'],
  [/今天我们将/g, '这篇'],
  [/首先需要注意的是/g, '先说明一下'],
  [/首先需要说明的是/g, '先说明一下'],
  [/需要注意的是/g, '要注意'],
  [/请注意/g, '注意'],
  [/本文将/g, '这篇会'],
  [/本文/g, '这篇'],
  [/综上所述/g, '总的来说'],
  [/与此同时/g, '同时'],
  [/此外，/g, '另外，'],
  [/因此，/g, '所以，'],
  [/然而，/g, '不过，'],
  [/不妨/g, '可以'],
  [/即可/g, '就能'],
  [/便可/g, '就能'],
  [/方可/g, '才能'],
  [/务必/g, '一定要'],
  [/敬请/g, '请'],
  [/谅解/g, '理解'],
  [/用户/g, '大家'],
  [/朋友们/g, '大家'],
  [/小伙伴们/g, '大家'],
  [/小伙伴们/g, '大家'],
  [/去哪儿购买/g, '去哪买'],
  [/购买方法不太了解/g, '不知道怎么买'],
  [/不太了解/g, '不太清楚'],
  [/进行操作/g, '操作'],
  [/进行注册/g, '注册'],
  [/进行验证/g, '验证'],
  [/予以/g, ''],
  [/旨在/g, '主要是'],
  [/据悉/g, ''],
  [/据了解/g, ''],
  [/值得一提的是/g, '顺便说一句'],
  [/毫无疑问/g, ''],
  [/毫无疑问，/g, ''],
  [/毫无疑问/g, ''],
  [/毫无疑问/g, ''],
  [/5分钟发货超时赔偿保证/g, '5分钟发货，超时赔付'],
  [/7X24小时客服在线/g, '7×24小时客服在线'],
  [/当然来老号吧/g, '来老号吧就行'],
  [/支持支付宝，微信，币安等/g, '支持支付宝、微信、币安等'],
  [/，,/g, '，'],
  [/。。/g, '。'],
  [/！!/g, '！'],
  [/？？/g, '？'],
  [/\s{2,}/g, ' ']
];

const OPENERS = [
  [/^(很多用户对于)/, '不少人'],
  [/^(对于.*?(?:不太了解|不清楚))/, '如果你$1'],
];

function polishPlainText(text) {
  if (!text || !text.trim()) return text;
  let s = text.trim();
  s = s.replace(/中国用户/g, '\u0000CNUSER\u0000');
  for (const [re, rep] of OPENERS) s = s.replace(re, rep);
  for (const [re, rep] of PHRASES) s = s.replace(re, rep);
  s = s.replace(/\u0000CNUSER\u0000/g, '中国用户');
  // soften stiff enumerations
  s = s.replace(/按照以下步骤操作：/g, '按下面步骤来：');
  s = s.replace(/请按照以下步骤/g, '按下面步骤');
  s = s.replace(/具体操作如下/g, '具体这样做');
  s = s.replace(/具体如下/g, '具体是这样');
  return s.replace(/\s+/g, ' ').trim();
}

function splitHtmlSegments(html) {
  const parts = [];
  const re = /(<[^>]+>)|([^<]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    parts.push({ tag: !!m[1], text: m[1] || m[2] || '' });
  }
  return parts;
}

function isSkippableTag(tag) {
  return /^<(script|style|code|pre|img|a\s|\/a|br|hr|iframe|video|source)\b/i.test(tag);
}

function polishHtml(html) {
  if (!html || typeof html !== 'string') return html;
  const prefix = html.startsWith('<!--HTML-->') ? '<!--HTML-->' : '';
  const body = prefix ? html.slice(prefix.length) : html;
  const parts = splitHtmlSegments(body);
  const out = parts.map((p) => {
    if (p.tag) {
      if (isSkippableTag(p.text)) return p.text;
      // polish title/alt in tags sparingly
      return p.text.replace(/title="([^"]*)"/g, (_, t) => `title="${polishPlainText(t)}"`)
        .replace(/alt="([^"]*)"/g, (_, t) => `alt="${polishPlainText(t)}"`);
    }
    return polishPlainText(p.text);
  }).join('');
  return prefix + out;
}

function polishArticle(article) {
  return {
    ...article,
    title: polishPlainText(article.title || ''),
    summary: polishPlainText(article.summary || ''),
    content: polishHtml(article.content || ''),
    polishedAt: new Date().toISOString().slice(0, 10),
    polishVersion: 1
  };
}

module.exports = { polishPlainText, polishHtml, polishArticle };
