/**
 * Unified LLM client for article bot.
 * Prefers Gemini when GEMINI_API_KEY is set, otherwise falls back to DeepSeek.
 */
const gemini = require('./gemini-client');
const deepseek = require('./deepseek-client');

function getProvider() {
  if (String(process.env.GEMINI_API_KEY || '').trim()) return 'gemini';
  if (String(process.env.DEEPSEEK_API_KEY || '').trim()) return 'deepseek';
  return '';
}

async function chat(messages, options = {}) {
  const provider = getProvider();
  if (provider === 'gemini') return gemini.chat(messages, options);
  if (provider === 'deepseek') return deepseek.chat(messages, options);
  throw new Error('GEMINI_API_KEY or DEEPSEEK_API_KEY not set');
}

module.exports = { chat, getProvider };
