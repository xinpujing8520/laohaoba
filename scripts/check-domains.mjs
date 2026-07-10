import fs from 'fs';
import os from 'os';
import path from 'path';

const home = os.homedir();
const file = path.join(home, '.wrangler', 'config', 'default.toml');
const token = fs.readFileSync(file, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)[1];
const ACCOUNT = 'a2914fcdba0c8690e9b7f841029d6d9d';

async function cf(p) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${p}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return r.json();
}

const [proj, domains, zones] = await Promise.all([
  cf(`/accounts/${ACCOUNT}/pages/projects/zhanghaoya`),
  cf(`/accounts/${ACCOUNT}/pages/projects/zhanghaoya/domains`),
  cf(`/zones?account.id=${ACCOUNT}&per_page=100`)
]);

console.log('subdomain:', proj.result?.subdomain);
console.log('domains:', JSON.stringify(domains.result, null, 2));
const names = (zones.result || []).map((z) => z.name);
console.log('matching zones:', names.filter((n) => n.includes('laohao') || n.includes('zhanghao')));
