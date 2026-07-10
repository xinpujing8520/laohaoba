/**
 * SSG build orchestrator — run all prerender scripts + sitemap.
 */
const { main: prerenderArticles } = require('./prerender-articles');
const { main: prerenderGoods } = require('./prerender-goods');
const { main: prerenderNews } = require('./prerender-news');

function main() {
  console.log('=== SSG Build ===');
  const articles = prerenderArticles();
  const goods = prerenderGoods();
  const news = prerenderNews();
  require('./generate-sitemap');
  console.log('=== SSG Done: ' + articles + ' articles, ' + goods + ' goods, ' + news + ' news pages ===');
}

main();
