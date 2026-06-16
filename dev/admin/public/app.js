'use strict';

const loginView = document.querySelector('#loginView');
const appView = document.querySelector('#appView');
const loginForm = document.querySelector('#loginForm');
const loginMessage = document.querySelector('#loginMessage');
const logoutButton = document.querySelector('#logoutButton');
const postForm = document.querySelector('#postForm');
const postMessage = document.querySelector('#postMessage');
const mediaForm = document.querySelector('#mediaForm');
const mediaMessage = document.querySelector('#mediaMessage');
const mediaList = document.querySelector('#mediaList');
const refreshMediaButton = document.querySelector('#refreshMediaButton');
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

let statusTimer = null;

init();

async function init() {
  bindTabs();
  bindForms();
  const session = await request('/admin/api/session', { quiet: true });
  if (session && session.authenticated) {
    showApp();
  } else {
    showLogin();
  }
}

function bindTabs() {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach((item) => item.classList.remove('is-active'));
      document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.querySelector(`#${tab.dataset.panel}`).classList.add('is-active');
    });
  });
}

function bindForms() {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(loginMessage, '正在登录...');
    const form = new FormData(loginForm);
    const result = await request('/admin/api/login', {
      method: 'POST',
      body: new URLSearchParams(form)
    });
    if (result && result.ok) {
      loginForm.reset();
      showApp();
    }
  });

  logoutButton.addEventListener('click', async () => {
    await request('/admin/api/logout', { method: 'POST' });
    stopStatusPolling();
    showLogin();
  });

  postForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(postMessage, '正在保存文章...');
    const form = new FormData(postForm);
    const postMusicInput = document.querySelector('#postMusicFile');
    const postMusicFile = postMusicInput.files[0];

    form.delete('postMusicFile');

    if (postMusicFile) {
      setMessage(postMessage, '正在上传文章音乐...');
      const musicForm = new FormData();
      musicForm.set('kind', 'music');
      musicForm.set('addToPlaylist', document.querySelector('#addPostMusicToPlaylist').checked ? 'true' : 'false');
      musicForm.append('files', postMusicFile);

      const musicResult = await request('/admin/api/media', {
        method: 'POST',
        body: musicForm
      });
      if (!musicResult || !musicResult.files.length) return;

      form.set('postMusicPath', musicResult.files[0].url);
      form.set('postMusicName', musicResult.files[0].name);
    }

    form.set('publishNow', document.querySelector('#publishNow').checked ? 'true' : 'false');
    const result = await request('/admin/api/posts', {
      method: 'POST',
      body: form
    });

    if (!result) return;
    postForm.reset();
    document.querySelector('#postMusicPath').value = '';
    document.querySelector('#postMusicName').value = '';
    document.querySelector('#selectedPostMusic').textContent = '未选择文章音乐';
    setMessage(postMessage, result.music
      ? `已保存：${result.post.path}，并添加音乐`
      : `已保存：${result.post.path}`, 'success');
    refreshMedia();
    refreshStatus();
  });

  mediaForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(mediaMessage, '正在上传媒体...');
    const form = new FormData(mediaForm);
    form.set('addToPlaylist', document.querySelector('#addToPlaylist').checked ? 'true' : 'false');
    const result = await request('/admin/api/media', {
      method: 'POST',
      body: form
    });

    if (!result) return;
    mediaForm.reset();
    document.querySelector('input[name="kind"][value="picture"]').checked = true;
    setMessage(mediaMessage, `已上传 ${result.files.length} 个文件`, 'success');
    refreshMedia();
    refreshStatus();
  });

  refreshMediaButton.addEventListener('click', refreshMedia);
  buildButton.addEventListener('click', () => startJob('/admin/api/build'));
  deployButton.addEventListener('click', () => startJob('/admin/api/deploy'));
  buildDeployButton.addEventListener('click', () => startJob('/admin/api/build-deploy'));
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
  refreshMedia();
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
  const job = status.activeJob || status.history[status.history.length - 1];
  renderJob(job);
}

async function refreshMedia() {
  const media = await request('/admin/api/media', { quiet: true });
  if (!media) return;
  const playlist = new Set(media.playlist || []);
  const groups = [
    ['图片', media.pictures, 'picture'],
    ['音乐', media.music, 'music'],
    ['视频', media.videos, 'video']
  ];

  mediaList.innerHTML = groups.map(([title, files, kind]) => `
    <section class="media-group">
      <h3>${escapeHtml(title)}</h3>
      ${files.length ? files.map((file) => mediaItem(file, kind, playlist)).join('') : '<p class="form-message">暂无文件</p>'}
    </section>
  `).join('');

  mediaList.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = '已复制';
      window.setTimeout(() => {
        button.textContent = '复制代码';
      }, 1200);
    });
  });

  mediaList.querySelectorAll('[data-cover]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector('#coverPath').value = button.dataset.cover;
      document.querySelector('[data-panel="postPanel"]').click();
    });
  });

  mediaList.querySelectorAll('[data-playlist]').forEach((button) => {
    button.addEventListener('click', async () => {
      const result = await request('/admin/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: button.dataset.name,
          action: button.dataset.playlist
        })
      });
      if (result) refreshMedia();
    });
  });

  mediaList.querySelectorAll('[data-article-music]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector('#postMusicPath').value = button.dataset.url;
      document.querySelector('#postMusicName').value = button.dataset.name;
      document.querySelector('#selectedPostMusic').textContent = `已选择文章音乐：${button.dataset.name}`;
      document.querySelector('[data-panel="postPanel"]').click();
    });
  });
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
    ? `<button type="button" data-article-music data-url="${escapeAttr(file.url)}" data-name="${escapeAttr(file.name)}">加到文章</button>`
    : '';

  return `
    <article class="media-item">
      <div>
        <div class="media-name">${escapeHtml(file.name)}</div>
        <div class="media-meta">${escapeHtml(file.url)} · ${formatSize(file.size)}</div>
      </div>
      <div class="media-actions">
        ${coverButton}
        ${playlistButton}
        ${articleMusicButton}
        <button type="button" data-copy="${escapeAttr(file.markdown)}">复制代码</button>
      </div>
    </article>
  `;
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
  jobStatus.textContent = job.status;
  jobStatus.className = `status-pill ${job.status}`;
  jobOutput.textContent = job.output || '';
  jobOutput.scrollTop = jobOutput.scrollHeight;
}

async function request(url, options = {}) {
  try {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 && url !== '/admin/api/login') {
        showLogin();
      }
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
  const target = activePanel && activePanel.id === 'mediaPanel'
    ? mediaMessage
    : activePanel && activePanel.id === 'postPanel'
      ? postMessage
      : loginView.hidden ? null : loginMessage;

  if (target) setMessage(target, message, 'error');
  else window.alert(message);
}

function setMessage(element, message, type = '') {
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
