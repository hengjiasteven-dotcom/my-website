'use strict';

const fs = require('node:fs');
const path = require('node:path');

const NON_PAGE_PATH = /(?:^|\/)(?:assets|css|fonts|img|js|music|picture|video)(?:\/|$)/i;
const NON_PAGE_EXTENSION = /\.(?:css|gif|ico|jpe?g|js|json|m4a|mp3|mp4|ogg|png|svg|txt|wav|webm|webp|woff2?)$/i;
const REQUIRED_PAGE_ROUTES = ['', 'about', 'gacha-home', 'links', 'message', 'pet-game', 'tools', 'world'];

function escapeAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function canonicalUrl(siteUrl, routePath) {
  const origin = String(siteUrl || '').trim().replace(/\/+$/, '');
  if (!origin) return '';

  let route = String(routePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (!route || route === 'index.html') {
    route = '';
  } else {
    route = route.replace(/(^|\/)index\.html$/i, '$1');
  }

  if (/^404(?:\.html)?$/i.test(route)) return '';
  return new URL(route || '/', `${origin}/`).href;
}

function withCanonical(html, routePath, siteUrl) {
  const canonical = canonicalUrl(siteUrl, routePath);
  if (!canonical) return String(html || '');

  const canonicalTag = `<link rel="canonical" href="${escapeAttribute(canonical)}">`;
  let output = String(html || '');

  if (/<link\b[^>]*\brel=(?:"|')canonical(?:"|')[^>]*>/i.test(output)) {
    output = output.replace(/<link\b[^>]*\brel=(?:"|')canonical(?:"|')[^>]*>/i, canonicalTag);
  } else {
    output = output.replace('</head>', `  ${canonicalTag}\n</head>`);
  }

  return output.replace(
    /<meta\b[^>]*\bproperty=(?:"|')og:url(?:"|')[^>]*>/i,
    `<meta property="og:url" content="${escapeAttribute(canonical)}">`
  );
}

function isIndexableLocation(location) {
  try {
    const url = new URL(String(location || '').replace(/&amp;/g, '&'));
    return !NON_PAGE_PATH.test(url.pathname) && !NON_PAGE_EXTENSION.test(url.pathname);
  } catch {
    return false;
  }
}

function cleanSitemap(xml) {
  let removed = 0;
  const output = String(xml || '').replace(/\s*<url>[\s\S]*?<\/url>/g, (block) => {
    const match = block.match(/<loc>([^<]+)<\/loc>/i);
    if (match && isIndexableLocation(match[1])) return block;
    removed += 1;
    return '';
  });

  return { output, removed };
}

function normalizedLocation(location) {
  const url = new URL(String(location || '').replace(/&amp;/g, '&'));
  url.pathname = url.pathname.replace(/\/index\.html$/i, '/');
  return url.href;
}

function normalizeSitemapLocations(xml) {
  return String(xml || '').replace(/<loc>([^<]+)<\/loc>/gi, (match, location) => {
    try {
      return `<loc>${normalizedLocation(location).replace(/&/g, '&amp;')}</loc>`;
    } catch {
      return match;
    }
  });
}

function ensureRequiredPages(xml, rootDir, siteUrl) {
  const existing = new Set();
  String(xml || '').replace(/<loc>([^<]+)<\/loc>/gi, (match, location) => {
    try {
      existing.add(normalizedLocation(location));
    } catch {}
    return match;
  });

  const additions = REQUIRED_PAGE_ROUTES.filter((route) => {
    const file = route
      ? path.join(rootDir, 'public', route, 'index.html')
      : path.join(rootDir, 'public', 'index.html');
    if (!fs.existsSync(file)) return false;
    return !existing.has(new URL(route ? `${route}/` : '/', `${siteUrl.replace(/\/+$/, '')}/`).href);
  }).map((route) => {
    const location = new URL(route ? `${route}/` : '/', `${siteUrl.replace(/\/+$/, '')}/`).href;
    return [
      '  <url>',
      `    <loc>${location.replace(/&/g, '&amp;')}</loc>`,
      '    <changefreq>weekly</changefreq>',
      `    <priority>${route ? '0.7' : '1.0'}</priority>`,
      '  </url>'
    ].join('\n');
  });

  if (!additions.length) return { output: xml, added: 0 };
  return {
    output: String(xml || '').replace(/\s*<\/urlset>\s*$/i, `\n${additions.join('\n')}\n</urlset>\n`),
    added: additions.length
  };
}

function cleanGeneratedSitemap(rootDir, siteUrl = 'https://xiaodaidai.site') {
  const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    throw new Error(`Sitemap not found: ${sitemapPath}`);
  }

  const cleaned = cleanSitemap(fs.readFileSync(sitemapPath, 'utf8'));
  const normalized = normalizeSitemapLocations(cleaned.output);
  const ensured = ensureRequiredPages(normalized, rootDir, siteUrl);
  fs.writeFileSync(sitemapPath, ensured.output, 'utf8');
  return { removed: cleaned.removed, added: ensured.added };
}

function register(hexo) {
  hexo.extend.filter.register('after_render:html', (html, data) => {
    if (!data || !data.path) return html;
    return withCanonical(html, data.path, hexo.config.url);
  });

}

module.exports = {
  canonicalUrl,
  cleanSitemap,
  cleanGeneratedSitemap,
  ensureRequiredPages,
  isIndexableLocation,
  normalizeSitemapLocations,
  register,
  withCanonical
};

if (require.main === module) {
  const result = cleanGeneratedSitemap(path.resolve(__dirname, '..'));
  console.log(`[seo-output] Removed ${result.removed} non-page sitemap entr${result.removed === 1 ? 'y' : 'ies'} and added ${result.added} required page entr${result.added === 1 ? 'y' : 'ies'}.`);
} else if (typeof hexo !== 'undefined') {
  register(hexo);
}
