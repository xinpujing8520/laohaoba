/**
 * Client-side SEO helpers — meta, canonical, Open Graph, JSON-LD.
 */
(function (global) {
  const SITE = 'https://www.laohaoba.com';
  const DEFAULT_IMAGE = SITE + '/assets/laohaoba-logo.svg';
  const BRAND = '老号吧';

  function absUrl(path) {
    if (!path) return SITE + '/';
    if (/^https?:\/\//i.test(path)) return path;
    return SITE + (path.startsWith('/') ? path : '/' + path);
  }

  function productUrl(id) {
    const pid = String(id || '').replace(/\.html$/i, '').trim();
    if (!pid) return '/goods';
    // Purchase SPA is the only product page (no separate SSG /goods/ab_xxx)
    return '/goods?id=' + encodeURIComponent(pid);
  }

  function articleUrl(article) {
    const id = article && (article.id || article);
    if (!id) return '/news';
    return '/article/' + encodeURIComponent(id) + '.html';
  }

function newsPageUrl(page) {
  const p = Number(page) || 1;
  // Extensionless paths match Cloudflare Pages canonical URLs
  // (/news.html → /news, /news/page-2.html → /news/page-2).
  if (p <= 1) return '/news';
  return '/news/page-' + p;
}

  function categoryUrl(catId) {
    return catId ? '/?cat=' + encodeURIComponent(catId) : '/';
  }

  function stripHtml(html) {
    return String(html || '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function truncate(text, max) {
    const s = String(text || '').trim();
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
  }

  function upsertMeta(attr, key, content) {
    if (!content) return;
    let el = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function upsertLink(rel, href) {
    if (!href) return;
    let el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function removeLink(rel) {
    document.querySelectorAll('link[rel="' + rel + '"]').forEach((el) => el.remove());
  }

  function setJsonLd(id, data) {
    let el = document.getElementById(id);
    if (!data) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  function applySeo(opts) {
    opts = opts || {};
    const title = opts.title || BRAND;
    const description = opts.description || '';
    const canonical = opts.canonical || location.pathname + location.search;
    const image = absUrl(opts.image || DEFAULT_IMAGE);
    const type = opts.ogType || 'website';

    document.title = title.includes(BRAND) ? title : title + ' - ' + BRAND;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', opts.robots || 'index,follow,max-image-preview:large');
    upsertLink('canonical', absUrl(canonical));

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', absUrl(canonical));
    upsertMeta('property', 'og:title', document.title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:site_name', BRAND);
    upsertMeta('property', 'og:locale', 'zh_CN');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', document.title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    removeLink('prev');
    removeLink('next');
    if (opts.prev) upsertLink('prev', absUrl(opts.prev));
    if (opts.next) upsertLink('next', absUrl(opts.next));

    setJsonLd('seo-jsonld', opts.jsonLd || null);
  }

  function applyHomeSeo(opts) {
    opts = opts || {};
    const cat = opts.categoryId || '';
    const keyword = opts.keyword || '';
    const catName = opts.categoryName || '';
    let title = '苹果id购买|国外ID购买|电报Telegram 账号购买-老号吧';
    let description = '老号吧提供苹果id购买、电报Telegram账号等各类国外ID，社交媒体账号购买批发，支持USDT TRC20扫码支付。';
    let canonical = '/';

    if (keyword) {
      title = keyword + ' - 商品搜索 - 老号吧';
      description = '在老号吧搜索「' + keyword + '」，购买海外账号、苹果ID、社交账号等，USDT TRC20 扫码支付，即时发货。';
      canonical = '/?key=' + encodeURIComponent(keyword);
    } else if (cat && catName) {
      title = catName + '购买 - 老号吧';
      description = '老号吧' + catName + '专区，精选优质账号，USDT TRC20 扫码支付，5分钟极速发货，7×24小时客服在线。';
      canonical = '/?cat=' + encodeURIComponent(cat);
    }

    applySeo({
      title,
      description,
      canonical,
      image: DEFAULT_IMAGE,
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        name: BRAND,
        url: SITE,
        description: description,
        potentialAction: {
          '@type': 'SearchAction',
          target: SITE + '/?key={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      }
    });
  }

  function applyProductSeo(data) {
    const name = data.displayName || data.name || '商品详情';
    const desc = truncate(
      stripHtml(data.description || data.detailHtml || '') ||
      '在老号吧购买' + name + '，USDT TRC20 扫码支付，即时发货，7×24小时客服在线。',
      160
    );
    const id = data.productId || data.id || '';
    const canonical = productUrl(id);
    const image = absUrl(data.image || data.iconUrl || DEFAULT_IMAGE);
    const price = Number(data.price);
    const breadcrumbs = [
      { '@type': 'ListItem', position: 1, name: '首页', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: data.categoryName || '商品', item: SITE + (data.categoryId ? '/?cat=' + encodeURIComponent(data.categoryId) : '/') },
      { '@type': 'ListItem', position: 3, name: name, item: SITE + canonical }
    ];

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs
        },
        {
          '@type': 'Product',
          name: name,
          description: desc,
          image: image,
          brand: { '@type': 'Brand', name: BRAND },
          offers: {
            '@type': 'Offer',
            url: SITE + canonical,
            priceCurrency: 'USD',
            price: Number.isFinite(price) ? price.toFixed(2) : '0.00',
            availability: 'https://schema.org/InStock',
            seller: { '@type': 'Organization', name: BRAND }
          }
        }
      ]
    };

    applySeo({
      title: name,
      description: desc,
      canonical,
      image,
      ogType: 'product',
      jsonLd
    });
  }

  function applyArticleSeo(article) {
    const title = article.title || '文章详情';
    const desc = truncate(article.summary || stripHtml(article.content) || title, 160);
    const canonical = articleUrl(article);
    const image = absUrl(article.cover || DEFAULT_IMAGE);

    applySeo({
      title,
      description: desc,
      canonical,
      image,
      ogType: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: '首页', item: SITE + '/' },
              { '@type': 'ListItem', position: 2, name: '新闻资讯', item: SITE + '/news' },
              { '@type': 'ListItem', position: 3, name: title, item: SITE + canonical }
            ]
          },
          {
            '@type': 'Article',
            headline: title,
            description: desc,
            image: image,
            datePublished: article.date || undefined,
            author: { '@type': 'Organization', name: BRAND },
            publisher: {
              '@type': 'Organization',
              name: BRAND,
              logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE }
            },
            mainEntityOfPage: SITE + canonical
          }
        ]
      }
    });
  }

  function applyNewsSeo(meta, page) {
    const cur = page || 1;
    const total = (meta && meta.totalPages) || 1;
    const title = (meta && meta.title) || '新闻资讯';
    const desc = truncate((meta && meta.subtitle) || '老号吧行业新闻、账号购买教程与促销活动，了解海外账号选购与使用技巧。', 160);
    const canonical = newsPageUrl(cur);

    applySeo({
      title: cur > 1 ? title + ' - 第' + cur + '页' : title,
      description: desc,
      canonical,
      ogType: 'website',
      prev: cur > 1 ? newsPageUrl(cur - 1) : null,
      next: cur < total ? newsPageUrl(cur + 1) : null,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: desc,
        url: SITE + canonical,
        isPartOf: { '@type': 'WebSite', name: BRAND, url: SITE }
      }
    });
  }

  global.Seo = {
    SITE,
    DEFAULT_IMAGE,
    absUrl,
    productUrl,
    articleUrl,
    newsPageUrl,
    categoryUrl,
    stripHtml,
    truncate,
    applySeo,
    applyHomeSeo,
    applyProductSeo,
    applyArticleSeo,
    applyNewsSeo
  };
})(typeof window !== 'undefined' ? window : global);
