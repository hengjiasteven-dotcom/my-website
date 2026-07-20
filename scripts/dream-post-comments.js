'use strict';

hexo.extend.filter.register('before_generate', function() {
  const posts = this.locals.get('posts');
  if (!posts || !posts.data) return;

  posts.data.forEach((post) => {
    if (post.comment === false || post.comments === false) return;
    post.comments = true;
    if (!post.comment) post.comment = 'waline';
  });

  this.locals.set('posts', posts);
}, 20);
