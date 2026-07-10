const fs = require('fs');
const d = fs.readFileSync(__dirname + '/ab-36455.a4bfa2cf.js', 'utf8');
const re = /([a-zA-Z0-9_]+):e\(\{url:"([^"]+)"[^}]*baseURL:"([^"]+)"/g;
let m;
while ((m = re.exec(d))) {
  const [_, name, url, base] = m;
  if (/self|charge|topup|recharge|information/i.test(name + url)) {
    console.log(name, base + url);
  }
}
