/**
 * Upload 188Pay secret only. PID/API_URL/SITE_URL live in wrangler.toml [vars].
 */
import { spawn } from 'child_process';

const SECRET = process.env.EPAY188_SECRET || '6b41428e8f66da221684e04a4360b6c2';

function putSecret(name, value) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['wrangler', 'pages', 'secret', 'put', name, '--project-name=zhanghaoya'],
      { stdio: ['pipe', 'inherit', 'inherit'], shell: true }
    );
    proc.stdin.write(value);
    proc.stdin.end();
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${name} failed: ${code}`))));
  });
}

console.log('Setting EPAY188_SECRET...');
await putSecret('EPAY188_SECRET', SECRET);
console.log('Done. PID/API_URL/SITE_URL use wrangler.toml [vars] — do not duplicate as secrets.');
