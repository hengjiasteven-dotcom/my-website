'use strict';

function register(hexo) {
  hexo.extend.filter.register('before_post_render', function(data) {
    if (!data || typeof data !== 'object') return data;

    data.comments = false;
    data.comment = '';
    return data;
  });

  hexo.extend.filter.register('after_render:html', function(content) {
    return String(content || '').replace(
      /<article id="comments"[\s\S]*?<noscript>Please enable JavaScript to view the comments<\/noscript>\s*<\/article>/g,
      ''
    );
  });
}

module.exports = {
  register
};

if (typeof hexo !== 'undefined') {
  register(hexo);
}
