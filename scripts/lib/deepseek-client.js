/**
 * DeepSeek OpenAI-compatible chat API client.
 * Env: DEEPSEEK_API_KEY, DEEPSEEK_API_BASE, DEEPSEEK_MODEL
 */
const https = require('https');
const http = require('http');

function getConfig() {
  return {
    apiKey: String(process.env.DEEPSEEK_API_KEY || '').trim(),
    baseUrl: String(process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com').replace(/\/$/, ''),
    model: String(process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim()
  };
}

function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    const req = client.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          return reject(new Error(`DeepSeek invalid JSON (${res.statusCode}): ${text.slice(0, 300)}`));
        }
        if (res.statusCode >= 400) {
          const msg = json.error?.message || json.message || text.slice(0, 300);
          return reject(new Error(`DeepSeek HTTP ${res.statusCode}: ${msg}`));
        }
        resolve(json);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function chat(messages, options = {}) {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not set');
  }
  const payload = {
    model: options.model || model,
    messages,
    temperature: options.temperature ?? 0.85,
    max_tokens: options.maxTokens || 4096,
    stream: false
  };
  const json = await postJson(`${baseUrl}/v1/chat/completions`, {
    Authorization: `Bearer ${apiKey}`
  }, payload);
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek returned empty content');
  return String(content).trim();
}

module.exports = { chat, getConfig };
