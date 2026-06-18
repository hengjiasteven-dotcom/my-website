'use strict';

function withDeferredScripts(html) {
  return String(html || '').replace(
    /<script\b([^>]*?)src=("|\')([^"\']+)(\2)([^>]*)><\/script>/gi,
    (match, before, quote, src, afterQuote, rest) => {
      if (!/\/js\/dream-(?:theme-manifest|site-data|fluid)\.js(?:[?#][^"']*)?$/i.test(src)) {
        return match;
      }
      if (/\bdefer\b/i.test(before) || /\basync\b/i.test(before)) {
        return match;
      }

      return `<script${before}src=${quote}${src}${quote} defer${rest}></script>`;
    }
  );
}

function withSiteCopy(html) {
  return String(html || '').replace(
    /博客在允许 JavaScript 运行的环境下浏览效果更佳/g,
    '站点在允许 JavaScript 运行的环境下浏览效果更佳'
  );
}

hexo.extend.filter.register('after_render:html', (html, data) => {
  if (!data || !data.path || /\.xml$/i.test(data.path) || /\/xml\//i.test(data.path)) {
    return html;
  }

  return withSiteCopy(withDeferredScripts(html));
});
