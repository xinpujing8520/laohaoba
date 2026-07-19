/**
 * LaoHaoBa bilingual UI — zh / en (localStorage: laohaoba_lang)
 */
(function (global) {
  const STORAGE_KEY = 'laohaoba_lang';

  const CATEGORY_EN = {
    'AI工具': 'AI Tools',
    'AI智能': 'AI Tools',
    '苹果id': 'Apple ID',
    '苹果 id': 'Apple ID',
    '礼品卡密': 'Gift Cards',
    '苹果礼品卡': 'Apple Gift Card',
    '社交媒体': 'Social Media',
    '邮箱账号': 'Email Accounts',
    '游戏账号': 'Gaming',
    '影音会员': 'Streaming',
    '实用软件': 'Software',
    '电话卡': 'SIM Cards',
    '其他': 'Other',
    '推荐': 'Featured',
    '商品': 'Products'
  };

  const MESSAGES = {
    zh: {
      'notice.text': '警惕仿冒网站，保护您的资金安全！',
      'search.placeholder': '搜索商品',
      'search.aria': '搜索',
      'nav.home': '首页',
      'nav.partner': '推广合作',
      'nav.orders': '订单查询',
      'nav.support': '联系客服',
      'nav.langSwitch': '切换到英文',
      'nav.langLabel': 'EN',
      'legal.bar': '凡购买本站任何商品必须遵守各个国家法律法规及各大平台规则，非法用途一切后果自负，本站不承担任何法律及连带责任！',
      'loading': '加载中...',
      'empty.products': '暂无商品',
      'error.loadProducts': '加载商品失败，请刷新重试',
      'error.pageLoad': '页面加载失败',
      'error.pageLoadHint': '请刷新重试，或联系客服 TG: xiaoqi2888',
      'trust.delivery.title': '即时交货',
      'trust.delivery.desc': '发货时间少于5分钟',
      'trust.users.title': '被数百万人信任',
      'trust.users.desc': '全球超一百万用户',
      'trust.pay.title': '支付安全快捷',
      'trust.pay.desc': '官方渠道付款',
      'trust.service.title': '24小时在线服务',
      'trust.service.desc': '即时响应 售后无忧',
      'home.recommend': '推荐',
      'home.allCategories': '全部分类',
      'home.hotTitle': '热门商品',
      'home.hotDesc': '平台最受欢迎产品',
      'home.allProducts': '全部商品',
      'home.productList': '商品列表',
      'home.itemsCount': '共 {n} 件商品',
      'home.discoverMore': '发现更多 →',
      'home.fromPrice': '起',
      'home.newsTitle': '新闻&促销',
      'home.newsDesc': '行业新闻 & 老号吧促销活动',
      'home.viewMore': '查看更多 >',
      'home.reviewsTitle': '我们的客户怎么说',
      'home.reviewsSub': '16K真实用户评价, 好评率超过98%',
      'home.reviewPrev': '上一条',
      'home.reviewNext': '下一条',
      'footer.about': '老号吧 — 海外账号购买平台，提供苹果ID、社交账号、邮箱账号、AI工具等，USDT TRC20 扫码支付，即时发货。',
      'footer.coop': '合作互动',
      'footer.aboutUs': '关于我们',
      'footer.legal': '法律法规',
      'footer.refund': '退换货说明',
      'footer.refundPolicy': '退款说明',
      'footer.payPolicy': '支付说明',
      'footer.support': '服务支持',
      'footer.contact': '联系我们',
      'footer.copyright': '老号吧 LaoHaoBa.com © 2026',
      'footer.payNote': 'USDT TRC20 扫码支付',
      'goods.badge.official': '官方渠道',
      'goods.badge.officialSub': '渠道正规可查',
      'goods.badge.fast': '极速发货',
      'goods.badge.fastSub': '5分钟内发货',
      'goods.badge.fastSub3': '3分钟内发货',
      'goods.badge.service': '24小时客服',
      'goods.badge.serviceSub': '售后无忧',
      'goods.badge.replace': '错误包换',
      'goods.badge.replaceSub': '24小时在线服务，售后无忧',
      'goods.detailTitle': '{name}商品详情',
      'goods.related': '相关推荐',
      'goods.news': '新闻&促销',
      'goods.rechargeInfo': '填写充值信息',
      'goods.qty': '数量',
      'goods.bulk': '批采咨询',
      'goods.priceOriginal': '原价',
      'goods.priceDiscount': '优惠合计',
      'goods.priceOff': '商品折扣',
      'goods.priceFinal': '到手价',
      'goods.buyNow': '立即购买',
      'goods.outOfStock': '暂时缺货',
      'goods.submitting': '提交中...',
      'goods.notFound': '商品不存在',
      'goods.backHome': '返回首页',
      'goods.missingId': '缺少商品ID，请从首页重新选择商品',
      'goods.loadFail': '商品加载失败',
      'modal.emailTitle': '填写联系邮箱',
      'modal.emailHint': '用于订单查询和交付通知，确认后将跳转 USDT 支付页面',
      'modal.emailPlaceholder': '请输入邮箱',
      'modal.cancel': '取消',
      'modal.confirm': '确认购买',
      'sku.category': '类别',
      'sku.region': '地区',
      'sku.package': '套餐',
      'sku.duration': '时长',
      'sku.spec': '规格',
      'news.published': '发布时间',
      'news.related': '相关推荐',
      'news.breadcrumb': '新闻资讯',
      'article.notFound': '文章不存在或已下线',
      'article.missingId': '缺少文章ID',
      'article.loadFail': '文章加载失败',
      'order.searchTitle': '订单查询',
      'order.searchPlaceholder': '输入邮箱或订单号',
      'order.searchBtn': '查询',
      'order.searching': '查询中...',
      'order.notFound': '未找到订单',
      'order.searchFail': '查询失败',
      'order.backHome': '返回首页',
      'order.orderNo': '订单号',
      'order.amount': '金额',
      'order.time': '时间',
      'order.cardProcessing': '卡密正在处理中，请稍后刷新或联系客服 TG:xiaoqi2888',
      'order.pendingPay': '订单待支付，请完成支付后刷新',
      'order.status.pending': '待支付',
      'order.status.paid': '已支付',
      'order.status.cancelled': '已取消',
      'order.buyFail': '下单失败',
      'order.emailRequired': '请填写邮箱，用于接收订单信息',
      'order.fillField': '请填写{name}',
      'ssg.enterBuy': '进入交互购买页面 →',
      'breadcrumb.home': '首页',
      'category.default': '商品',
      'error404.title': '404 - 页面未找到',
      'error404.desc': '您访问的页面不存在或已下线。',
      'error404.browseNews': '浏览新闻资讯'
    },
    en: {
      'notice.text': 'Beware of fake sites. Protect your funds!',
      'search.placeholder': 'Search products',
      'search.aria': 'Search',
      'nav.home': 'Home',
      'nav.partner': 'Partnership',
      'nav.orders': 'My Orders',
      'nav.support': 'Support',
      'nav.langSwitch': 'Switch to Chinese',
      'nav.langLabel': '中文',
      'legal.bar': 'All purchases must comply with applicable laws and platform rules. Illegal use is at your own risk. We assume no liability.',
      'loading': 'Loading...',
      'empty.products': 'No products found',
      'error.loadProducts': 'Failed to load products. Please refresh.',
      'error.pageLoad': 'Page failed to load',
      'error.pageLoadHint': 'Please refresh or contact support on Telegram: xiaoqi2888',
      'trust.delivery.title': 'Instant delivery',
      'trust.delivery.desc': 'Ships in under 5 minutes',
      'trust.users.title': 'Trusted worldwide',
      'trust.users.desc': 'Over 1 million users',
      'trust.pay.title': 'Secure payment',
      'trust.pay.desc': 'Official payment channels',
      'trust.service.title': '24/7 support',
      'trust.service.desc': 'Fast response & after-sales care',
      'home.recommend': 'Featured',
      'home.allCategories': 'All categories',
      'home.hotTitle': 'Hot products',
      'home.hotDesc': 'Most popular on our platform',
      'home.allProducts': 'All products',
      'home.productList': 'Products',
      'home.itemsCount': '{n} products',
      'home.discoverMore': 'Discover more →',
      'home.fromPrice': 'from',
      'home.newsTitle': 'News & deals',
      'home.newsDesc': 'Industry news & LaoHaoBa promotions',
      'home.viewMore': 'View more >',
      'home.reviewsTitle': 'What our customers say',
      'home.reviewsSub': '16K+ real reviews, 98%+ positive',
      'home.reviewPrev': 'Previous',
      'home.reviewNext': 'Next',
      'footer.about': 'LaoHaoBa — overseas accounts marketplace. Apple ID, social accounts, email, AI tools. USDT TRC20 pay, instant delivery.',
      'footer.coop': 'Partnership',
      'footer.aboutUs': 'About us',
      'footer.legal': 'Legal',
      'footer.refund': 'Returns',
      'footer.refundPolicy': 'Refunds',
      'footer.payPolicy': 'Payment',
      'footer.support': 'Support',
      'footer.contact': 'Contact us',
      'footer.copyright': 'LaoHaoBa.com © 2026',
      'footer.payNote': 'USDT TRC20 payment',
      'goods.badge.official': 'Official source',
      'goods.badge.officialSub': 'Verified channel',
      'goods.badge.fast': 'Fast delivery',
      'goods.badge.fastSub': 'Within 5 minutes',
      'goods.badge.fastSub3': 'Within 3 minutes',
      'goods.badge.service': '24/7 support',
      'goods.badge.serviceSub': 'After-sales care',
      'goods.badge.replace': 'Error replacement',
      'goods.badge.replaceSub': '24/7 online support & after-sales',
      'goods.detailTitle': '{name} details',
      'goods.related': 'Related products',
      'goods.news': 'News & deals',
      'goods.rechargeInfo': 'Top-up information',
      'goods.qty': 'Quantity',
      'goods.bulk': 'Bulk inquiry',
      'goods.priceOriginal': 'Original',
      'goods.priceDiscount': 'Discount',
      'goods.priceOff': 'Savings',
      'goods.priceFinal': 'Total',
      'goods.buyNow': 'Buy now',
      'goods.outOfStock': 'Out of stock',
      'goods.submitting': 'Submitting...',
      'goods.notFound': 'Product not found',
      'goods.backHome': 'Back to home',
      'goods.missingId': 'Missing product ID. Please select from home.',
      'goods.loadFail': 'Failed to load product',
      'modal.emailTitle': 'Contact email',
      'modal.emailHint': 'For order lookup and delivery. You will be redirected to USDT payment.',
      'modal.emailPlaceholder': 'Enter your email',
      'modal.cancel': 'Cancel',
      'modal.confirm': 'Confirm purchase',
      'sku.category': 'Category',
      'sku.region': 'Region',
      'sku.package': 'Plan',
      'sku.duration': 'Duration',
      'sku.spec': 'Specification',
      'news.published': 'Published',
      'news.related': 'Related products',
      'news.breadcrumb': 'News',
      'article.notFound': 'Article not found',
      'article.missingId': 'Missing article ID',
      'article.loadFail': 'Failed to load article',
      'order.searchTitle': 'Order lookup',
      'order.searchPlaceholder': 'Email or order number',
      'order.searchBtn': 'Search',
      'order.searching': 'Searching...',
      'order.notFound': 'No orders found',
      'order.searchFail': 'Search failed',
      'order.backHome': 'Back to home',
      'order.orderNo': 'Order No.',
      'order.amount': 'Amount',
      'order.time': 'Time',
      'order.cardProcessing': 'Card details are being processed. Refresh later or contact support on TG: xiaoqi2888',
      'order.pendingPay': 'Payment pending. Complete payment and refresh.',
      'order.status.pending': 'Pending',
      'order.status.paid': 'Paid',
      'order.status.cancelled': 'Cancelled',
      'order.buyFail': 'Order failed',
      'order.emailRequired': 'Please enter your email to receive order details',
      'order.fillField': 'Please fill in {name}',
      'ssg.enterBuy': 'Open interactive checkout →',
      'breadcrumb.home': 'Home',
      'category.default': 'Products',
      'error404.title': '404 - Page not found',
      'error404.desc': 'The page you requested does not exist or has been removed.',
      'error404.browseNews': 'Browse news'
    }
  };

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh';
  }

  function setLang(lang) {
    const next = lang === 'en' ? 'en' : 'zh';
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
    global.dispatchEvent(new Event('langchange'));
    applyDom();
  }

  function t(key, vars) {
    const lang = getLang();
    let s = (MESSAGES[lang] && MESSAGES[lang][key]) || (MESSAGES.zh && MESSAGES.zh[key]) || key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return s;
  }

  function catName(name) {
    const raw = String(name || '').trim();
    if (!raw || getLang() === 'zh') return raw;
    return CATEGORY_EN[raw] || raw;
  }

  function applyDom() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const vars = {};
      if (el.dataset.i18nName) vars.name = el.dataset.i18nName;
      if (el.dataset.i18nN) vars.n = el.dataset.i18nN;
      el.textContent = t(key, vars);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = t(key);
        if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', t(key));
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
    document.querySelectorAll('.ab-lang-toggle-static').forEach((btn) => {
      const lang = getLang();
      btn.textContent = lang === 'en' ? '中文' : 'EN';
      btn.setAttribute('aria-label', t('nav.langSwitch'));
    });
  }

  function init() {
    document.documentElement.lang = getLang() === 'en' ? 'en' : 'zh-CN';
    applyDom();
    global.addEventListener('langchange', applyDom);
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.ab-lang-toggle-static');
      if (!btn) return;
      e.preventDefault();
      setLang(getLang() === 'en' ? 'zh' : 'en');
    });
  }

  global.I18n = { getLang, setLang, t, catName, init, applyDom, MESSAGES };
})(typeof window !== 'undefined' ? window : global);
