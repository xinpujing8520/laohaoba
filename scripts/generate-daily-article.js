/**
 * Daily article bot — one article per run, themed on shop products.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/generate-daily-article.js
 *   DEEPSEEK_API_KEY=sk-... node scripts/generate-daily-article.js
 *   node scripts/generate-daily-article.js --dry-run   # template only, no API
 *
 * Flow: Gemini/DeepSeek draft → HK polish → rule polish → publish JSON
 */
const fs = require('fs');
const path = require('path');
const { chat } = require('./lib/llm-client');
const { hkDeepseekPolish, SYSTEM } = require('./lib/hk-deepseek-polish');
const { loadAllTopics, pickTopic, pickArticleType } = require('./lib/article-topics');

const ROOT = path.join(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'public', 'data', 'articles');
const NEWS_LIST = path.join(ROOT, 'public', 'data', 'news-list.json');
const HOME_CONTENT = path.join(ROOT, 'public', 'data', 'home-content.json');
const STATE_FILE = path.join(__dirname, 'article-bot-state.json');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_POLISH = process.argv.includes('--skip-polish');

function loadJson(fp, fallback) {
  if (!fs.existsSync(fp)) return fallback;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function saveJson(fp, data) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextArticleId() {
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => /^\d+\.json$/.test(f));
  let max = 2000;
  for (const f of files) {
    const n = Number(path.basename(f, '.json'));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `article-${Date.now()}`;
}

function buildDraftPrompt(topic, articleType) {
  const year = new Date().getFullYear();
  const goodsLink = topic.productId
    ? `https://www.laohaoba.com/goods.html?id=${encodeURIComponent(topic.productId)}`
    : 'https://www.laohaoba.com/';
  const titleHint = articleType.titleTpl
    .replace('{name}', topic.displayName || topic.productName)
    .replace('{year}', String(year));

  return `请为一篇「${articleType.label}」写文章，主题是：${topic.productName}
所属分类：${topic.categoryName || '老号吧商品'}
参考售价：约 ${topic.price || '—'} USDT（结算币种 USDT TRC20）

标题参考（可微调）：${titleHint}

要求：
1. 输出严格 JSON，不要 markdown 代码块：
{"title":"...","summary":"120字以内","content":"<!--HTML-->..."}
2. content 用 HTML：h2/h3、p、ul/li、strong，至少 4 个小节
3. 自然介绍 ${topic.displayName || topic.productName} 的用途、适用人群、购买注意事项
4. 文末自然引导到 <a href="${goodsLink}">老号吧${topic.displayName || topic.productName}</a>
5. 不要编造具体售后政策，支付写 USDT TRC20 扫码
6. 字数 900-1400 字，口语化，避免 AI 套话`;
}

function dryRunArticle(topic, articleType) {
  const title = articleType.titleTpl
    .replace('{name}', topic.displayName || topic.productName)
    .replace('{year}', String(new Date().getFullYear()));
  const link = topic.productId ? `/goods.html?id=${topic.productId}` : '/';
  return {
    title,
    summary: `关于${topic.productName}的${articleType.label}，帮你看懂怎么选、怎么用、有哪些坑要注意。`,
    content: `<!--HTML--><p>不少人在接触${topic.productName}时，最头疼的不是价格，而是不知道从哪下手。这篇按${articleType.label}的思路，把关键步骤讲清楚。</p><h2><strong>一、${topic.displayName || topic.productName}适合谁？</strong></h2><p>如果你需要稳定可用的账号做日常登录、业务测试或团队分工，${topic.productName}会比临时注册省事很多。买之前先想清楚自己的使用场景，别盲目追高价规格。</p><h2><strong>二、选购时要注意什么</strong></h2><ul><li>看清商品名称里的地区、年限、实名状态等关键词</li><li>首登后尽快改密、绑定自己能控制的验证方式</li><li>网络环境不稳定时，先小规模试单更稳妥</li></ul><h2><strong>三、到手后建议这样操作</strong></h2><p>付款后按订单页提示提取卡密，登录成功后别急着大批量操作。先完成基础设置，确认功能正常，再逐步放量。</p><h2><strong>四、在哪买更省心</strong></h2><p>老号吧支持 USDT TRC20 扫码支付，下单流程简单。需要同款可以看看：<a href="${link}">老号吧${topic.displayName || topic.productName}</a>。</p><p><strong>划重点：</strong>虚拟商品发货后除账密问题外一般不退款，下单前务必确认规格。</p>`
  };
}

async function generateDraft(topic, articleType) {
  if (DRY_RUN) return dryRunArticle(topic, articleType);
  const reply = await chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: buildDraftPrompt(topic, articleType) }
  ], { temperature: 0.8, maxTokens: 5000 });

  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0) throw new Error('Draft response is not JSON');
  const parsed = JSON.parse(reply.slice(start, end + 1));
  if (!parsed.title || !parsed.content) throw new Error('Draft JSON missing title/content');
  return parsed;
}

function prependNewsItem(newsList, item) {
  const items = newsList.items || [];
  const filtered = items.filter((x) => x.id !== item.id);
  newsList.items = [item, ...filtered];
  newsList.total = (newsList.total || items.length) + (filtered.length === items.length ? 1 : 0);
  const pageSize = newsList.pageSize || 10;
  newsList.totalPages = Math.max(1, Math.ceil(newsList.items.length / pageSize));
  return newsList;
}

function prependHomeNews(home, item) {
  const news = home.news || [];
  home.news = [item, ...news.filter((x) => x.id !== item.id)].slice(0, 10);
  return home;
}

async function main() {
  const state = loadJson(STATE_FILE, {
    usedKeys: [],
    articleTypeIndex: 0,
    rotations: 0,
    lastRun: null,
    lastArticleId: null
  });

  const topics = loadAllTopics();
  if (!topics.length) throw new Error('No product topics found');

  const topic = pickTopic(state, topics);
  const articleType = pickArticleType(state);
  console.log(`Topic: ${topic.productName} (${topic.key})`);
  console.log(`Type: ${articleType.label}`);

  let draft = await generateDraft(topic, articleType);
  let article;
  if (DRY_RUN || SKIP_POLISH) {
    const { polishArticle } = require('./lib/polish-text');
    article = polishArticle({ ...draft, id: 0 });
  } else {
    article = await hkDeepseekPolish(draft);
  }

  const id = nextArticleId();
  const cover = topic.icon || '/assets/laohaoba-logo.svg';
  const newsItem = {
    id,
    title: article.title,
    summary: article.summary,
    cover,
    date: today(),
    slug: slugify(article.title)
  };

  const fullArticle = {
    id,
    title: article.title,
    summary: article.summary,
    cover,
    date: today(),
    content: article.content.startsWith('<!--HTML-->') ? article.content : `<!--HTML-->${article.content}`,
    slug: newsItem.slug,
    productId: topic.productId || '',
    topicKey: topic.key,
    articleType: articleType.type,
    generatedBy: 'article-bot',
    polishedAt: article.polishedAt || today(),
    polishVersion: article.polishVersion || 1,
    hkDeepseekAt: article.hkDeepseekAt || (DRY_RUN ? '' : today()),
    hkDeepseekVersion: article.hkDeepseekVersion || (DRY_RUN ? 0 : 1)
  };

  saveJson(path.join(ARTICLES_DIR, `${id}.json`), fullArticle);

  const newsList = loadJson(NEWS_LIST, { items: [], total: 0, pageSize: 10, totalPages: 1 });
  saveJson(NEWS_LIST, prependNewsItem(newsList, newsItem));

  const home = loadJson(HOME_CONTENT, { news: [] });
  saveJson(HOME_CONTENT, prependHomeNews(home, newsItem));

  state.usedKeys = [...(state.usedKeys || []), topic.key];
  state.articleTypeIndex = (articleType.index + 1) % 5;
  state.lastRun = new Date().toISOString();
  state.lastArticleId = id;
  saveJson(STATE_FILE, state);

  console.log(`Published article #${id}: ${article.title}`);
  console.log(`Files: articles/${id}.json, news-list.json, home-content.json`);

  try {
    require('child_process').execSync('node scripts/generate-sitemap.js', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.warn('[article-bot] sitemap regen skipped:', e.message);
  }
}

main().catch((e) => {
  console.error('[article-bot]', e.message || e);
  process.exit(1);
});
