/**
 * Legacy SEO product paths → purchase SPA.
 * /goods/ab_xxx  and  /goods/ab_xxx.html  →  /goods?id=ab_xxx
 * /goods (with or without ?id=) falls through to static goods.html
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const raw = context.params.path;
  const parts = Array.isArray(raw) ? raw : (raw ? [raw] : []);

  if (!parts.length) {
    return context.next();
  }

  let id = parts.join('/');
  if (id.toLowerCase().endsWith('.html')) {
    id = id.slice(0, -5);
  }
  if (!id || id === 'index') {
    return context.next();
  }

  const dest = new URL('/goods', url.origin);
  dest.searchParams.set('id', id);
  return Response.redirect(dest.toString(), 301);
}
