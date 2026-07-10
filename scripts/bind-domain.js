/**
 * Bind custom domains to Cloudflare Pages project.
 * Usage: node scripts/bind-domain.js laohaoba.com www.laohaoba.com
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const ACCOUNT_ID = 'a2914fcdba0c8690e9b7f841029d6d9d';
const PROJECT = 'zhanghaoya';
const domains = process.argv.slice(2);
if (!domains.length) {
  console.error('Usage: node scripts/bind-domain.js <domain> [domain2 ...]');
  process.exit(1);
}

function readToken() {
  const home = os.homedir();
  const candidates = [
    path.join(home, '.wrangler', 'config', 'default.toml'),
    path.join(home, 'AppData', 'Roaming', 'xdg.config', '.wrangler', 'config', 'default.toml')
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const match = text.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  }
  throw new Error('Wrangler OAuth token not found. Run: npx wrangler login');
}

async function cf(method, urlPath, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${readToken()}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!data.success) {
    const msg = data.errors?.map((e) => e.message).join('; ') || JSON.stringify(data);
    throw new Error(msg);
  }
  return data.result;
}

function rootDomain(hostname) {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

async function main() {
  const project = await cf('GET', `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}`);
  const target = project.subdomain.includes('.pages.dev')
    ? project.subdomain
    : `${project.subdomain}.pages.dev`;
  console.log(`Project: ${PROJECT} -> ${target}`);

  const zones = await cf('GET', `/zones?account.id=${ACCOUNT_ID}&per_page=50`);
  const zoneMap = new Map(zones.map((z) => [z.name, z.id]));

  for (const domain of domains) {
    console.log(`\nAdding Pages domain: ${domain}`);
    try {
      const added = await cf('POST', `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/domains`, { name: domain });
      console.log(`  Status: ${added.status || added.verification_data?.status || 'added'}`);
    } catch (e) {
      if (/already|exist/i.test(e.message)) {
        console.log(`  Already bound: ${e.message}`);
      } else {
        throw e;
      }
    }

    const zoneName = rootDomain(domain);
    const zoneId = zoneMap.get(zoneName);
    if (!zoneId) {
      console.log(`  Zone ${zoneName} not in this Cloudflare account — add DNS manually.`);
      continue;
    }

    const records = await cf('GET', `/zones/${zoneId}/dns_records?per_page=100`);
    const name = domain === zoneName ? '@' : domain.replace(`.${zoneName}`, '');
    const existing = records.find((r) => r.type === 'CNAME' && r.name === (name === '@' ? zoneName : domain));

    if (existing) {
      if (existing.content === target) {
        console.log(`  DNS CNAME already points to ${target}`);
      } else {
        await cf('PATCH', `/zones/${zoneId}/dns_records/${existing.id}`, {
          type: 'CNAME',
          name,
          content: target,
          proxied: true
        });
        console.log(`  DNS CNAME updated: ${domain} -> ${target}`);
      }
    } else {
      await cf('POST', `/zones/${zoneId}/dns_records`, {
        type: 'CNAME',
        name,
        content: target,
        proxied: true
      });
      console.log(`  DNS CNAME created: ${domain} -> ${target}`);
    }
  }

  const bound = await cf('GET', `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/domains`);
  console.log('\nBound domains:');
  for (const d of bound) {
    console.log(`  - ${d.name} (${d.status})`);
  }
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
