/**
 * HK-DeepSeek 文风优化：两阶段 DeepSeek 润色 + 规则收口。
 * 目标：口语化、去 AI 味、长短句交替、自然过渡，保留 HTML 结构。
 */
const { chat } = require('./deepseek-client');
const { polishArticle } = require('./polish-text');

const SYSTEM = `你是老号吧（laohaoba.com）的内容编辑，擅长写海外账号、数字产品教程。
写作要求（HK-DeepSeek 手法）：
1. 语气像资深玩家跟朋友聊天，不要公文腔和营销腔
2. 禁止「首先、其次、再次、综上所述、值得一提的是、毫无疑问」等 AI 套话
3. 开头用场景或痛点切入，不要「本文将介绍」
4. 段落长短交替，每段 2-4 句，重点句可加粗
5. 「用户」改为「大家」，品牌统一为「老号吧」
6. 保留所有 HTML 标签、链接 href、图片 src，只改可见文字
7. 适当加入 1-2 个反问句增强互动感
8. 结尾给出可执行建议，自然提及老号吧购买入口（不要硬广）`;

const POLISH_USER = (article) => `请按 HK-DeepSeek 手法优化下面这篇文章，保持原意和信息量，降低 AI 痕迹。

输出严格 JSON（不要 markdown 代码块）：
{"title":"...","summary":"120字以内摘要","content":"<!--HTML-->...完整 HTML 正文..."}

原标题：${article.title}
原摘要：${article.summary}
正文 HTML：
${article.content}`;

function extractJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1].trim() : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON in DeepSeek polish response');
  return JSON.parse(body.slice(start, end + 1));
}

async function hkDeepseekPolish(article) {
  const reply = await chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: POLISH_USER(article) }
  ], { temperature: 0.7, maxTokens: 6000 });

  const parsed = extractJson(reply);
  const merged = {
    ...article,
    title: parsed.title || article.title,
    summary: parsed.summary || article.summary,
    content: parsed.content || article.content,
    hkDeepseekAt: new Date().toISOString().slice(0, 10),
    hkDeepseekVersion: 1
  };
  return polishArticle(merged);
}

module.exports = { hkDeepseekPolish, SYSTEM };
