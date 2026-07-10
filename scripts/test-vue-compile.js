const fs = require('fs');
const compiler = require('vue-template-compiler');
const html = fs.readFileSync('public/index.html', 'utf8');
const start = html.indexOf('<div id="app">') + '<div id="app">'.length;
const end = html.indexOf('</div>\n\n<script src="/js/shopfont.js');
const template = html.slice(start, end);
const result = compiler.compile(template);
console.log('errors', result.errors);
console.log('tips', result.tips);
