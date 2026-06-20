'use strict';

const fs = require('fs');
const path = require('path');

function asDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function rootUrl(root, routePath) {
  return `${String(root || '/').replace(/\/?$/, '/')}${String(routePath || '').replace(/^\//, '')}`;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function daysSince(date, now) {
  if (!date) return 0;
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((end - start) / 86400000));
}

function readTasks(hexo) {
  const filePath = path.join(hexo.source_dir, '_data', 'tasks.json');
  if (!fs.existsSync(filePath)) return [];

  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(value)) return [];

    return value
      .filter((task) => task && typeof task === 'object' && task.title)
      .map((task) => ({
        id: String(task.id || ''),
        title: String(task.title || ''),
        date: String(task.date || ''),
        startTime: String(task.startTime || ''),
        endTime: String(task.endTime || ''),
        repeatMode: String(task.repeatMode || 'none'),
        repeatDays: Array.isArray(task.repeatDays) ? task.repeatDays : [],
        repeatUntil: String(task.repeatUntil || ''),
        notes: String(task.notes || ''),
        completed: Boolean(task.completed),
        completedAt: String(task.completedAt || ''),
        createdAt: String(task.createdAt || ''),
        updatedAt: String(task.updatedAt || '')
      }));
  } catch (error) {
    hexo.log.warn(`[DreamTheme] Failed to read tasks.json: ${error.message}`);
    return [];
  }
}

function generateSiteData(hexo, locals) {
  const now = new Date();
  const posts = (locals.posts && locals.posts.toArray ? locals.posts.toArray() : [])
    .filter((post) => !post.draft && asDate(post.date))
    .sort((a, b) => asDate(b.date) - asDate(a.date));

  const updates = posts
    .map((post) => asDate(post.updated) || asDate(post.date))
    .filter(Boolean)
    .sort((a, b) => b - a);

  const firstPostDate = posts.length ? asDate(posts[posts.length - 1].date) : now;
  const latestPostDate = posts.length ? asDate(posts[0].date) : null;
  const latestUpdateDate = updates.length ? updates[0] : latestPostDate;
  const totalWords = posts.reduce((sum, post) => sum + stripHtml(post.content || post.raw || '').length, 0);
  const calendar = {};
  const tags = (locals.tags && locals.tags.toArray ? locals.tags.toArray() : [])
    .filter((tag) => tag && tag.name && tag.length)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN'))
    .map((tag) => ({
      name: String(tag.name),
      path: rootUrl(hexo.config.root, tag.path),
      count: tag.length
    }));

  posts.forEach((post) => {
    const date = asDate(post.date);
    const key = dateKey(date);
    if (!calendar[key]) {
      calendar[key] = {
        count: 0,
        posts: []
      };
    }
    calendar[key].count += 1;
    calendar[key].posts.push({
      title: post.title,
      url: rootUrl(hexo.config.root, post.path)
    });
  });

  const data = {
    generatedAt: now.toISOString(),
    stats: {
      postCount: posts.length,
      totalWords,
      runningDays: daysSince(firstPostDate, now),
      latestPostDays: daysSince(latestPostDate, now),
      latestUpdateDays: daysSince(latestUpdateDate, now),
      firstPostDate: firstPostDate ? dateKey(firstPostDate) : '',
      latestPostDate: latestPostDate ? dateKey(latestPostDate) : '',
      latestUpdateDate: latestUpdateDate ? dateKey(latestUpdateDate) : ''
    },
    tags,
    calendar,
    tasks: readTasks(hexo)
  };

  return {
    path: 'js/dream-site-data.js',
    data: `window.DREAM_SITE_DATA = ${JSON.stringify(data, null, 2)};\n`
  };
}

function register(hexo) {
  hexo.extend.generator.register('dream_site_data', function(locals) {
    return generateSiteData(hexo, locals);
  });
}

module.exports = {
  asDate,
  pad,
  dateKey,
  rootUrl,
  stripHtml,
  daysSince,
  readTasks,
  generateSiteData,
  register
};

if (typeof hexo !== 'undefined') {
  register(hexo);
}
