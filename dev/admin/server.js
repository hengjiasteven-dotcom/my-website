'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const dotenv = require('dotenv');
const express = require('express');
const multer = require('multer');
const session = require('express-session');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });

const rootDir = path.resolve(__dirname, '..', '..');
const postsDir = path.join(rootDir, 'source', '_posts');
const dataDir = path.join(rootDir, 'source', '_data');
const tasksPath = path.join(dataDir, 'tasks.json');
const pictureDir = path.join(rootDir, 'picture');
const musicDir = path.join(rootDir, 'music');
const videoDir = path.join(rootDir, 'video');
const publicDir = path.join(__dirname, 'public');
const uploadTempDir = path.join(rootDir, '.admin-uploads');
const pendingPublishPath = path.join(uploadTempDir, 'pending-publish.json');
const edgeoneBranch = process.env.ADMIN_EDGEONE_BRANCH || 'source';
const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();
const sshDir = path.join(homeDir, '.ssh');
const sshKeyPath = path.join(sshDir, 'id_ed25519');
const knownHostsPath = path.join(sshDir, 'known_hosts');

const host = process.env.ADMIN_HOST || '127.0.0.1';
const port = Number(process.env.ADMIN_PORT || 4001);
const password = process.env.ADMIN_PASSWORD || '';
const sessionSecret = process.env.ADMIN_SESSION_SECRET || '';
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);

if (!password || password.length < 8) {
  console.error('[admin] Set ADMIN_PASSWORD in .env with at least 8 characters before starting the admin server.');
  process.exit(1);
}

if (!loopbackHosts.has(host)) {
  console.error('[admin] ADMIN_HOST must stay on 127.0.0.1, localhost, or ::1 so the admin page is not exposed to other people.');
  process.exit(1);
}

if (!sessionSecret || sessionSecret.length < 16) {
  console.error('[admin] Set ADMIN_SESSION_SECRET in .env with at least 16 characters before starting the admin server.');
  process.exit(1);
}

fs.mkdirSync(uploadTempDir, { recursive: true });
fs.mkdirSync(postsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(pictureDir, { recursive: true });
fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

if (!fs.existsSync(tasksPath)) {
  fs.writeFileSync(tasksPath, '[]\n', 'utf8');
}

if (!fs.existsSync(pendingPublishPath)) {
  fs.writeFileSync(pendingPublishPath, '[]\n', 'utf8');
}

const app = express();
let activeJob = null;
const jobHistory = [];

const upload = multer({
  dest: uploadTempDir,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 20
  }
});

const textParser = express.urlencoded({ extended: false });

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(textParser);
app.use(session({
  name: 'blog_admin_sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.get('/', (req, res) => res.redirect('/admin'));
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.use('/admin/assets', express.static(publicDir, {
  etag: true,
  maxAge: '1h'
}));

app.get('/admin/api/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session.authenticated) });
});

app.post('/admin/api/login', (req, res) => {
  const input = String(req.body.password || '');
  if (!safeEqual(input, password)) {
    return res.status(401).json({ error: '密码不正确' });
  }

  req.session.regenerate((error) => {
    if (error) return res.status(500).json({ error: '登录会话创建失败' });
    req.session.authenticated = true;
    res.json({ ok: true });
  });
});

app.post('/admin/api/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('blog_admin_sid');
    res.json({ ok: true });
  });
});

app.get('/admin/api/status', requireAuth, (req, res) => {
  res.json({
    activeJob: activeJob ? publicJob(activeJob) : null,
    history: jobHistory.slice(-10).map(publicJob),
    counts: getLibraryCounts()
  });
});

app.get('/admin/api/media', requireAuth, (req, res) => {
  res.json({
    pictures: listMediaFiles(pictureDir, 'picture'),
    music: listMediaFiles(musicDir, 'music'),
    videos: listMediaFiles(videoDir, 'video'),
    playlist: readPlaylist()
  });
});

app.get('/admin/api/tasks', requireAuth, (req, res) => {
  res.json({
    tasks: sortTasks(readTasks())
  });
});

app.post('/admin/api/tasks', requireAuth, (req, res) => {
  try {
    const tasks = readTasks();
    const payloadTasks = Array.isArray(req.body.tasks) ? req.body.tasks : null;
    const created = payloadTasks
      ? payloadTasks.map((task) => normalizeTaskInput(task))
      : [normalizeTaskInput(req.body)];
    const nextTasks = tasks.concat(created);
    writeTasks(nextTasks);
    res.json({
      ok: true,
      tasks: sortTasks(nextTasks),
      created
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/admin/api/tasks/:id', requireAuth, (req, res) => {
  try {
    const tasks = readTasks();
    const index = tasks.findIndex((task) => task.id === req.params.id);
    if (index < 0) throw new Error('Task not found');

    const current = tasks[index];
    const nextTask = normalizeTaskInput(req.body, current);
    tasks[index] = nextTask;
    writeTasks(tasks);
    res.json({
      ok: true,
      task: nextTask,
      tasks: sortTasks(tasks)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/admin/api/tasks/:id/toggle', requireAuth, (req, res) => {
  try {
    const tasks = readTasks();
    const index = tasks.findIndex((task) => task.id === req.params.id);
    if (index < 0) throw new Error('Task not found');

    const current = tasks[index];
    const completed = typeof req.body.completed === 'boolean' ? req.body.completed : !current.completed;
    const nextTask = normalizeTaskInput({
      ...current,
      completed,
      completedAt: completed ? new Date().toISOString() : ''
    }, current);

    tasks[index] = nextTask;
    writeTasks(tasks);
    res.json({
      ok: true,
      task: nextTask,
      tasks: sortTasks(tasks)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/admin/api/tasks/:id', requireAuth, (req, res) => {
  try {
    const tasks = readTasks();
    const nextTasks = tasks.filter((task) => task.id !== req.params.id);
    if (nextTasks.length === tasks.length) throw new Error('Task not found');
    writeTasks(nextTasks);
    res.json({
      ok: true,
      tasks: sortTasks(nextTasks)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/admin/api/posts', requireAuth, upload.single('markdown'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择 Markdown 文件' });
    ensureUploadExt(req.file.originalname, new Set(['.md', '.markdown']));

    const title = String(req.body.title || '').trim() || filenameTitle(req.file.originalname);
    const categories = splitTags(req.body.categories);
    const tags = splitTags(req.body.tags);
    const coverPath = normalizeMediaReferencePath(String(req.body.coverPath || '').trim(), 'picture');
    const postMusicPath = normalizeMediaReferencePath(String(req.body.postMusicPath || '').trim(), 'music');
    const postMusicName = String(req.body.postMusicName || '').trim();
    const postMusicPlacement = String(req.body.postMusicPlacement || 'after-front-matter');
    const publishNow = req.body.publishNow === 'true';

    if (publishNow && activeJob) {
      cleanupFiles(req.file);
      return res.status(409).json({
        error: `当前正在${activeJob.label}，请稍后再试`,
        job: publicJob(activeJob)
      });
    }

    const originalContent = fs.readFileSync(req.file.path, 'utf8');
    let content = ensurePostFrontMatter(originalContent, {
      title,
      categories,
      tags,
      coverPath
    });
    content = insertArticleMusic(content, {
      name: postMusicName,
      url: postMusicPath
    }, postMusicPlacement);

    const targetName = resolvePostTargetName(title);
    const targetPath = safeJoin(postsDir, targetName);
    fs.writeFileSync(targetPath, content, 'utf8');
    rememberPendingPublishFiles([path.relative(rootDir, targetPath)]);
    removeTemp(req.file.path);

    const result = {
      name: targetName,
      path: path.relative(rootDir, targetPath).replace(/\\/g, '/')
    };

    if (publishNow) {
      startSequenceJob(buildDeployCommands(), '构建并部署');
    }

    res.json({
      ok: true,
      post: result,
      music: postMusicPath ? { url: postMusicPath, name: postMusicName } : null,
      job: activeJob ? publicJob(activeJob) : null
    });
  } catch (error) {
    cleanupFiles(req.file);
    res.status(400).json({ error: error.message });
  }
});

app.post('/admin/api/media', requireAuth, upload.array('files', 20), (req, res) => {
  const uploadedFiles = req.files || [];
  try {
    if (!uploadedFiles.length) return res.status(400).json({ error: '请选择要上传的媒体文件' });

    const targetKind = String(req.body.kind || 'picture');
    const addToPlaylist = req.body.addToPlaylist === 'true';
    const kindConfig = mediaKindConfig(targetKind);
    const saved = [];

    uploadedFiles.forEach((file) => {
      ensureUploadExt(file.originalname, kindConfig.exts);
      const targetName = uniqueName(kindConfig.dir, sanitizeFileName(file.originalname));
      const targetPath = safeJoin(kindConfig.dir, targetName);
      fs.renameSync(file.path, targetPath);
      rememberPendingPublishFiles([path.relative(rootDir, targetPath)]);
      saved.push({
        name: targetName,
        kind: targetKind,
        url: mediaUrl(targetKind, targetName),
        markdown: mediaMarkdown(targetKind, targetName)
      });
    });

    if (targetKind === 'music' && addToPlaylist) {
      addTracksToPlaylist(saved.map((file) => file.name));
      rememberPendingPublishFiles([path.relative(rootDir, path.join(musicDir, 'playlist.json'))]);
    }

    res.json({ ok: true, files: saved, playlist: readPlaylist() });
  } catch (error) {
    uploadedFiles.forEach((file) => cleanupFiles(file));
    res.status(400).json({ error: error.message });
  }
});

app.post('/admin/api/playlist', requireAuth, (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const action = String(req.body.action || '').trim();
    if (!name) throw new Error('缺少音乐文件名');
    ensureExistingMedia(musicDir, name);

    const playlist = readPlaylist();
    const next = action === 'remove'
      ? playlist.filter((item) => item !== name)
      : playlist.includes(name) ? playlist : playlist.concat(name);

    writePlaylist(next);
    rememberPendingPublishFiles([path.relative(rootDir, path.join(musicDir, 'playlist.json'))]);
    res.json({ ok: true, playlist: next });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/admin/api/build', requireAuth, (req, res) => {
  try {
    const job = startCommandJob(['npm', 'run', 'build'], '构建网站');
    res.json({ ok: true, job: publicJob(job) });
  } catch (error) {
    res.status(409).json({ error: error.message, job: activeJob ? publicJob(activeJob) : null });
  }
});

app.post('/admin/api/deploy', requireAuth, (req, res) => {
  try {
    const job = startSequenceJob([
      ['__publish_source__'],
      ['npm', 'run', 'deploy']
    ], '部署上线');
    res.json({ ok: true, job: publicJob(job) });
  } catch (error) {
    res.status(409).json({ error: error.message, job: activeJob ? publicJob(activeJob) : null });
  }
});

app.post('/admin/api/build-deploy', requireAuth, (req, res) => {
  try {
    const job = startSequenceJob(buildDeployCommands(), '构建并部署');
    res.json({ ok: true, job: publicJob(job) });
  } catch (error) {
    res.status(409).json({ error: error.message, job: activeJob ? publicJob(activeJob) : null });
  }
});

app.use('/admin/api', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.use((req, res) => {
  res.redirect('/admin');
});

app.listen(port, host, () => {
  console.log(`[admin] Blog admin is running at http://${host}:${port}/admin`);
});

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: '请先登录' });
}

function safeEqual(input, expected) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function sanitizeFileName(name) {
  const decodedName = decodePossiblyMojibakeName(name);
  const ext = path.extname(decodedName).toLowerCase();
  const base = path.basename(decodedName, path.extname(decodedName));
  return `${slugify(base)}${ext}`;
}

function decodePossiblyMojibakeName(name) {
  const value = String(name || '');
  if (!/[ÃÂ]|[\u00C0-\u00FF]/.test(value)) return value;

  try {
    return Buffer.from(value, 'latin1').toString('utf8');
  } catch {
    return value;
  }
}

function slugify(value) {
  const normalized = String(value || 'post')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || `post-${Date.now()}`;
}

function filenameTitle(name) {
  return path.basename(String(name || ''), path.extname(String(name || ''))).trim() || '未命名文章';
}

function splitTags(value) {
  return String(value || '')
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueName(dir, name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  let candidate = `${base}${ext}`;
  let index = 1;

  while (fs.existsSync(safeJoin(dir, candidate))) {
    candidate = `${base}-${index}${ext}`;
    index += 1;
  }

  return candidate;
}

function resolvePostTargetName(title) {
  const slug = slugify(filenameTitle(title));
  const preferredName = `${slug}.md`;
  const preferredPath = safeJoin(postsDir, preferredName);
  return fs.existsSync(preferredPath) ? preferredName : uniqueName(postsDir, preferredName);
}

function readPendingPublishFiles() {
  try {
    const value = JSON.parse(fs.readFileSync(pendingPublishPath, 'utf8'));
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function normalizePendingPublishPath(value) {
  const relative = path.isAbsolute(value) ? path.relative(rootDir, value) : String(value || '');
  const normalized = relative.replace(/\\/g, '/').replace(/^\.\/+/, '').trim();
  if (!normalized || normalized.startsWith('..')) return null;
  return normalized;
}

function writePendingPublishFiles(paths) {
  const unique = Array.from(new Set(paths
    .map((item) => normalizePendingPublishPath(item))
    .filter(Boolean)));
  fs.writeFileSync(pendingPublishPath, `${JSON.stringify(unique, null, 2)}\n`, 'utf8');
}

function rememberPendingPublishFiles(paths) {
  const current = readPendingPublishFiles();
  writePendingPublishFiles(current.concat(paths));
}

function clearPendingPublishFiles() {
  writePendingPublishFiles([]);
}

function safeJoin(baseDir, fileName) {
  const target = path.resolve(baseDir, fileName);
  const base = path.resolve(baseDir);
  if (!target.startsWith(base + path.sep) && target !== base) {
    throw new Error('文件路径不安全');
  }
  return target;
}

function ensureUploadExt(name, allowedExts) {
  const ext = path.extname(name).toLowerCase();
  if (!allowedExts.has(ext)) {
    throw new Error(`不支持的文件类型：${ext || '无扩展名'}`);
  }
}

function ensurePostFrontMatter(content, meta) {
  const now = formatDate(new Date());
  const source = content.replace(/^\uFEFF/, '');
  const frontMatter = {
    title: meta.title,
    date: now
  };

  if (meta.categories.length) frontMatter.categories = meta.categories;
  if (meta.tags.length) frontMatter.tags = meta.tags;
  if (meta.coverPath) {
    frontMatter.index_img = meta.coverPath;
    frontMatter.banner_img = meta.coverPath;
  }

  if (/^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(source)) {
    return source.replace(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/, (match, body) => {
      const nextBody = mergeFrontMatter(body, frontMatter);
      return `---\n${nextBody}---\n`;
    });
  }

  return `---\n${frontMatterText(frontMatter)}---\n\n${source}`;
}

function mergeFrontMatter(body, meta) {
  const keys = new Set(Object.keys(meta));
  const lines = body.split(/\r?\n/);
  const kept = [];
  let skippingBlock = false;

  lines.forEach((line) => {
    const keyMatch = line.match(/^([A-Za-z_][\w-]*):(?:\s|$)/);

    if (keyMatch) {
      skippingBlock = keys.has(keyMatch[1]);
      if (!skippingBlock) kept.push(line);
      return;
    }

    if (skippingBlock) {
      if (/^\s+/.test(line) || line.trim() === '') return;
      skippingBlock = false;
    }

    kept.push(line);
  });

  const rest = kept.join('\n').replace(/\n*$/, '\n');
  return `${frontMatterText(meta)}${rest}`;
}

function frontMatterText(meta) {
  return Object.entries(meta)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((item) => `  - ${escapeYaml(item)}`).join('\n')}\n`;
      }
      return `${key}: ${escapeYaml(value)}\n`;
    })
    .join('');
}

function escapeYaml(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:-]+$/.test(text)) return text;
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function formatDate(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDateForCommit(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function mediaKindConfig(kind) {
  if (kind === 'picture') return { dir: pictureDir, exts: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']) };
  if (kind === 'music') return { dir: musicDir, exts: new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac']) };
  if (kind === 'video') return { dir: videoDir, exts: new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv']) };
  throw new Error('未知媒体类型');
}

function mediaUrl(kind, name) {
  const folder = kind === 'picture' ? 'picture' : kind === 'music' ? 'music' : 'video';
  return `/assets/${folder}/${encodeURIComponent(name)}`;
}

function mediaMarkdown(kind, name) {
  const url = mediaUrl(kind, name);
  if (kind === 'picture') return `![${path.basename(name, path.extname(name))}](${url})`;
  if (kind === 'music') return `<audio controls src="${url}"></audio>`;
  return `<video controls src="${url}"></video>`;
}

function normalizeMediaReferencePath(value, kind) {
  let reference = String(value || '').trim();
  if (!reference) return '';

  const markdownMatch = reference.match(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/);
  if (markdownMatch) {
    reference = markdownMatch[1];
  }

  reference = reference.replace(/^["']|["']$/g, '').trim();
  reference = decodeRepeatedly(reference);

  if (/^https?:\/\//i.test(reference) || reference.startsWith('/assets/')) return reference;

  const normalized = reference.replace(/\\/g, '/');
  const folder = kind === 'picture' ? 'picture' : kind === 'music' ? 'music' : 'video';
  const marker = `/${folder}/`;
  const index = normalized.toLowerCase().lastIndexOf(marker);

  if (index >= 0) {
    const name = normalized.slice(index + marker.length);
    return mediaUrl(kind, path.basename(name));
  }

  return reference;
}

function decodeRepeatedly(value) {
  let current = value;
  for (let index = 0; index < 3; index += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

function insertArticleMusic(content, music, placement) {
  if (!music || !music.url) return content;

  const title = music.name ? path.basename(music.name, path.extname(music.name)) : 'article music';
  const audioBlock = `<audio controls preload="metadata" src="${music.url}">${title}</audio>`;
  if (content.includes(music.url)) return content;

  if (placement === 'end') {
    return `${content.replace(/\s*$/, '')}\n\n${audioBlock}\n`;
  }

  const frontMatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (frontMatterMatch) {
    const index = frontMatterMatch[0].length;
    return `${content.slice(0, index)}\n${audioBlock}\n\n${content.slice(index).replace(/^\s*/, '')}`;
  }

  return `${audioBlock}\n\n${content}`;
}

function listMediaFiles(dir, kind) {
  const config = mediaKindConfig(kind);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && config.exts.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const fullPath = path.join(dir, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        name: entry.name,
        url: mediaUrl(kind, entry.name),
        markdown: mediaMarkdown(kind, entry.name),
        size: stat.size,
        modifiedAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

function readPlaylist() {
  const playlistPath = path.join(musicDir, 'playlist.json');
  if (!fs.existsSync(playlistPath)) return [];
  try {
    const value = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writePlaylist(playlist) {
  const unique = Array.from(new Set(playlist));
  fs.writeFileSync(path.join(musicDir, 'playlist.json'), `${JSON.stringify(unique, null, 2)}\n`, 'utf8');
}

function addTracksToPlaylist(names) {
  const playlist = readPlaylist();
  names.forEach((name) => {
    if (!playlist.includes(name)) playlist.push(name);
  });
  writePlaylist(playlist);
}

function ensureExistingMedia(dir, name) {
  const target = safeJoin(dir, name);
  if (!fs.existsSync(target)) throw new Error('媒体文件不存在');
}

function startCommandJob(commandParts, label) {
  if (activeJob) {
    throw new Error(`当前正在${activeJob.label}，请稍后再试`);
  }

  const job = createJob(label, commandParts.join(' '));
  activeJob = job;
  runCommand(commandParts, job, () => finishJob(job, 0), (code) => finishJob(job, code));

  return job;
}

function startDeploySourceJob(label) {
  if (activeJob) {
    throw new Error(`当前正在${activeJob.label}，请稍后再试`);
  }

  const job = createJob(label, `git add --ignore-removal ... && git commit && git push origin HEAD:${edgeoneBranch}`);
  activeJob = job;
  runDeploySource(job);
  return job;
}

function startSequenceJob(commands, label) {
  if (activeJob) {
    throw new Error(`当前正在${activeJob.label}，请稍后再试`);
  }

  const job = createJob(label, commands.map((command) => command.join(' ')).join(' && '));
  activeJob = job;

  const runNext = (index) => {
    if (index >= commands.length) {
      finishJob(job, 0);
      return;
    }

    if (commands[index][0] === '__publish_source__') {
      runDeploySource(job, () => runNext(index + 1), (code) => finishJob(job, code));
      return;
    }

    appendJobOutput(job, `\n> ${commands[index].join(' ')}\n`);
    runCommand(commands[index], job, () => runNext(index + 1), (code) => finishJob(job, code));
  };

  runNext(0);
  return job;
}

function buildDeployCommands() {
  return [
    ['npm', 'run', 'build'],
    ['__publish_source__'],
    ['npm', 'run', 'deploy']
  ];
}

function buildPublishSourceAddCommand() {
  const trackedTargets = [
    '.gitignore',
    '.env.example',
    '_config.yml',
    '_config.fluid.yml',
    'edgeone.json',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'source',
    'scripts',
    'dev/admin'
  ];

  const pendingTargets = readPendingPublishFiles();
  return ['git', 'add', '--ignore-removal', ...trackedTargets, ...pendingTargets];
}

function runDeploySource(job, onSuccess = () => finishJob(job, 0), onFailure = (code) => finishJob(job, code)) {
  const commitMessage = `Publish blog update ${formatDateForCommit(new Date())}`;
  const commands = [
    buildPublishSourceAddCommand(),
    ['git', 'diff', '--cached', '--quiet'],
    ['git', 'commit', '-m', commitMessage],
    ['git', 'push', 'origin', `HEAD:${edgeoneBranch}`]
  ];

  const runNext = (index) => {
    if (index >= commands.length) {
      clearPendingPublishFiles();
      onSuccess();
      return;
    }

    const command = commands[index];
    appendJobOutput(job, `\n> ${command.join(' ')}\n`);
    runCommand(command, job, () => runNext(index + 1), (code) => {
      if (command[0] === 'git' && command[1] === 'diff' && code === 1) {
        runNext(index + 1);
        return;
      }

      if (command[0] === 'git' && command[1] === 'diff' && code === 0) {
        appendJobOutput(job, '\nNo source changes to publish. EdgeOne will not rebuild until GitHub receives a new commit.\n');
        clearPendingPublishFiles();
        onSuccess();
        return;
      }

      if (command[0] === 'git' && command[1] === 'commit' && hasNoCommitChanges(job)) {
        appendJobOutput(job, '\nNo tracked source changes were staged. Skipping source publish for this run.\n');
        clearPendingPublishFiles();
        onSuccess();
        return;
      }

      onFailure(code);
    });
  };

  runNext(0);
}

function createJob(label, command) {
  return {
    id: crypto.randomUUID(),
    label,
    status: 'running',
    command,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    output: ''
  };
}

function runCommand(commandParts, job, onSuccess, onFailure) {
  const isGitCommand = commandParts[0] === 'git';
  const isNpmCommand = commandParts[0] === 'npm';
  const executable = process.platform === 'win32' && commandParts[0] === 'npm'
    ? 'cmd.exe'
    : commandParts[0];
  const args = process.platform === 'win32' && commandParts[0] === 'npm'
    ? ['/d', '/s', '/c', ...commandParts]
    : commandParts.slice(1);
  const childEnv = { ...process.env };

  childEnv.HOME = homeDir;
  childEnv.USERPROFILE = homeDir;

  if (fs.existsSync(sshKeyPath) && fs.existsSync(knownHostsPath)) {
    childEnv.GIT_SSH_COMMAND = [
      'ssh',
      `-i "${sshKeyPath}"`,
      '-o IdentitiesOnly=yes',
      '-o BatchMode=yes',
      `-o UserKnownHostsFile="${knownHostsPath}"`,
      '-o StrictHostKeyChecking=yes'
    ].join(' ');
  }

  if (isGitCommand) {
    childEnv.GIT_CONFIG_COUNT = '4';
    childEnv.GIT_CONFIG_KEY_0 = 'credential.helper';
    childEnv.GIT_CONFIG_VALUE_0 = '';
    childEnv.GIT_CONFIG_KEY_1 = 'credential.helper';
    childEnv.GIT_CONFIG_VALUE_1 = 'store';
    childEnv.GIT_CONFIG_KEY_2 = 'http.sslBackend';
    childEnv.GIT_CONFIG_VALUE_2 = 'openssl';
    childEnv.GIT_CONFIG_KEY_3 = 'http.version';
    childEnv.GIT_CONFIG_VALUE_3 = 'HTTP/1.1';
  }

  if (isNpmCommand) {
    childEnv.npm_config_loglevel = childEnv.npm_config_loglevel || 'warn';
  }

  const child = spawn(executable, args, {
    cwd: rootDir,
    env: childEnv,
    shell: false,
    windowsHide: true
  });
  child.stdout.on('data', (chunk) => appendJobOutput(job, chunk));
  child.stderr.on('data', (chunk) => appendJobOutput(job, chunk));
  child.on('close', (code) => {
    if (code === 0) onSuccess();
    else onFailure(code);
  });

  child.on('error', (error) => {
    appendJobOutput(job, error.message);
    onFailure(-1);
  });
}

function finishJob(job, code) {
  job.status = code === 0 ? 'success' : 'failed';
  job.exitCode = code;
  job.finishedAt = new Date().toISOString();
  jobHistory.push(job);
  if (jobHistory.length > 20) jobHistory.shift();
  activeJob = null;
}

function appendJobOutput(job, chunk) {
  const text = chunk.toString();
  job.output += text;
  if (job.output.length > 50000) {
    job.output = job.output.slice(-50000);
  }
}

function hasNoCommitChanges(job) {
  const output = String(job.output || '');
  return /nothing added to commit/i.test(output)
    || /no changes added to commit/i.test(output)
    || /nothing to commit/i.test(output);
}

function publicJob(job) {
  return {
    id: job.id,
    label: job.label,
    status: job.status,
    command: job.command,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    exitCode: job.exitCode,
    output: job.output
  };
}

function getLibraryCounts() {
  return {
    posts: fs.existsSync(postsDir) ? fs.readdirSync(postsDir).filter((name) => /\.md$/i.test(name)).length : 0,
    pictures: listMediaFiles(pictureDir, 'picture').length,
    music: listMediaFiles(musicDir, 'music').length,
    videos: listMediaFiles(videoDir, 'video').length,
    tasks: readTasks().length
  };
}

function readTasks() {
  try {
    const value = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
    if (!Array.isArray(value)) return [];
    return value
      .map((task) => sanitizeStoredTask(task))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(tasksPath, `${JSON.stringify(sortTasks(tasks), null, 2)}\n`, 'utf8');
}

function sanitizeStoredTask(task) {
  if (!task || typeof task !== 'object') return null;

  const title = String(task.title || '').trim();
  if (!title) return null;

  return {
    id: String(task.id || crypto.randomUUID()),
    title,
    date: normalizeTaskDate(task.date),
    startTime: normalizeTaskTime(task.startTime),
    endTime: normalizeTaskTime(task.endTime),
    repeatMode: normalizeTaskRepeatMode(task.repeatMode),
    repeatDays: normalizeTaskRepeatDays(task.repeatDays),
    repeatUntil: normalizeTaskDate(task.repeatUntil),
    notes: String(task.notes || '').trim(),
    completed: Boolean(task.completed),
    completedAt: normalizeIsoDateTime(task.completedAt),
    createdAt: normalizeIsoDateTime(task.createdAt) || new Date().toISOString(),
    updatedAt: normalizeIsoDateTime(task.updatedAt) || new Date().toISOString()
  };
}

function normalizeTaskInput(input, existingTask = null) {
  const title = String(input.title || '').trim();
  if (!title) throw new Error('Task title is required');

  const date = normalizeTaskDate(input.date);
  const startTime = normalizeTaskTime(input.startTime);
  const endTime = normalizeTaskTime(input.endTime);
  const repeatMode = normalizeTaskRepeatMode(input.repeatMode);
  let repeatDays = normalizeTaskRepeatDays(input.repeatDays);
  const repeatUntil = normalizeTaskDate(input.repeatUntil);

  if (startTime && endTime && timeToMinutes(startTime) > timeToMinutes(endTime)) {
    throw new Error('End time must be later than start time');
  }

  if (repeatMode !== 'none' && !date) {
    throw new Error('Recurring tasks need a start date');
  }

  if (repeatMode === 'weekly' && !repeatDays.length) {
    if (date) {
      repeatDays = [weekdayFromDate(date)];
    } else {
      throw new Error('Weekly tasks need at least one weekday');
    }
  }

  if (repeatMode === 'daily') {
    repeatDays = [];
  }

  if (repeatUntil && date && repeatUntil < date) {
    throw new Error('Repeat end date must be on or after the start date');
  }

  const completed = typeof input.completed === 'boolean'
    ? input.completed
    : existingTask
      ? existingTask.completed
      : false;

  const completedAt = completed
    ? normalizeIsoDateTime(input.completedAt) || (existingTask && existingTask.completed ? existingTask.completedAt : '') || new Date().toISOString()
    : '';

  return {
    id: existingTask ? existingTask.id : String(input.id || crypto.randomUUID()),
    title,
    date,
    startTime,
    endTime,
    repeatMode,
    repeatDays,
    repeatUntil,
    notes: String(input.notes || '').trim(),
    completed,
    completedAt,
    createdAt: existingTask ? existingTask.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeTaskDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid task date: ${text}`);
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function normalizeTaskTime(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid task time: ${text}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid task time: ${text}`);
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeIsoDateTime(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function normalizeTaskRepeatMode(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'none';
  if (text === 'none' || text === 'daily' || text === 'weekly') return text;
  throw new Error(`Invalid task repeat mode: ${text}`);
}

function normalizeTaskRepeatDays(value) {
  if (value == null || value === '') return [];

  const items = Array.isArray(value)
    ? value
    : String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const normalized = Array.from(new Set(items.map(function(item) {
    const day = Number(item);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new Error(`Invalid task weekday: ${item}`);
    }
    return day;
  })));

  normalized.sort(function(a, b) {
    return a - b;
  });
  return normalized;
}

function weekdayFromDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getDay();
}

function timeToMinutes(value) {
  const match = String(value).match(/^(\d{2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function compareTaskDate(left, right) {
  if (left && right) return left.localeCompare(right);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

function compareTaskTime(left, right) {
  if (left && right) return left.localeCompare(right);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

function sortTasks(tasks) {
  return tasks.slice().sort((a, b) => {
    const completedDelta = Number(a.completed) - Number(b.completed);
    if (completedDelta !== 0) return completedDelta;

    const dateDelta = compareTaskDate(a.date, b.date);
    if (dateDelta !== 0) return dateDelta;

    const timeDelta = compareTaskTime(a.startTime, b.startTime);
    if (timeDelta !== 0) return timeDelta;

    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
}

function removeTemp(filePath) {
  if (filePath && fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}

function cleanupFiles(file) {
  if (file && file.path) removeTemp(file.path);
}
