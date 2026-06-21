'use strict';

const fs = require('fs');
const path = require('path');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv']);
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

function musicUrl(hexo, name) {
  return rootUrl(hexo.config.root, `assets/music/${name}`);
}

function shouldCopyMusicAssets(hexo) {
  return true;
}

function musicTitle(file) {
  return path.basename(file, path.extname(file))
    .replace(/\s+-\s+.+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadMusicPlaylist(musicDir, availableTracks, hexo) {
  const playlistPath = path.join(musicDir, 'playlist.json');
  if (!fs.existsSync(playlistPath)) return availableTracks;

  try {
    const playlist = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    if (!Array.isArray(playlist)) {
      hexo.log.warn('[DreamTheme] music/playlist.json must be an array of filenames. Falling back to all tracks.');
      return availableTracks;
    }

    const available = new Set(availableTracks);
    const selected = [];
    playlist.forEach((name) => {
      if (typeof name !== 'string') return;
      if (!available.has(name)) {
        hexo.log.warn(`[DreamTheme] Playlist track not found in music/: ${name}`);
        return;
      }
      if (!selected.includes(name)) selected.push(name);
    });
    return selected;
  } catch (error) {
    hexo.log.warn(`[DreamTheme] Failed to read music/playlist.json: ${error.message}. Falling back to all tracks.`);
    return availableTracks;
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

  const available = new Set(availableTracks);
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
        if (available.has(trackName)) referenced.add(trackName);
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
  const tracks = listFiles(musicDir, AUDIO_EXTS);
  const playerTracks = loadMusicPlaylist(musicDir, tracks, hexo);
  const referencedTracks = collectReferencedMusicFiles(postsDir, tracks);
  const copiedTracks = Array.from(new Set(playerTracks.concat(referencedTracks)))
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
