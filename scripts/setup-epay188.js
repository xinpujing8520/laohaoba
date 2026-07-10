/**
 * Re-upload 188Pay secrets without trailing newlines (PowerShell pipe adds \r\n).
 */
import { spawn } from 'child_process';

const secrets = {
  EPAY188_PID: '46603f7a-4e86-4e8a-bd23-422a3a18d393',
  EPAY188_SECRET: '6b41428e8f66da221684e04a4360b6c2',
  EPAY188_API_URL: 'https://api2.188pay.top',
  SITE_URL: 'https://www.laohaoba.com'
};

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

for (const [name, value] of Object.entries(secrets)) {
  console.log(`Setting ${name}...`);
  await putSecret(name, value);
}
console.log('Done.');
