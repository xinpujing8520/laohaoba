/**
 * Google Gemini generateContent API client.
 * Env: GEMINI_API_KEY, GEMINI_MODEL, GEMINI_API_BASE
 */
const https = require('https');
const http = require('http');

function getConfig() {
  return {
    apiKey: String(process.env.GEMINI_API_KEY || '').trim(),
    baseUrl: String(process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/$/, ''),
    model: String(process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim()
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
          return reject(new Error(`Gemini invalid JSON (${res.statusCode}): ${text.slice(0, 300)}`));
        }
        if (res.statusCode >= 400) {
          const msg = json.error?.message || json.message || text.slice(0, 300);
          return reject(new Error(`Gemini HTTP ${res.statusCode}: ${msg}`));
        }
        resolve(json);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function toGeminiPayload(messages) {
  let systemInstruction = null;
  const contents = [];

  for (const message of messages) {
    const text = String(message.content || '');
    if (message.role === 'system') {
      systemInstruction = { parts: [{ text }] };
      continue;
    }
    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text }]
    });
  }

  return { systemInstruction, contents };
}

function extractText(json) {
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text || '').join('').trim();
  if (!text) {
    const reason = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason || 'unknown';
    throw new Error(`Gemini returned empty content (${reason})`);
  }
  return text;
}

async function chat(messages, options = {}) {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const { systemInstruction, contents } = toGeminiPayload(messages);
  const payload = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.85,
      maxOutputTokens: options.maxTokens || 4096
    }
  };
  if (systemInstruction) payload.systemInstruction = systemInstruction;

  const selectedModel = options.model || model;
  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const json = await postJson(url, {}, payload);
  return extractText(json);
}

module.exports = { chat, getConfig };
