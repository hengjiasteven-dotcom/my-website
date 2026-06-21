'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true, override: true });

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv']);
const REMOTE_MUSIC_LIST_PATH = path.resolve(__dirname, '..', 'source', 'data', 'remote-music-list.json');
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

function listFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => exts.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
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

function musicUrl(hexo, name) {
  return assetUrl(hexo, `assets/music/${name}`);
}

function shouldCopyMusicAssets(hexo) {
  return !remoteAssetBase(hexo);
}

function musicTitle(file) {
  return path.basename(file, path.extname(file))
    .replace(/\s+-\s+.+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
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
  const videoDir = path.join(baseDir, 'video');
  const postsDir = path.join(baseDir, 'source', '_posts');

  const pictures = listFiles(pictureDir, IMAGE_EXTS);
  const backgroundPictures = pictures.filter((name) => BACKGROUND_IMAGE_NAMES.has(name));
  const localTracks = uniqueTrackNames(listFiles(musicDir, AUDIO_EXTS));
  const remoteTracks = loadRemoteMusicList();
  const tracks = localTracks.length ? localTracks : remoteTracks;
  const playerTracks = localTracks.length ? loadMusicPlaylist(musicDir, tracks, hexo) : tracks;
  const referencedTracks = collectReferencedMusicFiles(postsDir, tracks);
  const copiedTracks = uniqueTrackNames(playerTracks.concat(referencedTracks))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const videos = listFiles(videoDir, VIDEO_EXTS);

  const manifest = {
    pictures: backgroundPictures.map((name) => ({
      name,
      url: rootUrl(hexo.config.root, `assets/picture/${name}`)
    })),
    music: playerTracks.map((name) => ({
      name,
      title: musicTitle(name),
      url: musicUrl(hexo, name)
    })),
    videos: videos.map((name) => ({
      name,
      title: path.basename(name, path.extname(name)),
      url: rootUrl(hexo.config.root, `assets/video/${name}`)
    }))
  };

  const content = `window.DREAM_THEME_ASSETS = ${JSON.stringify(manifest, null, 2)};\n`;

  cachedManifest = content;
  cachedFiles = {
    pictures: pictures.map((name) => ({
      name,
      source: path.join(pictureDir, name)
    })),
    tracks: copiedTracks.map((name) => ({
      name,
      source: path.join(musicDir, name)
    })),
    videos: videos.map((name) => ({
      name,
      source: path.join(videoDir, name)
    }))
  };

  hexo.log.info(`[DreamTheme] Synced ${pictures.length} picture asset(s), ${backgroundPictures.length} background image(s), ${tracks.length} audio asset(s), ${playerTracks.length} player track(s), ${referencedTracks.length} referenced post track(s), ${copiedTracks.length} copied audio asset(s), and ${videos.length} video file(s).`);
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
      path: `assets/picture/${file.name}`,
      data: () => Promise.resolve(fs.readFileSync(file.source))
    });
  });

  cachedFiles.tracks.forEach((file) => {
    if (shouldCopyMusicAssets(hexo)) {
      routes.push({
        path: `assets/music/${file.name}`,
        data: () => Promise.resolve(fs.readFileSync(file.source))
      });
    }
  });

  cachedFiles.videos.forEach((file) => {
    routes.push({
      path: `assets/video/${file.name}`,
      data: () => Promise.resolve(fs.readFileSync(file.source))
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
  VIDEO_EXTS,
  BACKGROUND_IMAGE_NAMES,
  ensureDir,
  listFiles,
  rootUrl,
  musicUrl,
  shouldCopyMusicAssets,
  musicTitle,
  loadMusicPlaylist,
  collectReferencedMusicFiles,
  collect,
  generateRoutes,
  register
};

if (typeof hexo !== 'undefined') {
  register(hexo);
}
