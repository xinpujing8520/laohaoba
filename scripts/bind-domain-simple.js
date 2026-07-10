import fs from 'fs';
import os from 'os';
import path from 'path';

const ACCOUNT_ID = 'a2914fcdba0c8690e9b7f841029d6d9d';
const PROJECT = 'zhanghaoya';
const domains = ['laohaoba.com', 'www.laohaoba.com'];

function readToken() {
  const file = path.join(os.homedir(), '.wrangler', 'config', 'default.toml');
  const text = fs.readFileSync(file, 'utf8');
  return text.match(/oauth_token\s*=\s*"([^"]+)"/)[1];
}

const token = readToken();
for (const name of domains) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/domains`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  const data = await res.json();
  console.log(name, data.success ? data.result.status : data.errors);
}

const list = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/domains`, {
  headers: { Authorization: `Bearer ${token}` }
});
console.log(JSON.stringify((await list.json()).result, null, 2));
