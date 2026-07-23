(function() {
  'use strict';

  var localHosts = ['localhost', '127.0.0.1', '::1'];
  var apiBase = (function() {
    var configured = String(window.DREAM_PUBLIC_API_BASE || '').trim().replace(/\/+$/, '');
    if (configured) return configured;
    return 'https://api.xiaodaidai.site';
  })();
  var stateKey = 'DreamCommentDraft';
  var initialized = false;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(value) {
    try {
      return new Date(value).toLocaleString('zh-CN');
    } catch {
      return String(value || '');
    }
  }

  function currentContext() {
    var pathname = window.location.pathname || '/';
    if (pathname === '/message/' || pathname === '/message') {
      return {
        kind: 'message',
        path: '/message/',
        title: '留言板',
        empty: '还没有留言，来写下第一句吧。'
      };
    }

    if (document.querySelector('article.post-content')) {
      return {
        kind: 'comment',
        path: pathname,
        title: '评论',
        empty: '还没有评论，欢迎留下你的想法。'
      };
    }

    if (pathname === '/about/' || pathname === '/about') {
      return {
        kind: 'comment',
        path: '/about/',
        title: '关于页交流',
        empty: '还没有评论，欢迎留下你的想法。'
      };
    }

    return null;
  }

  function mountNode() {
    var existing = document.getElementById('dream-comments-root');
    if (existing) return existing;

    var article = document.querySelector('article.post-content, article.page-content');
    if (!article) return null;

    var root = document.createElement('section');
    root.id = 'dream-comments-root';
    article.appendChild(root);
    return root;
  }

  function endpoint(context) {
    return context.kind === 'message'
      ? apiBase + '/api/v1/messages'
      : apiBase + '/api/v1/comments';
  }

  function listUrl(context) {
    var base = endpoint(context);
    if (context.kind === 'message') return base + '?pageSize=50';
    return base + '?path=' + encodeURIComponent(context.path) + '&pageSize=50';
  }

  function loadDraft() {
    try {
      return JSON.parse(localStorage.getItem(stateKey) || '{}');
    } catch {
      return {};
    }
  }

  function saveDraft(values) {
    localStorage.setItem(stateKey, JSON.stringify(values));
  }

  async function requestJson(url, options) {
    var response = await fetch(url, options);
    var payload = await response.json().catch(function() {
      return { ok: false, error: '服务返回了无法解析的内容' };
    });

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || '请求失败');
    }

    return payload.data;
  }

  function renderList(items, emptyText) {
    if (!items.length) {
      return '<div class="dream-comments-empty">' + escapeHtml(emptyText) + '</div>';
    }

    return '<div class="dream-comments-list">' + items.map(function(item) {
      return [
        '<article class="dream-comment-item">',
        '<header class="dream-comment-head">',
        '<div>',
        '<strong>' + escapeHtml(item.authorName) + '</strong>',
        item.authorWebsite ? ' <a href="' + escapeHtml(item.authorWebsite) + '" target="_blank" rel="noopener">主页</a>' : '',
        '</div>',
        '<time>' + escapeHtml(formatTime(item.createdAt)) + '</time>',
        '</header>',
        '<p>' + escapeHtml(item.content).replace(/\n/g, '<br>') + '</p>',
        '</article>'
      ].join('');
    }).join('') + '</div>';
  }

  async function renderComments() {
    var context = currentContext();
    if (!context) return;

    var root = mountNode();
    if (!root) return;

    var draft = loadDraft();
    root.innerHTML = [
      '<section class="dream-comments">',
      '<div class="dream-comments-shell">',
      '<div class="dream-comments-head">',
      '<h2>' + escapeHtml(context.title) + '</h2>',
      '<button class="dream-comments-refresh" type="button">刷新</button>',
      '</div>',
      '<form class="dream-comments-form">',
      '<div class="dream-comments-grid">',
      '<input name="authorName" placeholder="昵称" maxlength="40" value="' + escapeHtml(draft.authorName || '') + '" required>',
      '<input name="authorEmail" placeholder="邮箱（选填）" maxlength="120" value="' + escapeHtml(draft.authorEmail || '') + '">',
      '<input name="authorWebsite" placeholder="网站（选填）" maxlength="240" value="' + escapeHtml(draft.authorWebsite || '') + '">',
      '</div>',
      '<textarea name="content" placeholder="' + (context.kind === 'message' ? '写点想说的话吧…' : '留下你的评论…') + '" maxlength="4000" required></textarea>',
      '<div class="dream-comments-actions">',
      '<span class="dream-comments-status">评论服务连接中…</span>',
      '<button type="submit">' + (context.kind === 'message' ? '发送留言' : '提交评论') + '</button>',
      '</div>',
      '</form>',
      '<div class="dream-comments-results"></div>',
      '</div>',
      '</section>'
    ].join('');

    var form = root.querySelector('.dream-comments-form');
    var status = root.querySelector('.dream-comments-status');
    var results = root.querySelector('.dream-comments-results');
    var refreshButton = root.querySelector('.dream-comments-refresh');

    async function refresh() {
      status.textContent = '正在加载…';
      try {
        var data = await requestJson(listUrl(context));
        results.innerHTML = renderList(data.items || [], context.empty);
        status.textContent = '已连接到自建评论服务';
      } catch (error) {
        results.innerHTML = '<div class="dream-comments-empty">' + escapeHtml(error.message) + '</div>';
        status.textContent = '评论服务暂时不可用';
      }
    }

    refreshButton.addEventListener('click', refresh);

    form.addEventListener('input', function() {
      var formData = new FormData(form);
      saveDraft({
        authorName: String(formData.get('authorName') || ''),
        authorEmail: String(formData.get('authorEmail') || ''),
        authorWebsite: String(formData.get('authorWebsite') || '')
      });
    });

    form.addEventListener('submit', async function(event) {
      event.preventDefault();
      status.textContent = context.kind === 'message' ? '正在发送留言…' : '正在提交评论…';

      var formData = new FormData(form);
      var payload = {
        authorName: String(formData.get('authorName') || ''),
        authorEmail: String(formData.get('authorEmail') || ''),
        authorWebsite: String(formData.get('authorWebsite') || ''),
        content: String(formData.get('content') || '')
      };

      if (context.kind === 'comment') {
        payload.pagePath = context.path;
      }

      try {
        await requestJson(endpoint(context), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        form.querySelector('textarea').value = '';
        status.textContent = context.kind === 'message'
          ? '留言已发送。'
          : '评论已提交。';
        await refresh();
      } catch (error) {
        status.textContent = error.message;
      }
    });

    await refresh();
  }

  function init() {
    if (!initialized) {
      initialized = true;
    }
    renderComments();
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('dream:pjax:complete', renderComments);
  document.addEventListener('pjax:complete', renderComments);
})();
