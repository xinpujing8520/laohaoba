const fs = require('fs');

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

const html = fs.readFileSync(__dirname + '/ab-home.html', 'utf8');
const props = extractJson(html, 'window.__INIT_STATIC_PROPS__');
const d = props[Object.keys(props).find((k) => k.startsWith('static-props'))];

console.log('news', Array.isArray(d.news) ? d.news.length : d.news);
if (d.news?.[0]) console.log('news sample', JSON.stringify(d.news[0], null, 2).slice(0, 800));

console.log('commentList', Array.isArray(d.commentList) ? d.commentList.length : d.commentList);
if (d.commentList?.[0]) console.log('comment sample', JSON.stringify(d.commentList[0], null, 2).slice(0, 800));

console.log('recommendList', d.recommendList?.length);
