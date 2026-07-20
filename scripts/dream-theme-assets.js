'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true, override: true });

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac']);
const REMOTE_PICTURE_LIST_PATH = path.resolve(__dirname, '..', 'source', 'data', 'remote-picture-list.json');
const REMOTE_MUSIC_LIST_PATH = path.resolve(__dirname, '..', 'source', 'data', 'remote-music-list.json');
const REMOTE_VIDEO_LIST_PATH = path.resolve(__dirname, '..', 'source', 'data', 'remote-video-list.json');
const MUSIC_TITLE_MAP_PATH = path.resolve(__dirname, '..', 'source', 'data', 'music-title-map.json');
const BACKGROUND_IMAGE_NAMES = new Set([
  '小王子1.jpg',
  '小王子2.jpg',
  '小王子3.jpg',
  '小王子4.jpg',
  '小王子5.jpg',
  '小王子6.jpg'
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function streamFile(filePath) {
  return fs.createReadStream(filePath);
}

function listFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => exts.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function listFilesRecursive(dir, exts, rootDir = dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listFilesRecursive(fullPath, exts, rootDir);
      }

      if (!entry.isFile() || !exts.has(path.extname(entry.name).toLowerCase())) {
        return [];
      }

      return [path.relative(rootDir, fullPath).split(path.sep).join('/')];
    })
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function pictureTitle(file) {
  return path.basename(String(file || ''), path.extname(String(file || '')))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pictureGroup(file) {
  const relativePath = String(file || '').replace(/\\/g, '/');
  const parts = relativePath.split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

function isAbyssPicture(file) {
  const value = String(file || '').replace(/\\/g, '/').toLowerCase();
  return /(^|\/)(abyss|made[-_\s]*in[-_\s]*abyss)(\/|$)/.test(value) || /[\u6765\u81ea]?\u6df1\u6e0a/i.test(String(file || ''));
}

function rootUrl(root, assetPath) {
  return `${String(root || '/').replace(/\/?$/, '/')}${assetPath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`;
}

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function remoteAssetBase(hexo) {
  return normalizeBaseUrl(process.env.ASSET_CDN_BASE || hexo?.config?.asset_cdn_base);
}

function remoteVideoAssetBase(hexo) {
  return normalizeBaseUrl(process.env.VIDEO_ASSET_CDN_BASE || hexo?.config?.video_asset_cdn_base || remoteAssetBase(hexo));
}

function assetUrl(hexo, assetPath) {
  const base = remoteAssetBase(hexo);
  if (base) {
    return `${base}/${assetPath
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')}`;
  }
  return rootUrl(hexo.config.root, assetPath);
}

function normalizeVideoPublicPath(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const match = normalized.match(/^abyss\/movies\/([^/]+)$/i);
  if (match) {
    return `abyss/${match[1]}`;
  }
  return normalized;
}

function videoAssetUrl(hexo, relativePath) {
  const publicPath = normalizeVideoPublicPath(relativePath);
  const base = remoteVideoAssetBase(hexo);
  if (base) {
    return `${base}/assets/video/${publicPath
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')}`;
  }
  return rootUrl(hexo.config.root, `assets/video/${publicPath}`);
}

function musicUrl(hexo, name) {
  return assetUrl(hexo, `assets/music/${name}`);
}

function shouldCopyMusicAssets(hexo) {
  return !remoteAssetBase(hexo);
}

function musicTitle(file) {
  const mapped = loadMusicTitleMap()[String(file || '')];
  if (mapped) return mapped;

  return path.basename(file, path.extname(file))
    .replace(/\s+-\s+.+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function videoTitle(file) {
  return path.basename(String(file || ''), path.extname(String(file || '')))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function videoGroup(file) {
  const relativePath = String(file || '').replace(/\\/g, '/');
  const parts = relativePath.split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

function isAbyssVideo(file) {
  const value = String(file || '').toLowerCase();
  return /(^|\/)(abyss|made[-_\s]*in[-_\s]*abyss)(\/|$)/.test(value) || /[\u6765\u81ea]?\u6df1\u6e0a/i.test(String(file || ''));
}

let cachedMusicTitleMap = null;

function loadMusicTitleMap() {
  if (cachedMusicTitleMap) return cachedMusicTitleMap;
  if (!fs.existsSync(MUSIC_TITLE_MAP_PATH)) {
    cachedMusicTitleMap = Object.create(null);
    return cachedMusicTitleMap;
  }

  try {
    const payload = JSON.parse(fs.readFileSync(MUSIC_TITLE_MAP_PATH, 'utf8'));
    cachedMusicTitleMap = payload && typeof payload === 'object' ? payload : Object.create(null);
  } catch {
    cachedMusicTitleMap = Object.create(null);
  }

  return cachedMusicTitleMap;
}

function normalizeTrackName(name) {
  return String(name || '').trim().toLowerCase();
}

function uniqueTrackNames(names) {
  const seen = new Set();
  const result = [];

  names.forEach((name) => {
    const normalized = normalizeTrackName(name);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(String(name).trim());
  });

  return result;
}

function loadMusicPlaylist(musicDir, availableTracks, hexo) {
  const playlistPath = path.join(musicDir, 'playlist.json');
  if (!fs.existsSync(playlistPath)) return uniqueTrackNames(availableTracks);

  try {
    const playlist = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    if (!Array.isArray(playlist)) {
      hexo.log.warn('[DreamTheme] music/playlist.json must be an array of filenames. Falling back to all tracks.');
      return uniqueTrackNames(availableTracks);
    }

    const normalizedAvailable = new Map();
    uniqueTrackNames(availableTracks).forEach((name) => {
      normalizedAvailable.set(normalizeTrackName(name), name);
    });
    const selected = [];
    playlist.forEach((name) => {
      if (typeof name !== 'string') return;
      const resolvedName = normalizedAvailable.get(normalizeTrackName(name));
      if (!resolvedName) {
        hexo.log.warn(`[DreamTheme] Playlist track not found in music/: ${name}`);
        return;
      }
      selected.push(resolvedName);
    });
    return uniqueTrackNames(selected);
  } catch (error) {
    hexo.log.warn(`[DreamTheme] Failed to read music/playlist.json: ${error.message}. Falling back to all tracks.`);
    return uniqueTrackNames(availableTracks);
  }
}

function loadRemoteMusicList() {
  if (!fs.existsSync(REMOTE_MUSIC_LIST_PATH)) return [];

  try {
    const payload = JSON.parse(fs.readFileSync(REMOTE_MUSIC_LIST_PATH, 'utf8'));
    return Array.isArray(payload.music) ? uniqueTrackNames(payload.music.filter((name) => typeof name === 'string')) : [];
  } catch {
    return [];
  }
}

function loadRemotePictureList() {
  if (!fs.existsSync(REMOTE_PICTURE_LIST_PATH)) return [];

  try {
    const payload = JSON.parse(fs.readFileSync(REMOTE_PICTURE_LIST_PATH, 'utf8'));
    const rawList = Array.isArray(payload.pictures) ? payload.pictures : [];

    return rawList
      .filter((item) => item && typeof item === 'object' && item.path)
      .map((item) => {
        const relativePath = String(item.path).replace(/\\/g, '/').replace(/^\/+/, '');
        return {
          path: relativePath,
          title: String(item.title || pictureTitle(relativePath)),
          group: String(item.group || pictureGroup(relativePath)),
          isAbyss: typeof item.isAbyss === 'boolean' ? item.isAbyss : isAbyssPicture(relativePath)
        };
      });
  } catch {
    return [];
  }
}

function loadRemoteVideoList() {
  if (!fs.existsSync(REMOTE_VIDEO_LIST_PATH)) return [];

  try {
    const payload = JSON.parse(fs.readFileSync(REMOTE_VIDEO_LIST_PATH, 'utf8'));
    const rawList = Array.isArray(payload.videos) ? payload.videos : [];

    return rawList
      .filter((item) => item && typeof item === 'object' && item.path)
      .map((item) => ({
        path: String(item.path).replace(/\\/g, '/').replace(/^\/+/, ''),
        title: String(item.title || ''),
        group: String(item.group || ''),
        duration: Number(item.duration || 0),
        cover: String(item.cover || ''),
        sourceType: String(item.sourceType || 'qiniu'),
        bilibiliUrl: String(item.bilibiliUrl || ''),
        isAbyss: typeof item.isAbyss === 'boolean' ? item.isAbyss : isAbyssVideo(item.path)
      }));
  } catch {
    return [];
  }
}

function normalizeAssetMusicName(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';

  const normalized = value.replace(/\\/g, '/');
  const marker = '/assets/music/';
  const index = normalized.toLowerCase().lastIndexOf(marker);
  const target = index >= 0 ? normalized.slice(index + marker.length) : normalized;

  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

function collectReferencedMusicFiles(postsDir, availableTracks) {
  if (!fs.existsSync(postsDir)) return [];

  const normalizedAvailable = new Map();
  uniqueTrackNames(availableTracks).forEach((name) => {
    normalizedAvailable.set(normalizeTrackName(name), name);
  });
  const referenced = new Set();
  const postFiles = fs.readdirSync(postsDir).filter((name) => /\.md$/i.test(name));
  const patterns = [
    /<audio[^>]+src=["']([^"']+)["']/gi,
    /new Audio\(\s*["']([^"']+)["']\s*\)/gi
  ];

  postFiles.forEach((fileName) => {
    const content = fs.readFileSync(path.join(postsDir, fileName), 'utf8');
    patterns.forEach((pattern) => {
      let match = pattern.exec(content);
      while (match) {
        const trackName = normalizeAssetMusicName(match[1]);
        const resolvedName = normalizedAvailable.get(normalizeTrackName(trackName));
        if (resolvedName) referenced.add(resolvedName);
        match = pattern.exec(content);
      }
      pattern.lastIndex = 0;
    });
  });

  return Array.from(referenced).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

let cachedManifest = null;
let cachedFiles = null;

function collect(hexo) {
  const baseDir = hexo.base_dir;

  const pictureDir = path.join(baseDir, 'picture');
  const musicDir = path.join(baseDir, 'music');
  const postsDir = path.join(baseDir, 'source', '_posts');

  const rootPictures = listFiles(pictureDir, IMAGE_EXTS);
  const localPictureFiles = listFilesRecursive(pictureDir, IMAGE_EXTS);
  const remotePictures = loadRemotePictureList();
  const pictureEntries = new Map();
  localPictureFiles.forEach((relativePath) => {
    pictureEntries.set(relativePath, {
      path: relativePath,
      title: pictureTitle(relativePath),
      group: pictureGroup(relativePath),
      isAbyss: isAbyssPicture(relativePath),
      local: true
    });
  });
  remotePictures.forEach((item) => {
    if (pictureEntries.has(item.path)) return;
    pictureEntries.set(item.path, {
      path: item.path,
      title: item.title,
      group: item.group,
      isAbyss: item.isAbyss,
      local: false
    });
  });
  const pictureFiles = Array.from(pictureEntries.values());
  const backgroundPictures = rootPictures.filter((name) => BACKGROUND_IMAGE_NAMES.has(name));
  const spotlightPictures = pictureFiles.filter((item) => item.group);
  const localTracks = uniqueTrackNames(listFiles(musicDir, AUDIO_EXTS));
  const remoteTracks = loadRemoteMusicList();
  const tracks = localTracks.length ? localTracks : remoteTracks;
  const playerTracks = localTracks.length ? loadMusicPlaylist(musicDir, tracks, hexo) : tracks;
  const referencedTracks = collectReferencedMusicFiles(postsDir, tracks);
  const copiedTracks = uniqueTrackNames(playerTracks.concat(referencedTracks))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const videos = loadRemoteVideoList();

  const manifest = {
    pictures: backgroundPictures.map((name) => ({
      name,
      url: rootUrl(hexo.config.root, `assets/picture/${name}`)
    })),
    spotlightPictures: spotlightPictures.map((item) => ({
      name: path.basename(item.path),
      path: item.path,
      title: item.title,
      group: item.group,
      isAbyss: item.isAbyss,
      url: assetUrl(hexo, `assets/picture/${item.path}`)
    })),
    music: playerTracks.map((name) => ({
      name,
      title: musicTitle(name),
      url: musicUrl(hexo, name)
    })),
    videos: videos.map((item) => {
      const relativePath = String(item.path || '');
      const publicPath = normalizeVideoPublicPath(relativePath);
      return {
        name: path.basename(publicPath),
        path: publicPath,
        title: item.title || videoTitle(relativePath),
        group: item.group || videoGroup(relativePath),
        isAbyss: typeof item.isAbyss === 'boolean' ? item.isAbyss : isAbyssVideo(relativePath),
        sourceType: 'qiniu',
        bilibiliUrl: '',
        url: videoAssetUrl(hexo, relativePath),
        duration: Number(item.duration || 0),
        cover: item.cover || '',
        stills: []
      };
    })
  };

  const content = `window.DREAM_THEME_ASSETS = ${JSON.stringify(manifest, null, 2)};\n`;

  cachedManifest = content;
  cachedFiles = {
    pictures: localPictureFiles.map((relativePath) => ({
      name: path.basename(relativePath),
      path: relativePath,
      source: path.join(pictureDir, ...relativePath.split('/'))
    })),
    tracks: copiedTracks.filter((name) => fs.existsSync(path.join(musicDir, name))).map((name) => ({
      name,
      source: path.join(musicDir, name)
    })),
    videos: []
  };

  hexo.log.info(`[DreamTheme] Synced ${pictureFiles.length} picture asset(s) (${localPictureFiles.length} local, ${remotePictures.length} remote), ${backgroundPictures.length} background image(s), ${spotlightPictures.length} spotlight image(s), ${tracks.length} audio asset(s), ${playerTracks.length} player track(s), ${referencedTracks.length} referenced post track(s), ${copiedTracks.length} copied audio asset(s), and ${videos.length} remote video item(s).`);
}

function generateRoutes(hexo) {
  if (!cachedManifest || !cachedFiles) {
    collect(hexo);
  }

  const routes = [{
    path: 'js/dream-theme-manifest.js',
    data: cachedManifest
  }, {
    path: 'js/dream-asset-config.js',
    data: `window.DREAM_WORLD_ASSET_BASE = ${JSON.stringify(remoteAssetBase(hexo) || '')};\n`
  }];

  cachedFiles.pictures.forEach((file) => {
    routes.push({
      path: `assets/picture/${file.path}`,
      data: () => Promise.resolve(streamFile(file.source))
    });
  });

  cachedFiles.tracks.forEach((file) => {
    if (shouldCopyMusicAssets(hexo)) {
      routes.push({
        path: `assets/music/${file.name}`,
        data: () => Promise.resolve(streamFile(file.source))
      });
    }
  });

  cachedFiles.videos.forEach((file) => {
    routes.push({
      path: `assets/video/${file.path}`,
      data: () => Promise.resolve(streamFile(file.source))
    });
  });

  return routes;
}

function register(hexo) {
  hexo.on('generateBefore', () => {
    collect(hexo);
  });

  hexo.extend.filter.register('after_render:html', function(content) {
    const base = remoteAssetBase(hexo);
    if (!base) return content;

    const normalizedBase = normalizeBaseUrl(base);
    return String(content || '').replace(/(["'(])\/assets\/music\/([^"'()<>\\\s]+)/g, (match, prefix, assetPath) => {
      return `${prefix}${normalizedBase}/assets/music/${assetPath}`;
    });
  });

  hexo.extend.generator.register('dream_theme_assets', function() {
    return generateRoutes(hexo);
  });
}

module.exports = {
  IMAGE_EXTS,
  AUDIO_EXTS,
  BACKGROUND_IMAGE_NAMES,
  ensureDir,
  streamFile,
  listFiles,
  rootUrl,
  musicUrl,
  shouldCopyMusicAssets,
  musicTitle,
  pictureTitle,
  pictureGroup,
  isAbyssPicture,
  videoTitle,
  videoGroup,
  isAbyssVideo,
  loadMusicPlaylist,
  collectReferencedMusicFiles,
  listFilesRecursive,
  collect,
  generateRoutes,
  register
};

if (typeof hexo !== 'undefined') {
  register(hexo);
}
