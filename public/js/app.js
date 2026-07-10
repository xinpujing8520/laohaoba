const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'https://www.laohaoba.com/api'
  : '/api';

function seoProductUrl(id) {
  return (typeof Seo !== 'undefined' && Seo.productUrl) ? Seo.productUrl(id) : '/goods.html?id=' + encodeURIComponent(id);
}

function seoArticleUrl(article) {
  return (typeof Seo !== 'undefined' && Seo.articleUrl) ? Seo.articleUrl(article) : '/article.html?id=' + encodeURIComponent(article.id || article);
}

function seoCategoryUrl(catId) {
  return (typeof Seo !== 'undefined' && Seo.categoryUrl) ? Seo.categoryUrl(catId) : (catId ? '/?cat=' + encodeURIComponent(catId) : '/');
}

function updateHomeSeo(vm) {
  if (typeof Seo === 'undefined' || !Seo.applyHomeSeo) return;
  const cat = vm.categoryId || '';
  const catObj = vm.categories.find((c) => c.id === cat);
  Seo.applyHomeSeo({
    categoryId: cat,
    categoryName: catObj ? catObj.name : '',
    keyword: vm.keyword || ''
  });
}

const HeaderMixin = {
  data() {
    return { keyword: '', categories: [] };
  },
  computed: {
    quickNav() {
      const hotIds = new Set(['ab_cat_7']);
      const nameMap = { 'AI工具': 'AI智能', '苹果id': '苹果 id', '礼品卡密': '苹果礼品卡' };
      return this.categories.map((c) => ({
        id: c.id,
        name: nameMap[c.name] || c.name,
        hot: hotIds.has(c.id)
      })).slice(0, 12);
    }
  },
  methods: {
    getOrderUrl() {
      const email = localStorage.getItem('email') || '';
      return email ? `/order/search.html?keyword=${encodeURIComponent(email)}` : '/order/search.html';
    },
    async loadCategories() {
      try {
        const res = await axios.get(`${API}/categories`);
        this.categories = res.data || [];
      } catch (e) { console.error(e); }
    },
    headerSearch() {
      const q = this.keyword.trim();
      location.href = q ? '/?key=' + encodeURIComponent(q) : '/';
    },
    goNavCategory(id) {
      location.href = id ? '/?cat=' + encodeURIComponent(id) : '/';
    },
    formatPriceNum(p) { return Number(p).toFixed(2); }
  }
};

const ShopApp = {
  data() {
    return {
      keyword: '',
      categoryId: '',
      categories: [],
      allProducts: [],
      products: [],
      loading: false,
      newsList: [],
      reviews: [],
      banners: [],
      reviewPage: 0,
      reviewTimer: null,
      categoryDisplay: {},
      hotProductList: [],
      hotSection: { bg: '', title: '热门商品', desc: '平台最受欢迎产品' }
    };
  },
  computed: {
    quickNav() {
      const hotIds = new Set(['ab_cat_7']);
      const nameMap = { 'AI工具': 'AI智能', '苹果id': '苹果 id', '礼品卡密': '苹果礼品卡' };
      return this.categories.map((c) => ({
        id: c.id,
        name: nameMap[c.name] || c.name,
        hot: hotIds.has(c.id)
      })).slice(0, 12);
    },
    mainBanner() {
      return this.banners[0] || null;
    },
    sideBanners() {
      return this.banners.slice(1, 3);
    },
    bottomBanners() {
      return this.banners.slice(3, 6);
    },
    hotProducts() {
      if (this.categoryId || this.keyword) return [];
      return this.hotProductList;
    },
    hotModuleStyle() {
      const bg = this.hotSection.bg || 'https://files.kardz.cn/demon/20260104-181534-84dabcfd77584cba8397aa65a044e00f.png';
      return {
        backgroundImage: `url(${bg})`,
        backgroundColor: 'rgb(5, 5, 5)',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% auto'
      };
    },
    homeModules() {
      if (this.categoryId || this.keyword) return [];
      const moduleOrder = ['ab_cat_7', 'ab_cat_3', 'ab_cat_5', 'ab_cat_10'];
      const ordered = moduleOrder
        .map((id) => this.categories.find((c) => c.id === id))
        .filter(Boolean);
      const rest = this.categories.filter((c) => !moduleOrder.includes(c.id));
      return [...ordered, ...rest].map((c) => ({
        id: c.id,
        name: c.name,
        count: this.categoryDisplay[c.id] ? this.categoryDisplay[c.id].length : this.allProducts.filter((p) => p.CategoryId === c.id).length,
        products: (this.categoryDisplay[c.id] && this.categoryDisplay[c.id].length)
          ? this.categoryDisplay[c.id]
          : this.allProducts.filter((p) => p.CategoryId === c.id).slice(0, 8)
      })).filter((m) => m.products.length);
    },
    currentModuleTitle() {
      if (!this.categoryId) return '全部商品';
      const c = this.categories.find((x) => x.id === this.categoryId);
      return c ? c.name : '商品列表';
    },
    reviewPages() {
      const perPage = this.reviewsPerPage;
      return Math.max(1, Math.ceil(this.reviews.length / perPage));
    },
    reviewsPerPage() {
      const w = window.innerWidth || 1200;
      if (w <= 600) return 1;
      if (w <= 1100) return 2;
      return 3;
    },
    visibleReviews() {
      const start = this.reviewPage * this.reviewsPerPage;
      return this.reviews.slice(start, start + this.reviewsPerPage);
    },
    reviewPageDots() {
      const n = this.reviewPages;
      const dots = [];
      for (let i = 0; i < n; i++) dots.push(i);
      return dots;
    }
  },
  async mounted() {
    const params = new URLSearchParams(location.search);
    const key = params.get('key');
    const cat = params.get('cat');
    if (key) this.keyword = key;
    if (cat) this.categoryId = cat;
    this.loadHomeContent();
    this.loadHotProducts();
    this.loadCategoryDisplay().then(() => {
      this.loadCategories().then(() => {
        this.loadProducts().then(() => updateHomeSeo(this));
      });
    });
    this.reviewTimer = setInterval(() => this.nextReview(), 6000);
  },
  beforeDestroy() {
    if (this.reviewTimer) clearInterval(this.reviewTimer);
  },
  methods: {
    async loadCategoryDisplay() {
      try {
        const res = await axios.get('/data/category-display.json?v=3');
        this.categoryDisplay = res.data || {};
      } catch (e) {
        console.warn('category display load failed', e);
        this.categoryDisplay = {};
      }
    },
    async loadHotProducts() {
      try {
        const res = await axios.get('/data/hot-products.json?v=1');
        const data = res.data || {};
        this.hotSection = {
          bg: data.bg || '',
          title: data.title || '热门商品',
          desc: data.desc || '平台最受欢迎产品'
        };
        this.hotProductList = data.products || [];
      } catch (e) {
        console.warn('hot products load failed', e);
        this.hotProductList = this.allProducts.filter((p) => p.IsHot).slice(0, 8);
      }
    },
    async loadHomeContent() {
      try {
        const res = await axios.get('/data/home-content.json?v=3');
        const data = res.data || {};
        this.newsList = (data.news || []).slice(0, 10);
        this.reviews = data.reviews || [];
        this.banners = data.banners || [];
      } catch (e) {
        console.warn('home content load failed', e);
      }
    },
    prevReview() {
      this.reviewPage = (this.reviewPage - 1 + this.reviewPages) % this.reviewPages;
    },
    nextReview() {
      if (!this.reviews.length) return;
      this.reviewPage = (this.reviewPage + 1) % this.reviewPages;
    },
    async loadCategories() {
      try {
        const res = await axios.get(`${API}/categories`);
        this.categories = res.data || [];
      } catch (e) { console.error(e); }
    },
    async loadProducts() {
      this.loading = true;
      try {
        if (this.categoryId && !this.keyword && this.categoryDisplay[this.categoryId] && this.categoryDisplay[this.categoryId].length) {
          this.products = this.categoryDisplay[this.categoryId];
        } else if (this.categoryId || this.keyword) {
          const res = await axios.post(`${API}/product/search`, {
            keyword: this.keyword,
            categoryId: this.categoryId,
            page: 1,
            pageSize: 300
          });
          this.products = res.data || [];
        }
        if (!this.categoryId && !this.keyword) {
          const res = await axios.post(`${API}/product/search`, {
            keyword: '',
            categoryId: '',
            page: 1,
            pageSize: 300
          });
          this.allProducts = res.data || [];
          this.products = [];
        }
      } catch (e) {
        alert('加载商品失败，请刷新重试');
      } finally {
        this.loading = false;
      }
    },
    isCategoryActive(id) {
      if (!this.categoryId && !id) return true;
      return this.categoryId === id;
    },
    isIconUrl(icon) {
      return String(icon || '').startsWith('http');
    },
    selectCategory(id) {
      this.categoryId = id;
      const params = new URLSearchParams();
      if (this.keyword) params.set('key', this.keyword);
      if (this.categoryId) params.set('cat', this.categoryId);
      const qs = params.toString();
      history.replaceState(null, '', qs ? `/?${qs}` : '/');
      this.loadProducts().then(() => updateHomeSeo(this));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    search() {
      const q = this.keyword.trim();
      const params = new URLSearchParams();
      if (q) params.set('key', q);
      if (this.categoryId) params.set('cat', this.categoryId);
      const qs = params.toString();
      history.replaceState(null, '', qs ? `/?${qs}` : '/');
      this.loadProducts().then(() => updateHomeSeo(this));
    },
    goProduct(id) {
      sessionStorage.setItem('productId', String(id));
      location.href = seoProductUrl(id);
    },
    goArticle(n) {
      if (!n || !n.id) return;
      location.href = seoArticleUrl(n);
    },
    productHref(p) {
      return seoProductUrl(p.LinkId || p.ID);
    },
    articleHref(n) {
      return seoArticleUrl(n);
    },
    categoryHref(id) {
      return seoCategoryUrl(id);
    },
    goBanner(url) {
      if (!url) return;
      var idMatch = url.match(/[?&]id=(\d+)/);
      if (idMatch) {
        this.goProduct('ab_' + idMatch[1]);
        return;
      }
      var slug = url.replace(/^\//, '').replace(/^buy-?/i, '').split('?')[0].toLowerCase();
      var found = this.allProducts.find(function (p) {
        return String(p.ShortEn || '').toLowerCase() === slug;
      });
      if (found) {
        this.goProduct(found.LinkId || found.ID);
        return;
      }
      var byName = this.allProducts.find(function (p) {
        return String(p.Name || '').toLowerCase().indexOf(slug) >= 0;
      });
      if (byName) this.goProduct(byName.LinkId || byName.ID);
    },
    cardTag(p) {
      return p.CategoryName || p.categoryName || '平台账号';
    },
    cardDisplayName(p) {
      return p.DisplayName || String(p.Name || '').split(' | ')[0];
    },
    cardIconUrl(p) {
      return this.productImage(p.IconUrl || p.ImageUrl || '');
    },
    cardCoverImg(p) {
      return this.productImage(p.CoverImg || p.ImageUrl || '');
    },
    cardTagText(p) {
      return p.Tag || p.CategoryName || p.categoryName || '平台账号';
    },
    cardSub(p) {
      var name = String(p.Name || '');
      if (name.length > 18) return name.slice(0, 18) + '...';
      return name;
    },
    getOrderUrl() {
      const email = localStorage.getItem('email') || '';
      return email ? `/order/search.html?keyword=${encodeURIComponent(email)}` : '/order/search.html';
    },
    formatPrice(p) { return Number(p).toFixed(2) + ' USDT'; },
    formatPriceNum(p) { return Number(p).toFixed(2); },
    productImage(url) {
      var raw = String(url || '').trim();
      if (!raw) return '';
      try {
        var u = new URL(raw);
        u.pathname = u.pathname.split('/').map(function(seg) {
          try { return encodeURIComponent(decodeURIComponent(seg)); } catch (e) { return seg; }
        }).join('/');
        return u.toString();
      } catch (e) {
        return raw.replace(/ /g, '%20');
      }
    },
    iconClass(icon) {
      var t = String(icon || '').toLowerCase();
      if (t.indexOf('apple') >= 0) return 'apple';
      if (t.indexOf('google') >= 0) return 'google';
      if (t.indexOf('telegram') >= 0) return 'telegram';
      if (t.indexOf('facebook') >= 0) return 'facebook';
      if (t.indexOf('tiktok') >= 0) return 'tiktok';
      return 'default';
    },
    stars(rate) {
      var n = Math.max(0, Math.min(5, Number(rate) || 0));
      var s = '';
      for (var i = 0; i < n; i++) s += '★';
      return s;
    }
  }
};

const ProductApp = {
  mixins: [HeaderMixin],
  data() {
    return {
      product: {},
      library: null,
      relatedSpecs: [],
      specMap: {},
      selectedCategory: '',
      selDim1: '',
      selDim2: '',
      selDim3: '',
      rechargeForm: {},
      errorMsg: '',
      order: { ProductId: '', Qty: 1, Email: '', PayTypeId: 'paymento' },
      loading: true,
      buying: false,
      showEmailModal: false
    };
  },
  computed: {
    shortEn() {
      return (this.library && this.library.shortEn) || this.product.shortEn || '';
    },
    useLibrarySku() {
      return !!(this.library && this.library.skuTree && this.library.skuTree.leaves && this.library.skuTree.leaves.length);
    },
    pageTitle() {
      return (this.library && this.library.displayName) || String(this.product.name || '').split(' | ')[0] || '';
    },
    pageCategoryName() {
      return (this.library && this.library.categoryName) || this.product.categoryName || '商品';
    },
    pageCategoryId() {
      return (this.library && this.library.categoryId) || this.product.categoryId || '';
    },
    heroIcon() {
      const url = (this.library && this.library.iconUrl) || this.product.imageUrl || '';
      return url ? this.productImage(url) : '';
    },
    detailHtml() {
      return (this.library && this.library.detailHtml) || this.product.detailHtml || '';
    },
    relatedProducts() {
      return (this.library && this.library.relatedProducts) || [];
    },
    recommendNews() {
      return (this.library && this.library.recommendNews) || [];
    },
    skuDim1Label() {
      return (this.library && this.library.skuTree && this.library.skuTree.dimension1) || '类别';
    },
    skuDim2Label() {
      return (this.library && this.library.skuTree && this.library.skuTree.dimension2) || '套餐';
    },
    skuDim3Label() {
      return (this.library && this.library.skuTree && this.library.skuTree.dimension3) || '时长';
    },
    dim1Options() {
      if (!this.useLibrarySku) return [];
      const set = new Set();
      this.library.skuTree.leaves.forEach((l) => { if (l.path[0]) set.add(l.path[0]); });
      return [...set];
    },
    packageCards() {
      if (!this.useLibrarySku || !this.selDim1) return [];
      const map = {};
      this.library.skuTree.leaves.filter((l) => l.path[0] === this.selDim1).forEach((l) => {
        const name = l.path[1];
        if (!name) return;
        if (!map[name]) {
          map[name] = { name, minPrice: Infinity, hasDuration: false, badge: '', featuresHtml: '' };
        }
        const card = map[name];
        card.minPrice = Math.min(card.minPrice, Number(l.price) || 0);
        if (l.path.length >= 3) card.hasDuration = true;
        if (!card.badge && l.badge) card.badge = l.badge;
        if (!card.badge && l.description && l.description.indexOf('<') < 0 && l.description.length < 30) {
          card.badge = l.description;
        }
        if (!card.featuresHtml && l.description && l.path.length === 2) card.featuresHtml = l.description;
        if (!card.featuresHtml && l.description && l.path.length === 3 && l.description.indexOf('<') >= 0) {
          card.featuresHtml = l.description;
        }
      });
      return Object.values(map).map((c) => {
        if (!Number.isFinite(c.minPrice)) c.minPrice = 0;
        return c;
      });
    },
    durationOptions() {
      if (!this.useLibrarySku || !this.selDim1 || !this.selDim2) return [];
      const leaves = this.library.skuTree.leaves.filter((l) => l.path[0] === this.selDim1 && l.path[1] === this.selDim2);
      if (!leaves.some((l) => l.path.length >= 3)) return [];
      return leaves.filter((l) => l.path.length >= 3).map((l) => ({
        name: l.path[2],
        price: l.price,
        badge: (l.badge || (l.description && l.description.indexOf('<') < 0 ? l.description : '')) || ''
      }));
    },
    activeLeaf() {
      if (!this.useLibrarySku || !this.selDim1 || !this.selDim2) return null;
      const leaves = this.library.skuTree.leaves.filter((l) => l.path[0] === this.selDim1 && l.path[1] === this.selDim2);
      if (!leaves.length) return null;
      const withDur = leaves.filter((l) => l.path.length >= 3);
      if (withDur.length) {
        return withDur.find((l) => l.path[2] === this.selDim3) || withDur[0];
      }
      return leaves.find((l) => l.path.length === 2) || leaves[0];
    },
    activeRechargeFields() {
      const leaf = this.activeLeaf;
      return (leaf && leaf.rechargeFields) || [];
    },
    sourcePrice() {
      const leaf = this.activeLeaf;
      const src = Number((leaf && leaf.originalPrice) || this.product.sourcePrice || 0);
      const price = Number(this.product.price || 0);
      return src > price ? src : Math.ceil(price / 0.8);
    },
    unitDiscount() {
      return Math.max(0, this.sourcePrice - Number(this.product.price || 0));
    },
    discountTotal() {
      return this.unitDiscount * (this.order.Qty || 1);
    },
    totalPrice() {
      return (Number(this.product.price) || 0) * (this.order.Qty || 1);
    },
    hasTieredSpecs() {
      if (this.useLibrarySku) return false;
      return this.relatedSpecs.some((s) => String(s.name).indexOf(' | ') > 0);
    },
    specCategories() {
      const cats = [];
      const seen = new Set();
      this.relatedSpecs.forEach((s) => {
        const cat = this.parseSpecName(s.name).category || s.name;
        if (!seen.has(cat)) {
          seen.add(cat);
          cats.push(cat);
        }
      });
      return cats;
    },
    activeCategory() {
      if (this.selectedCategory) return this.selectedCategory;
      const cat = this.parseSpecName(this.product.name).category;
      if (cat) return cat;
      return this.specCategories[0] || '';
    },
    regionSpecs() {
      const cat = this.activeCategory;
      return this.relatedSpecs
        .filter((s) => this.parseSpecName(s.name).category === cat)
        .map((s) => Object.assign({}, s, { regionName: this.parseSpecName(s.name).region }));
    },
    simpleSpecs() {
      return this.hasTieredSpecs ? [] : this.relatedSpecs;
    }
  },
  async mounted() {
    let id = new URLSearchParams(location.search).get('id')
      || sessionStorage.getItem('productId')
      || '';
    if (!id) {
      const m = location.pathname.match(/\/goods\/([^/]+)\.html$/i);
      if (m) id = decodeURIComponent(m[1]);
    }
    id = String(id).replace(/\.html$/i, '').trim();
    if (!id) {
      this.loading = false;
      this.errorMsg = '缺少商品ID，请从首页重新选择商品';
      return;
    }
    sessionStorage.setItem('productId', id);
    this.order.ProductId = id;
    this.loadCategories();
    try {
      const res = await axios.post(`${API}/product-detail`, { id });
      if (res.data && Number(res.data.Code) === 200 && res.data.Data) {
        this.product = res.data.Data;
        this.relatedSpecs = res.data.Data.relatedSpecs || [];
        this.buildSpecMap();
        const parsed = this.parseSpecName(this.product.name);
        if (parsed.category) this.selectedCategory = parsed.category;
        this.order.Qty = this.product.minBuy || 1;
        if (this.product.shortEn) {
          await this.loadLibrary(this.product.shortEn);
        }
        if (this.useLibrarySku) {
          this.initLibrarySelection(id);
        }
        this.applyProductSeoTags();
      } else {
        this.errorMsg = (res.data && res.data.Message) || '商品不存在';
      }
    } catch (e) {
      this.errorMsg = (e.response && e.response.data && e.response.data.Message) || '商品加载失败';
    } finally {
      this.loading = false;
    }
    const saved = localStorage.getItem('email');
    if (saved) this.order.Email = saved;
  },
  methods: {
    applyProductSeoTags() {
      if (typeof Seo === 'undefined' || !Seo.applyProductSeo) return;
      Seo.applyProductSeo({
        displayName: this.pageTitle,
        name: this.product.name,
        description: this.product.description,
        detailHtml: this.detailHtml,
        productId: this.order.ProductId || this.product.id,
        id: this.product.id,
        price: this.product.price,
        iconUrl: this.heroIcon,
        image: this.heroIcon,
        categoryName: this.pageCategoryName,
        categoryId: this.pageCategoryId
      });
    },
    productImage(url) {
      const raw = String(url || '').trim();
      if (!raw) return '';
      try {
        const u = new URL(raw);
        u.pathname = u.pathname.split('/').map((seg) => {
          try { return encodeURIComponent(decodeURIComponent(seg)); } catch (e) { return seg; }
        }).join('/');
        return u.toString();
      } catch (e) {
        return raw.replace(/ /g, '%20');
      }
    },
    buildSpecMap() {
      const map = {};
      (this.relatedSpecs || []).forEach((s) => { map[String(s.id)] = s; });
      map[String(this.product.id)] = this.product;
      this.specMap = map;
    },
    async loadLibrary(shortEn) {
      try {
        const res = await axios.get('/data/library-pages/' + encodeURIComponent(shortEn) + '.json?v=1');
        this.library = res.data || null;
        if (this.library && this.library.displayName) {
          this.applyProductSeoTags();
        }
      } catch (e) {
        this.library = null;
      }
    },
    initLibrarySelection(productId) {
      const leaves = this.library.skuTree.leaves;
      let leaf = leaves.find((l) => l.productId === productId);
      if (!leaf && this.library.defaultGameId) {
        leaf = leaves.find((l) => l.gameId === this.library.defaultGameId);
      }
      if (!leaf) leaf = leaves[0];
      if (!leaf) return;
      this.selDim1 = leaf.path[0] || '';
      this.selDim2 = leaf.path[1] || '';
      this.selDim3 = leaf.path.length >= 3 ? leaf.path[2] : '';
      this.applyLeaf(leaf);
    },
    selectDim1(opt) {
      this.selDim1 = opt;
      const pkgs = [];
      const seen = new Set();
      this.library.skuTree.leaves.forEach((l) => {
        if (l.path[0] !== opt || !l.path[1] || seen.has(l.path[1])) return;
        seen.add(l.path[1]);
        pkgs.push(l.path[1]);
      });
      if (pkgs[0]) this.selectPackage(pkgs[0]);
      else {
        this.selDim2 = '';
        this.selDim3 = '';
      }
    },
    selectPackage(name) {
      this.selDim2 = name;
      const durs = this.durationOptions;
      if (durs.length) {
        const match = durs.find((d) => d.name === this.selDim3);
        this.selectDuration((match && match.name) || durs[0].name);
      } else {
        this.selDim3 = '';
        const leaf = this.activeLeaf;
        if (leaf) this.applyLeaf(leaf);
      }
    },
    selectDuration(name) {
      this.selDim3 = name;
      const leaf = this.activeLeaf;
      if (leaf) this.applyLeaf(leaf);
    },
    applyLeaf(leaf) {
      if (!leaf) return;
      const spec = this.specMap[leaf.productId];
      const name = leaf.path.join(' | ');
      if (spec) {
        this.product = Object.assign({}, this.product, {
          id: spec.id,
          name,
          price: spec.price,
          sourcePrice: spec.sourcePrice || leaf.originalPrice,
          stock: spec.stock,
          imageUrl: spec.imageUrl || this.product.imageUrl
        });
      } else {
        this.product = Object.assign({}, this.product, {
          id: leaf.productId,
          name,
          price: leaf.price,
          sourcePrice: leaf.originalPrice,
          stock: this.product.stock > 0 ? this.product.stock : 99
        });
      }
      this.order.ProductId = leaf.productId;
      this.initRechargeForm(leaf);
      history.replaceState(null, '', seoProductUrl(leaf.productId));
      this.applyProductSeoTags();
    },
    initRechargeForm(leaf) {
      const form = {};
      (leaf.rechargeFields || []).forEach((f) => {
        form[f.key] = f.defaultValue || (f.options && f.options[0] && f.options[0].value) || '';
      });
      this.rechargeForm = form;
    },
    goArticle(n) {
      if (!n || !n.id) return;
      location.href = seoArticleUrl(n);
    },
    goRelated(item) {
      if (!item || !item.id) return;
      location.href = seoProductUrl(item.id);
    },
    productHref(item) {
      return seoProductUrl(item.id);
    },
    articleHref(n) {
      return seoArticleUrl(n);
    },
    parseSpecName(name) {
      const s = String(name || '');
      const idx = s.indexOf(' | ');
      if (idx > 0) {
        return { category: s.slice(0, idx).trim(), region: s.slice(idx + 3).trim() };
      }
      return { category: '', region: s };
    },
    selectCategory(cat) {
      this.selectedCategory = cat;
    },
    goCategory() {
      const catId = this.pageCategoryId;
      if (catId) {
        location.href = '/?cat=' + encodeURIComponent(catId);
      } else {
        location.href = '/';
      }
    },
    isSpecActive(spec) {
      return String(spec.id) === String(this.product.id);
    },
    switchSpec(spec) {
      if (this.isSpecActive(spec)) return;
      location.href = seoProductUrl(spec.id);
    },
    openBuyModal() {
      if (this.product.stock <= 0) return;
      for (let i = 0; i < this.activeRechargeFields.length; i++) {
        const f = this.activeRechargeFields[i];
        if (f.required && !String(this.rechargeForm[f.key] || '').trim()) {
          alert('请填写' + f.label);
          return;
        }
      }
      this.showEmailModal = true;
    },
    buildOrderEmail() {
      let email = String(this.order.Email || '').trim();
      const parts = this.activeRechargeFields.map((f) => {
        const val = String(this.rechargeForm[f.key] || '').trim();
        return val ? (f.label + ':' + val) : '';
      }).filter(Boolean);
      if (parts.length) email += '\n[充值信息] ' + parts.join('; ');
      return email;
    },
    async buy() {
      if (!this.order.Email) {
        alert('请填写邮箱，用于接收订单信息');
        return;
      }
      this.buying = true;
      try {
        const payload = Object.assign({}, this.order, { Email: this.buildOrderEmail() });
        const data = new URLSearchParams(payload).toString();
        const res = await axios.post(`${API}/order/buy`, data, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        if (res.data.Code === 200) {
          localStorage.setItem('email', this.order.Email);
          this.showEmailModal = false;
          const url = res.data.Data.PaymentUrl;
          if (url) {
            window.location.href = url;
          } else {
            alert('订单已创建：' + res.data.Data.Entity.OrderNo);
            location.href = '/order/search.html?keyword=' + res.data.Data.Entity.OrderNo;
          }
        } else {
          alert(res.data.Message || '下单失败');
        }
      } catch (e) {
        alert('下单失败: ' + ((e.response && e.response.data && e.response.data.Message) || e.message));
      } finally {
        this.buying = false;
      }
    }
  }
};

const NewsApp = {
  mixins: [HeaderMixin],
  data() {
    return {
      newsMeta: { title: '新闻资讯', subtitle: '', totalPages: 1, pageSize: 10 },
      allItems: [],
      relatedProducts: [],
      currentPage: 1,
      loading: true
    };
  },
  computed: {
    pageItems() {
      const size = this.newsMeta.pageSize || 10;
      const start = (this.currentPage - 1) * size;
      return this.allItems.slice(start, start + size);
    },
    pageList() {
      const total = this.newsMeta.totalPages || 1;
      const cur = this.currentPage;
      const pages = [];
      if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i);
        return pages;
      }
      pages.push(1);
      if (cur > 4) pages.push('...');
      const start = Math.max(2, cur - 2);
      const end = Math.min(total - 1, cur + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      if (cur < total - 3) pages.push('...');
      pages.push(total);
      return pages;
    }
  },
  async mounted() {
    this.loadCategories();
    const params = new URLSearchParams(location.search);
    this.currentPage = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
    try {
      const res = await axios.get('/data/news-list.json?v=1');
      const data = res.data || {};
      this.newsMeta = {
        title: data.title || '新闻资讯',
        subtitle: data.subtitle || '',
        totalPages: data.totalPages || 1,
        pageSize: data.pageSize || 10
      };
      this.allItems = data.items || [];
      this.relatedProducts = data.relatedProducts || [];
      if (this.currentPage > this.newsMeta.totalPages) {
        this.currentPage = this.newsMeta.totalPages;
      }
      if (typeof Seo !== 'undefined' && Seo.applyNewsSeo) {
        Seo.applyNewsSeo(this.newsMeta, this.currentPage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    productImage(url) {
      const raw = String(url || '').trim();
      if (!raw) return '';
      try {
        const u = new URL(raw);
        u.pathname = u.pathname.split('/').map((seg) => {
          try { return encodeURIComponent(decodeURIComponent(seg)); } catch (e) { return seg; }
        }).join('/');
        return u.toString();
      } catch (e) {
        return raw.replace(/ /g, '%20');
      }
    },
    goArticle(n) {
      if (!n || !n.id) return;
      location.href = seoArticleUrl(n);
    },
    goRelated(item) {
      if (!item || !item.id) return;
      location.href = seoProductUrl(item.id);
    },
    articleHref(n) {
      return seoArticleUrl(n);
    },
    productHref(item) {
      return seoProductUrl(item.id);
    },
    goPage(page) {
      if (page === '...' || page === this.currentPage) return;
      location.href = (typeof Seo !== 'undefined' && Seo.newsPageUrl)
        ? Seo.newsPageUrl(page)
        : (page <= 1 ? '/news.html' : '/news/page-' + page + '.html');
    }
  }
};

const ArticleApp = {
  data() {
    return {
      article: {},
      loading: true,
      errorMsg: ''
    };
  },
  async mounted() {
    const params = new URLSearchParams(location.search);
    let id = params.get('id');
    if (!id) {
      const m = location.pathname.match(/\/article\/(\d+)\.html$/i);
      if (m) id = m[1];
    }
    if (!id) {
      this.loading = false;
      this.errorMsg = '缺少文章ID';
      return;
    }
    try {
      const res = await axios.get('/data/articles/' + encodeURIComponent(id) + '.json?v=1');
      this.article = res.data || {};
      if (this.article.title && typeof Seo !== 'undefined' && Seo.applyArticleSeo) {
        Seo.applyArticleSeo(this.article);
      }
    } catch (e) {
      this.errorMsg = '文章加载失败';
    } finally {
      this.loading = false;
    }
  }
};

const OrderApp = {
  data() {
    return { keyword: '', orders: [], loading: false };
  },
  mounted() {
    const params = new URLSearchParams(location.search);
    this.keyword = params.get('keyword') || '';
    if (this.keyword) this.search();
  },
  methods: {
    async search() {
      if (!this.keyword) return;
      this.loading = true;
      try {
        const res = await axios.get(`${API}/order/search?keyword=${encodeURIComponent(this.keyword)}`);
        this.orders = res.data.Data || [];
      } catch (e) {
        alert('查询失败');
      } finally {
        this.loading = false;
      }
    },
    statusText(s) {
      return { pending: '待支付', paid: '已支付', cancelled: '已取消' }[s] || s;
    },
    formatPrice(p) { return Number(p).toFixed(2) + ' USDT'; }
  }
};
