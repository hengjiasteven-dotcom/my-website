'use strict';

const loginView = document.querySelector('#loginView');
const appView = document.querySelector('#appView');
const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#loginMessage');
const logoutButton = document.querySelector('#logoutButton');
const workspaceTitle = document.querySelector('#workspaceTitle');
const workspaceIntro = document.querySelector('#workspaceIntro');

const postForm = document.querySelector('#postForm');
const postMessage = document.querySelector('#postMessage');
const markdownFile = document.querySelector('#markdownFile');
const postTitleInput = document.querySelector('#postTitle');
const categoriesInput = document.querySelector('#categories');
const tagsInput = document.querySelector('#tags');
const coverPathInput = document.querySelector('#coverPath');
const selectedCoverPath = document.querySelector('#selectedCoverPath');
const postMusicFileInput = document.querySelector('#postMusicFile');
const postMusicPathInput = document.querySelector('#postMusicPath');
const postMusicNameInput = document.querySelector('#postMusicName');
const selectedPostMusic = document.querySelector('#selectedPostMusic');
const clearPostSelectionsButton = document.querySelector('#clearPostSelections');
const publishNowInput = document.querySelector('#publishNow');
const addPostMusicToPlaylistInput = document.querySelector('#addPostMusicToPlaylist');

const mediaForm = document.querySelector('#mediaForm');
const mediaMessage = document.querySelector('#mediaMessage');
const mediaList = document.querySelector('#mediaList');
const refreshMediaButton = document.querySelector('#refreshMediaButton');
const syncPlaylistButton = document.querySelector('#syncPlaylistButton');
const mediaSearchInput = document.querySelector('#mediaSearch');
const mediaFilesInput = document.querySelector('#mediaFiles');
const mediaFileHint = document.querySelector('#mediaFileHint');
const addToPlaylistRow = document.querySelector('#addToPlaylistRow');
const addToPlaylistInput = document.querySelector('#addToPlaylist');
const mediaKindInputs = Array.from(document.querySelectorAll('input[name="kind"]'));

const taskForm = document.querySelector('#taskForm');
const taskBatchForm = document.querySelector('#taskBatchForm');
const taskEditId = document.querySelector('#taskEditId');
const taskTitle = document.querySelector('#taskTitle');
const taskDate = document.querySelector('#taskDate');
const taskStartTime = document.querySelector('#taskStartTime');
const taskEndTime = document.querySelector('#taskEndTime');
const taskRepeatMode = document.querySelector('#taskRepeatMode');
const taskRepeatUntil = document.querySelector('#taskRepeatUntil');
const taskRepeatDaysField = document.querySelector('#taskRepeatDaysField');
const taskRepeatUntilField = document.querySelector('#taskRepeatUntilField');
const taskRepeatDayInputs = Array.from(document.querySelectorAll('input[name="taskRepeatDays"]'));
const taskNotes = document.querySelector('#taskNotes');
const taskCompleted = document.querySelector('#taskCompleted');
const taskSubmitButton = document.querySelector('#taskSubmitButton');
const taskCancelButton = document.querySelector('#taskCancelButton');
const taskMessage = document.querySelector('#taskMessage');
const taskBatchDate = document.querySelector('#taskBatchDate');
const taskBatchText = document.querySelector('#taskBatchText');
const taskBatchMessage = document.querySelector('#taskBatchMessage');
const refreshTasksButton = document.querySelector('#refreshTasksButton');
const taskList = document.querySelector('#taskList');

const buildButton = document.querySelector('#buildButton');
const deployButton = document.querySelector('#deployButton');
const buildDeployButton = document.querySelector('#buildDeployButton');
const jobTitle = document.querySelector('#jobTitle');
const jobMeta = document.querySelector('#jobMeta');
const jobStatus = document.querySelector('#jobStatus');
const jobOutput = document.querySelector('#jobOutput');

const postCount = document.querySelector('#postCount');
const pictureCount = document.querySelector('#pictureCount');
const musicCount = document.querySelector('#musicCount');
const taskCount = document.querySelector('#taskCount');

const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const mediaKindMeta = {
  picture: {
    label: '图片',
    accept: 'image/*,.jpg,.jpeg,.png,.webp,.gif,.avif',
    hint: '当前为图片模式，可一次上传多张。'
  },
  music: {
    label: '音乐',
    accept: 'audio/*,.mp3,.ogg,.wav,.m4a,.flac',
    hint: '当前为音乐模式，可上传后直接加入全站播放器。'
  },
  video: {
    label: '视频',
    accept: 'video/*,.mp4,.webm,.mov,.m4v,.ogv',
    hint: '当前为视频模式，适合上传文章配套片段。'
  }
};

let statusTimer = null;
let tasksState = [];
let mediaState = null;

init();

async function init() {
  bindTabs();
  bindForms();
  syncRepeatFields();
  syncMediaKindState();
  renderSelectedCover();
  renderSelectedPostMusic();

  const session = await request('/admin/api/session', { quiet: true });
  if (session && session.authenticated) showApp();
  else showLogin();
}

function bindTabs() {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => activatePanel(tab.dataset.panel));
  });
}

function bindForms() {
  taskRepeatMode.addEventListener('change', syncRepeatFields);

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(loginMessage, '正在登录...');
    const result = await request('/admin/api/login', {
      method: 'POST',
      body: new URLSearchParams(new FormData(loginForm))
    });
    if (!result || !result.ok) return;
    loginForm.reset();
    showApp();
  });

  logoutButton.addEventListener('click', async () => {
    await request('/admin/api/logout', { method: 'POST' });
    stopStatusPolling();
    showLogin();
  });

  markdownFile.addEventListener('change', handleMarkdownSelection);
  coverPathInput.addEventListener('input', renderSelectedCover);
  postMusicFileInput.addEventListener('change', renderSelectedPostMusicFromUpload);
  clearPostSelectionsButton.addEventListener('click', clearPostSelections);

  postForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!markdownFile.files[0]) {
      setMessage(postMessage, '请先选择 Markdown 文件。', 'error');
      markdownFile.focus();
      return;
    }

    setMessage(postMessage, '正在保存文章...');
    const form = new FormData(postForm);
    const postMusicFile = postMusicFileInput.files[0];
    form.delete('postMusicFile');

    if (postMusicFile) {
      setMessage(postMessage, '正在上传文章音乐...');
      const musicForm = new FormData();
      musicForm.set('kind', 'music');
      musicForm.set('addToPlaylist', addPostMusicToPlaylistInput.checked ? 'true' : 'false');
      musicForm.append('files', postMusicFile);
      const musicResult = await request('/admin/api/media', { method: 'POST', body: musicForm });
      if (!musicResult || !musicResult.files.length) return;
      form.set('postMusicPath', musicResult.files[0].url);
      form.set('postMusicName', musicResult.files[0].name);
      postMusicPathInput.value = musicResult.files[0].url;
      postMusicNameInput.value = musicResult.files[0].name;
    }

    form.set('publishNow', publishNowInput.checked ? 'true' : 'false');
    const result = await request('/admin/api/posts', { method: 'POST', body: form });
    if (!result) return;

    resetPostForm();
    const suffix = result.job ? '，并已开始构建/部署流程' : '';
    setMessage(postMessage, `已保存：${result.post.path}${suffix}`, 'success');
    await refreshMedia();
    await refreshStatus();
  });

  mediaKindInputs.forEach((input) => {
    input.addEventListener('change', () => {
      syncMediaKindState();
      renderMedia();
    });
  });

  mediaSearchInput.addEventListener('input', renderMedia);

  mediaForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!mediaFilesInput.files.length) {
      setMessage(mediaMessage, '请先选择要上传的文件。', 'error');
      mediaFilesInput.focus();
      return;
    }

    setMessage(mediaMessage, '正在上传媒体...');
    const form = new FormData(mediaForm);
    form.set('addToPlaylist', addToPlaylistInput.checked ? 'true' : 'false');
    const result = await request('/admin/api/media', { method: 'POST', body: form });
    if (!result) return;

    mediaForm.reset();
    document.querySelector('input[name="kind"][value="picture"]').checked = true;
    syncMediaKindState();
    const fileNames = result.files.map((file) => file.name).slice(0, 3).join('、');
    const tail = result.files.length > 3 ? `${fileNames} 等 ${result.files.length} 个文件` : fileNames;
    setMessage(mediaMessage, `上传完成：${tail}`, 'success');
    await refreshMedia();
    await refreshStatus();
    activatePanel('mediaPanel');
  });

  refreshMediaButton.addEventListener('click', refreshMedia);
  syncPlaylistButton.addEventListener('click', async () => {
    setMessage(mediaMessage, '正在同步 music 文件夹到播放器...');
    const result = await request('/admin/api/playlist/sync', { method: 'POST' });
    if (!result) return;
    setMessage(mediaMessage, `已同步 ${result.added} 首音乐，当前播放器共 ${result.total} 首。`, 'success');
    await refreshMedia();
  });

  taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(taskMessage, taskEditId.value ? '正在更新任务...' : '正在保存任务...');

    const payload = {
      title: taskTitle.value.trim(),
      date: taskDate.value,
      startTime: taskStartTime.value,
      endTime: taskEndTime.value,
      repeatMode: taskRepeatMode.value,
      repeatUntil: taskRepeatUntil.value,
      repeatDays: selectedRepeatDays(),
      notes: taskNotes.value.trim(),
      completed: taskCompleted.checked
    };

    if (!payload.title) {
      setMessage(taskMessage, '请先填写任务内容。', 'error');
      taskTitle.focus();
      return;
    }

    const isEditing = Boolean(taskEditId.value);
    const result = await request(
      isEditing ? `/admin/api/tasks/${encodeURIComponent(taskEditId.value)}` : '/admin/api/tasks',
      {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    if (!result) return;

    resetTaskForm();
    tasksState = result.tasks || [];
    renderTasks();
    await refreshStatus();
    setMessage(taskMessage, isEditing ? '任务已更新。' : '任务已添加。', 'success');
  });

  taskCancelButton.addEventListener('click', () => {
    resetTaskForm();
    setMessage(taskMessage, '已取消编辑。');
  });

  taskBatchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(taskBatchMessage, '正在批量添加任务...');

    let tasks;
    try {
      tasks = parseBatchTasks(taskBatchText.value, taskBatchDate.value);
    } catch (error) {
      setMessage(taskBatchMessage, error.message, 'error');
      return;
    }

    if (!tasks.length) {
      setMessage(taskBatchMessage, '请先输入要导入的任务。', 'error');
      return;
    }

    const result = await request('/admin/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });
    if (!result) return;

    taskBatchForm.reset();
    tasksState = result.tasks || [];
    renderTasks();
    await refreshStatus();
    setMessage(taskBatchMessage, `已批量添加 ${tasks.length} 个任务。`, 'success');
  });

  refreshTasksButton.addEventListener('click', refreshTasks);
  buildButton.addEventListener('click', () => startJob('/admin/api/build'));
  deployButton.addEventListener('click', () => startJob('/admin/api/deploy'));
  buildDeployButton.addEventListener('click', () => startJob('/admin/api/build-deploy'));
}

function activatePanel(panelId) {
  document.querySelectorAll('.nav-tab').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.panel === panelId);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === panelId);
  });

  const panel = document.querySelector(`#${panelId}`);
  if (!panel) return;
  workspaceTitle.textContent = panel.dataset.title || '博客发布台';
  workspaceIntro.textContent = panel.dataset.description || '';
}

function showLogin() {
  appView.hidden = true;
  loginView.hidden = false;
  setMessage(loginMessage, '');
  window.setTimeout(() => document.querySelector('#password').focus(), 20);
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  activatePanel(document.querySelector('.nav-tab.is-active')?.dataset.panel || 'postPanel');
  refreshMedia();
  refreshTasks();
  refreshStatus();
  startStatusPolling();
}

function startStatusPolling() {
  stopStatusPolling();
  statusTimer = window.setInterval(refreshStatus, 2500);
}

function stopStatusPolling() {
  if (statusTimer) window.clearInterval(statusTimer);
  statusTimer = null;
}

async function refreshStatus() {
  const status = await request('/admin/api/status', { quiet: true });
  if (!status) return;
  postCount.textContent = status.counts.posts;
  pictureCount.textContent = status.counts.pictures;
  musicCount.textContent = status.counts.music;
  taskCount.textContent = status.counts.tasks;
  renderJob(status.activeJob || status.history[status.history.length - 1]);
}

async function refreshMedia() {
  const media = await request('/admin/api/media', { quiet: true });
  if (!media) return;
  mediaState = media;
  renderMedia();
}

function renderMedia() {
  if (!mediaState) return;

  const search = String(mediaSearchInput.value || '').trim().toLowerCase();
  const activeKind = selectedMediaKind();
  const playlist = new Set(mediaState.playlist || []);
  const groups = [
    ['图片', mediaState.pictures || [], 'picture'],
    ['音乐', mediaState.music || [], 'music'],
    ['视频', mediaState.videos || [], 'video']
  ].filter(([, , kind]) => kind === activeKind);

  mediaList.innerHTML = groups.map(([title, files, kind]) => {
    const filtered = files.filter((file) => {
      if (!search) return true;
      return file.name.toLowerCase().includes(search) || file.url.toLowerCase().includes(search);
    });

    return `
      <section class="media-group">
        <div class="media-group-head">
          <h3>${escapeHtml(title)}</h3>
          <span>${filtered.length} / ${files.length}</span>
        </div>
        ${
          filtered.length
            ? filtered.map((file) => mediaItem(file, kind, playlist)).join('')
            : '<p class="form-message media-empty">当前筛选下没有文件。</p>'
        }
      </section>
    `;
  }).join('');

  mediaList.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const ok = await copyText(button.dataset.copy);
      if (ok) flashButton(button, '已复制');
    });
  });

  mediaList.querySelectorAll('[data-copy-url]').forEach((button) => {
    button.addEventListener('click', async () => {
      const ok = await copyText(button.dataset.copyUrl);
      if (ok) flashButton(button, '已复制');
    });
  });

  mediaList.querySelectorAll('[data-cover]').forEach((button) => {
    button.addEventListener('click', () => {
      coverPathInput.value = button.dataset.cover;
      renderSelectedCover();
      activatePanel('postPanel');
      setMessage(postMessage, '已把图片带回文章表单，可直接保存。', 'success');
    });
  });

  mediaList.querySelectorAll('[data-playlist]').forEach((button) => {
    button.addEventListener('click', async () => {
      const result = await request('/admin/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: button.dataset.name, action: button.dataset.playlist })
      });
      if (result) refreshMedia();
    });
  });

  mediaList.querySelectorAll('[data-article-music]').forEach((button) => {
    button.addEventListener('click', () => {
      postMusicPathInput.value = button.dataset.url;
      postMusicNameInput.value = button.dataset.name;
      postMusicFileInput.value = '';
      renderSelectedPostMusic();
      activatePanel('postPanel');
      setMessage(postMessage, '已选中现有音乐，可直接保存进文章。', 'success');
    });
  });
}

async function refreshTasks() {
  const result = await request('/admin/api/tasks', { quiet: true });
  if (!result) return;
  tasksState = result.tasks || [];
  renderTasks();
}

function renderTasks() {
  if (!tasksState.length) {
    taskList.innerHTML = '<p class="form-message">还没有任务，先添加一条试试。</p>';
    return;
  }

  taskList.innerHTML = tasksState.map((task) => taskItem(task)).join('');

  taskList.querySelectorAll('[data-task-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      const task = tasksState.find((item) => item.id === button.dataset.taskEdit);
      if (task) populateTaskForm(task);
    });
  });

  taskList.querySelectorAll('[data-task-toggle]').forEach((button) => {
    button.addEventListener('click', async () => {
      const task = tasksState.find((item) => item.id === button.dataset.taskToggle);
      if (!task) return;
      const result = await request(`/admin/api/tasks/${encodeURIComponent(task.id)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      });
      if (!result) return;
      tasksState = result.tasks || [];
      renderTasks();
      refreshStatus();
    });
  });

  taskList.querySelectorAll('[data-task-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      const task = tasksState.find((item) => item.id === button.dataset.taskDelete);
      if (!task) return;
      if (!window.confirm(`删除任务“${task.title}”？`)) return;
      const result = await request(`/admin/api/tasks/${encodeURIComponent(task.id)}`, { method: 'DELETE' });
      if (!result) return;
      if (taskEditId.value === task.id) resetTaskForm();
      tasksState = result.tasks || [];
      renderTasks();
      refreshStatus();
    });
  });
}

function populateTaskForm(task) {
  taskEditId.value = task.id;
  taskTitle.value = task.title || '';
  taskDate.value = task.date || '';
  taskStartTime.value = task.startTime || '';
  taskEndTime.value = task.endTime || '';
  taskRepeatMode.value = task.repeatMode || 'none';
  taskRepeatUntil.value = task.repeatUntil || '';
  taskRepeatDayInputs.forEach((input) => {
    input.checked = Array.isArray(task.repeatDays) && task.repeatDays.includes(Number(input.value));
  });
  syncRepeatFields();
  taskNotes.value = task.notes || '';
  taskCompleted.checked = Boolean(task.completed);
  taskSubmitButton.textContent = '更新任务';
  taskCancelButton.hidden = false;
  setMessage(taskMessage, `正在编辑：${task.title}`);
  taskTitle.focus();
  activatePanel('taskPanel');
}

function resetTaskForm() {
  taskForm.reset();
  taskEditId.value = '';
  taskRepeatMode.value = 'none';
  taskRepeatUntil.value = '';
  taskRepeatDayInputs.forEach((input) => {
    input.checked = false;
  });
  syncRepeatFields();
  taskSubmitButton.textContent = '保存任务';
  taskCancelButton.hidden = true;
}

function syncRepeatFields() {
  const mode = taskRepeatMode.value || 'none';
  taskRepeatDaysField.hidden = mode !== 'weekly';
  taskRepeatUntilField.hidden = mode === 'none';
  if (mode !== 'weekly') {
    taskRepeatDayInputs.forEach((input) => {
      input.checked = false;
    });
  }
  if (mode === 'none') {
    taskRepeatUntil.value = '';
  }
}

function selectedRepeatDays() {
  return taskRepeatDayInputs
    .filter((input) => input.checked)
    .map((input) => Number(input.value))
    .sort((a, b) => a - b);
}

async function handleMarkdownSelection() {
  const file = markdownFile.files[0];
  if (!file) return;

  try {
    const content = await file.text();
    const defaults = extractMarkdownDefaults(content, file.name);
    applyMarkdownDefaults(defaults);
    setMessage(postMessage, '已按 Markdown 内容回填标题、标签、封面和音乐。', 'success');
  } catch (error) {
    setMessage(postMessage, `读取 Markdown 失败：${error.message}`, 'error');
  }
}

function syncMediaKindState() {
  const kind = selectedMediaKind();
  const meta = mediaKindMeta[kind];
  mediaFilesInput.accept = meta.accept;
  mediaFileHint.textContent = meta.hint;
  addToPlaylistRow.hidden = kind !== 'music';
  if (kind !== 'music') addToPlaylistInput.checked = false;
  mediaSearchInput.placeholder = `搜索${meta.label}文件名`;
}

function selectedMediaKind() {
  return mediaKindInputs.find((input) => input.checked)?.value || 'picture';
}

function applyMarkdownDefaults(defaults) {
  postTitleInput.value = defaults.title;
  categoriesInput.value = defaults.categories.join(', ');
  tagsInput.value = defaults.tags.join(', ');
  coverPathInput.value = defaults.coverPath;
  postMusicPathInput.value = defaults.musicPath;
  postMusicNameInput.value = defaults.musicName;
  postMusicFileInput.value = '';
  addPostMusicToPlaylistInput.checked = false;
  renderSelectedCover();
  renderSelectedPostMusic();
}

function renderSelectedCover() {
  const value = coverPathInput.value.trim();
  selectedCoverPath.textContent = value ? `封面：${value}` : '封面：未选择';
}

function renderSelectedPostMusic() {
  const value = postMusicNameInput.value.trim();
  const pathValue = postMusicPathInput.value.trim();
  selectedPostMusic.textContent = value || pathValue ? `文章音乐：${value || pathValue}` : '文章音乐：未选择';
}

function renderSelectedPostMusicFromUpload() {
  const file = postMusicFileInput.files[0];
  if (!file) {
    renderSelectedPostMusic();
    return;
  }
  postMusicPathInput.value = '';
  postMusicNameInput.value = file.name;
  selectedPostMusic.textContent = `文章音乐：待上传 ${file.name}`;
}

function clearPostSelections() {
  coverPathInput.value = '';
  postMusicFileInput.value = '';
  postMusicPathInput.value = '';
  postMusicNameInput.value = '';
  addPostMusicToPlaylistInput.checked = false;
  renderSelectedCover();
  renderSelectedPostMusic();
  setMessage(postMessage, '已清空封面和文章音乐。');
}

function resetPostForm() {
  postForm.reset();
  postMusicPathInput.value = '';
  postMusicNameInput.value = '';
  renderSelectedCover();
  renderSelectedPostMusic();
  syncMediaKindState();
}

function extractMarkdownDefaults(content, fileName = '') {
  const source = String(content || '').replace(/^\uFEFF/, '');
  const frontMatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const frontMatter = frontMatterMatch ? parseFrontMatter(frontMatterMatch[1]) : {};
  const body = frontMatterMatch ? source.slice(frontMatterMatch[0].length) : source;
  const fallbackTitle = String(fileName || '').replace(/\.[^.]+$/, '');

  const title = cleanValue(firstNonEmpty([
    frontMatter.title,
    frontMatter.Title,
    fallbackTitle
  ]));

  const categories = normalizeFrontMatterList(frontMatter.categories || frontMatter.category);
  const tags = normalizeFrontMatterList(frontMatter.tags || frontMatter.tag);
  const coverPath = normalizeAssetPath(firstNonEmpty([
    frontMatter.index_img,
    frontMatter.banner_img,
    frontMatter.cover,
    frontMatter.image
  ]) || findFirstImageInContent(body), 'picture');
  const musicPath = normalizeAssetPath(firstNonEmpty([
    frontMatter.music,
    frontMatter.audio,
    frontMatter.song
  ]) || findFirstAudioInContent(body), 'music');

  return {
    title,
    categories,
    tags,
    coverPath,
    musicPath,
    musicName: musicPath ? fileNameFromPath(musicPath) : ''
  };
}

function parseFrontMatter(input) {
  const lines = String(input || '').split(/\r?\n/);
  const result = {};
  let currentKey = '';

  lines.forEach((line) => {
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = [];
      result[currentKey].push(cleanValue(listMatch[1]));
      return;
    }

    const keyMatch = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!keyMatch) return;

    currentKey = keyMatch[1];
    const rawValue = keyMatch[2].trim();
    if (!rawValue) {
      result[currentKey] = [];
      return;
    }

    result[currentKey] = parseFrontMatterValue(rawValue);
  });

  return result;
}

function parseFrontMatterValue(rawValue) {
  const value = cleanValue(rawValue);
  if (/^\[.*\]$/.test(value)) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => cleanValue(item))
      .filter(Boolean);
  }
  return value;
}

function normalizeFrontMatterList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanValue(item)).filter(Boolean);
  }
  if (!value) return [];
  return String(value)
    .split(/[\n,，]/)
    .map((item) => cleanValue(item))
    .filter(Boolean);
}

function firstNonEmpty(values) {
  for (const value of values) {
    const next = cleanValue(value);
    if (next) return next;
  }
  return '';
}

function cleanValue(value) {
  return String(value || '').replace(/^['"]|['"]$/g, '').trim();
}

function findFirstAudioInContent(content) {
  const audioTagMatch = String(content || '').match(/<audio[^>]+src=["']([^"']+)["']/i);
  if (audioTagMatch) return audioTagMatch[1];
  return '';
}

function findFirstImageInContent(content) {
  const imageMatch = String(content || '').match(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/i);
  return imageMatch ? imageMatch[1] : '';
}

function normalizeAssetPath(value, kind) {
  const raw = cleanValue(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/assets/')) return raw;
  const normalized = raw.replace(/\\/g, '/');
  const marker = `/${kind}/`;
  const index = normalized.toLowerCase().lastIndexOf(marker);
  if (index >= 0) {
    return `/assets/${kind}/${normalized.slice(index + marker.length)}`;
  }
  return raw;
}

function fileNameFromPath(value) {
  const normalized = String(value || '').split(/[\\/]/).pop() || '';
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

function taskItem(task) {
  const meta = [task.date, formatTaskTime(task)].filter(Boolean).join(' · ');
  const repeat = formatRepeatSummary(task);
  const notes = task.notes ? `<p class="task-notes">${escapeHtml(task.notes)}</p>` : '';

  return `
    <article class="task-item ${task.completed ? 'is-complete' : ''}">
      <div class="task-main">
        <div class="task-head">
          <strong>${escapeHtml(task.title)}</strong>
          <span class="task-state">${task.completed ? '已完成' : '进行中'}</span>
        </div>
        ${meta ? `<div class="task-meta">${escapeHtml(meta)}</div>` : '<div class="task-meta">未设置时间</div>'}
        ${repeat ? `<div class="task-repeat">${escapeHtml(repeat)}</div>` : ''}
        ${notes}
      </div>
      <div class="task-actions">
        <button type="button" data-task-toggle="${escapeAttr(task.id)}">${task.completed ? '撤销完成' : '标记完成'}</button>
        <button type="button" data-task-edit="${escapeAttr(task.id)}">编辑</button>
        <button type="button" data-task-delete="${escapeAttr(task.id)}">删除</button>
      </div>
    </article>
  `;
}

function formatRepeatSummary(task) {
  if (task.repeatMode === 'daily') {
    return task.repeatUntil ? `每天重复，直到 ${task.repeatUntil}` : '每天重复';
  }
  if (task.repeatMode === 'weekly') {
    const days = (Array.isArray(task.repeatDays) ? task.repeatDays : []).map((day) => weekdayLabels[day]).filter(Boolean);
    const label = days.length ? `每周 ${days.join('、')}` : '每周重复';
    return task.repeatUntil ? `${label}，直到 ${task.repeatUntil}` : label;
  }
  return '';
}

function mediaItem(file, kind, playlist) {
  const isTrack = kind === 'music';
  const inPlaylist = playlist.has(file.name);
  const coverButton = kind === 'picture'
    ? `<button type="button" data-cover="${escapeAttr(file.url)}">设为封面</button>`
    : '';
  const playlistButton = isTrack
    ? `<button type="button" data-playlist="${inPlaylist ? 'remove' : 'add'}" data-name="${escapeAttr(file.name)}">${inPlaylist ? '移出播放器' : '加入播放器'}</button>`
    : '';
  const articleMusicButton = isTrack
    ? `<button type="button" data-article-music data-url="${escapeAttr(file.url)}" data-name="${escapeAttr(file.name)}">设为文章音乐</button>`
    : '';

  return `
    <article class="media-item">
      <div class="media-main">
        <div class="media-name">${escapeHtml(file.name)}</div>
        <div class="media-meta">${escapeHtml(file.url)} · ${formatSize(file.size)} · ${localTime(file.modifiedAt)}</div>
      </div>
      <div class="media-actions">
        ${coverButton}
        ${playlistButton}
        ${articleMusicButton}
        <button type="button" data-copy-url="${escapeAttr(file.url)}">复制链接</button>
        <button type="button" data-copy="${escapeAttr(file.markdown)}">复制引用</button>
      </div>
    </article>
  `;
}

function parseBatchTasks(input, defaultDate) {
  const lines = String(input || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];

  return lines.map((line) => {
    let value = line;
    let completed = false;
    let date = defaultDate || '';
    let startTime = '';
    let endTime = '';

    const checkedMatch = value.match(/^\[(x|X)\]\s*/);
    if (checkedMatch) {
      completed = true;
      value = value.slice(checkedMatch[0].length).trim();
    }

    const dateMatch = value.match(/^(\d{4}-\d{2}-\d{2})\s+/);
    if (dateMatch) {
      date = dateMatch[1];
      value = value.slice(dateMatch[0].length).trim();
    }

    const rangeMatch = value.match(/^(\d{1,2}:\d{2})\s*(?:-|~|到|至)\s*(\d{1,2}:\d{2})\s+/);
    if (rangeMatch) {
      startTime = normalizeTime(rangeMatch[1]);
      endTime = normalizeTime(rangeMatch[2]);
      value = value.slice(rangeMatch[0].length).trim();
    } else {
      const startMatch = value.match(/^(\d{1,2}:\d{2})\s+/);
      if (startMatch) {
        startTime = normalizeTime(startMatch[1]);
        value = value.slice(startMatch[0].length).trim();
      }
    }

    if (!value) throw new Error(`这行任务缺少标题：${line}`);

    return {
      title: value,
      date,
      startTime,
      endTime,
      repeatMode: 'none',
      repeatUntil: '',
      repeatDays: [],
      notes: '',
      completed
    };
  });
}

function normalizeTime(value) {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`时间格式不正确：${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`时间格式不正确：${value}`);
  }
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

function formatTaskTime(task) {
  if (task.startTime && task.endTime) return `${task.startTime}-${task.endTime}`;
  return task.startTime || task.endTime || '';
}

async function startJob(url) {
  setButtonsDisabled(true);
  const result = await request(url, { method: 'POST' });
  if (result && result.job) renderJob(result.job);
  setButtonsDisabled(false);
}

function renderJob(job) {
  if (!job) {
    jobTitle.textContent = '暂无任务';
    jobMeta.textContent = '构建和部署日志会显示在这里。';
    jobStatus.textContent = 'idle';
    jobStatus.className = 'status-pill';
    jobOutput.textContent = '';
    return;
  }

  jobTitle.textContent = job.label;
  jobMeta.textContent = `${job.command} · ${formatJobTime(job)}`;
  jobStatus.textContent = humanJobStatus(job.status);
  jobStatus.className = `status-pill ${job.status}`;
  jobOutput.textContent = job.output || '';
  jobOutput.scrollTop = jobOutput.scrollHeight;
}

function humanJobStatus(status) {
  if (status === 'running') return '进行中';
  if (status === 'success') return '成功';
  if (status === 'failed') return '失败';
  return status || 'idle';
}

async function request(url, options = {}) {
  try {
    const response = await fetch(url, { credentials: 'same-origin', ...options });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 && url !== '/admin/api/login') showLogin();
      if (!options.quiet) showError(result.error || '请求失败');
      return null;
    }
    return result;
  } catch (error) {
    if (!options.quiet) showError(error.message);
    return null;
  }
}

function showError(message) {
  const activePanel = document.querySelector('.panel.is-active');
  let target = loginView.hidden ? null : loginMessage;
  if (activePanel && activePanel.id === 'postPanel') target = postMessage;
  if (activePanel && activePanel.id === 'mediaPanel') target = mediaMessage;
  if (activePanel && activePanel.id === 'taskPanel') target = taskMessage;
  if (target) setMessage(target, message, 'error');
  else window.alert(message);
}

function setMessage(element, message, type = '') {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-error', type === 'error');
  element.classList.toggle('is-success', type === 'success');
}

function setButtonsDisabled(disabled) {
  [buildButton, deployButton, buildDeployButton].forEach((button) => {
    button.disabled = disabled;
  });
}

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatJobTime(job) {
  if (job.status === 'running') return `开始于 ${localTime(job.startedAt)}`;
  return `${localTime(job.startedAt)} - ${localTime(job.finishedAt)}`;
}

function localTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-CN');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    showError(`复制失败：${error.message}`);
    return false;
  }
}

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
