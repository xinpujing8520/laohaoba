/**
 * Replace AccountBoy / 账号星球 branding with 老号吧 in user-facing text.
 */
const fs = require('fs');
const path = require('path');

const BRAND = '老号吧';

function replaceBrand(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/账号星球（AccountBoy）/g, BRAND)
    .replace(/账号星球\(AccountBoy\)/g, BRAND)
    .replace(/账号星球/g, BRAND)
    .replace(/AccountBoy/g, BRAND)
    .replace(/Accountboy/g, BRAND);
}

function escSql(s) {
  return String(s).replace(/'/g, "''");
}

function walkStrings(obj) {
  if (typeof obj === 'string') return replaceBrand(obj);
  if (Array.isArray(obj)) return obj.map(walkStrings);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = k === 'slug' && v === 'accountboy-access-notice' ? 'laohaoba-access-notice' : walkStrings(v);
    }
    return out;
  }
  return obj;
}

// 1) home-content.json
const homePath = path.join(__dirname, '..', 'public', 'data', 'home-content.json');
const home = JSON.parse(fs.readFileSync(homePath, 'utf8'));
const updatedHome = walkStrings(home);
fs.writeFileSync(homePath, JSON.stringify(updatedHome, null, 2), 'utf8');
console.log('Updated', homePath);

// 2) SQL for D1
const sqlLines = [
  '-- Replace AccountBoy / 账号星球 branding in products',
  "UPDATE products SET name = REPLACE(REPLACE(REPLACE(REPLACE(name, '账号星球（AccountBoy）', '老号吧'), '账号星球', '老号吧'), 'AccountBoy', '老号吧'), 'Accountboy', '老号吧') WHERE name LIKE '%账号星球%' OR name LIKE '%AccountBoy%' OR name LIKE '%Accountboy%';",
  "UPDATE products SET description = REPLACE(REPLACE(REPLACE(REPLACE(description, '账号星球（AccountBoy）', '老号吧'), '账号星球', '老号吧'), 'AccountBoy', '老号吧'), 'Accountboy', '老号吧') WHERE description LIKE '%账号星球%' OR description LIKE '%AccountBoy%' OR description LIKE '%Accountboy%';",
  "UPDATE products SET detail_html = REPLACE(REPLACE(REPLACE(REPLACE(detail_html, '账号星球（AccountBoy）', '老号吧'), '账号星球', '老号吧'), 'AccountBoy', '老号吧'), 'Accountboy', '老号吧') WHERE detail_html LIKE '%账号星球%' OR detail_html LIKE '%AccountBoy%' OR detail_html LIKE '%Accountboy%';",
  "UPDATE products SET category_name = REPLACE(category_name, 'Accountboy批量采购', '老号吧批量采购') WHERE category_name LIKE '%Accountboy%';"
];

const sqlPath = path.join(__dirname, 'replace-brand.sql');
fs.writeFileSync(sqlPath, sqlLines.join('\n') + '\n', 'utf8');
console.log('Wrote', sqlPath);

module.exports = { replaceBrand, walkStrings };
