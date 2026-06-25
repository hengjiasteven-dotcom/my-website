const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const zlib = require('node:zlib');
const worldChat = require('../api/world-chat');
const petChat = require('../api/pet-chat');
const dreamThemeAssets = require('../scripts/dream-theme-assets.js');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const pictureDir = path.join(rootDir, 'picture');
const port = Number(process.env.PORT || 4015);

function loadDotEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadDotEnv();

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function assetCdnBase() {
  return normalizeBaseUrl(process.env.ASSET_CDN_BASE || '');
}

function previewAssetUrl(assetPath) {
  const base = assetCdnBase();
  const normalizedPath = String(assetPath || '')
    .replace(/^\/+/, '')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

  if (base) {
    return `${base}/${normalizedPath}`;
  }

  return `/${normalizedPath}`;
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
  '.ogv': 'video/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

const longCacheExts = new Set([
  '.css',
  '.gif',
  '.glb',
  '.jpeg',
  '.jpg',
  '.js',
  '.mp3',
  '.png',
  '.svg',
  '.webp',
  '.xml'
]);

function cacheControlFor(filePath) {
  if (process.env.DREAM_PREVIEW_CACHE === 'immutable') {
    if (longCacheExts.has(path.extname(filePath).toLowerCase())) {
      return 'public, max-age=31536000, immutable';
    }
    return 'no-cache';
  }

  // Local preview should always prefer fresh assets over aggressive browser caching.
  if (/\.(?:css|gif|glb|jpe?g|js|mp3|mp4|m4v|mov|ogv|png|svg|webm|webp|xml)$/i.test(filePath)) {
    return 'no-cache';
  }

  if (longCacheExts.has(path.extname(filePath).toLowerCase())) {
    return 'public, max-age=31536000, immutable';
  }

  return 'no-cache';
}

function acceptsGzip(request, filePath) {
  if (!/\.(?:html|css|js|json|svg|xml)$/i.test(filePath)) return false;
  return /\bgzip\b/i.test(request.headers['accept-encoding'] || '');
}

function isRangeMedia(filePath) {
  return /\.(?:mp3|mp4|m4v|mov|ogv|webm)$/i.test(filePath);
}

function parseRangeHeader(headerValue, totalSize) {
  if (!headerValue) return null;

  const match = String(headerValue).match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return null;

  let start = match[1] === '' ? null : Number(match[1]);
  let end = match[2] === '' ? null : Number(match[2]);

  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) {
    return null;
  }

  if (start === null && end === null) return null;

  if (start === null) {
    const suffixLength = Math.max(0, end || 0);
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else {
    end = end === null ? totalSize - 1 : Math.min(end, totalSize - 1);
  }

  if (start < 0 || start >= totalSize || end < start) {
    return { invalid: true };
  }

  return { start, end };
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function parseManifestFile() {
  const filePath = path.join(publicDir, 'js', 'dream-theme-manifest.js');
  if (!fs.existsSync(filePath)) {
    return { pictures: [], spotlightPictures: [], music: [], videos: [] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/window\.DREAM_THEME_ASSETS\s*=\s*([\s\S]*?);\s*$/);
  if (!match) {
    return { pictures: [], spotlightPictures: [], music: [], videos: [] };
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return { pictures: [], spotlightPictures: [], music: [], videos: [] };
  }
}

function dynamicThemeManifest() {
  const manifest = parseManifestFile();
  const rootPictures = dreamThemeAssets.listFiles(pictureDir, dreamThemeAssets.IMAGE_EXTS);
  const pictureFiles = dreamThemeAssets.listFilesRecursive(pictureDir, dreamThemeAssets.IMAGE_EXTS);
  const backgroundPictures = rootPictures.filter((name) => dreamThemeAssets.BACKGROUND_IMAGE_NAMES.has(name));
  const spotlightPictures = pictureFiles.filter((relativePath) => dreamThemeAssets.pictureGroup(relativePath));

  manifest.pictures = backgroundPictures.map((name) => ({
    name,
    url: dreamThemeAssets.rootUrl('/', `assets/picture/${name}`)
  }));

  manifest.spotlightPictures = spotlightPictures.map((relativePath) => ({
    name: path.basename(relativePath),
    path: relativePath,
    title: dreamThemeAssets.pictureTitle(relativePath),
    group: dreamThemeAssets.pictureGroup(relativePath),
    isAbyss: dreamThemeAssets.isAbyssPicture(relativePath),
    url: previewAssetUrl(`assets/picture/${relativePath}`)
  }));

  return `window.DREAM_THEME_ASSETS = ${JSON.stringify(manifest, null, 2)};\n`;
}

function decodedRequestPath(request) {
  return decodeURIComponent((request.url || '').split('?')[0]).replace(/^\/+/, '');
}

function safeAssetPath(assetRoot, decodedPath, prefix) {
  if (!decodedPath.startsWith(prefix)) return null;
  const relativePath = decodedPath.slice(prefix.length);
  const filePath = path.resolve(assetRoot, relativePath);
  if (!filePath.startsWith(assetRoot)) return null;
  return filePath;
}

function safePublicPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const cleanPath = decoded.replace(/^\/+/, '');
  const filePath = path.resolve(publicDir, cleanPath || 'index.html');

  if (!filePath.startsWith(publicDir)) {
    return null;
  }

  return filePath;
}

function serveResolvedFile(request, response, filePath) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      sendJson(response, statError.code === 'ENOENT' ? 404 : 500, {
        error: statError.code === 'ENOENT' ? 'Not found' : 'Unable to read file'
      });
      return;
    }

    const etag = `"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;
    if (request.headers['if-none-match'] === etag) {
      response.writeHead(304, {
        'Cache-Control': cacheControlFor(filePath),
        ETag: etag
      });
      response.end();
      return;
    }

    const headers = {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': cacheControlFor(filePath),
      ETag: etag
    };

    if (isRangeMedia(filePath)) {
      headers['Accept-Ranges'] = 'bytes';

      const parsedRange = parseRangeHeader(request.headers.range, stats.size);
      if (parsedRange && parsedRange.invalid) {
        response.writeHead(416, {
          ...headers,
          'Content-Range': `bytes */${stats.size}`
        });
        response.end();
        return;
      }

      if (parsedRange) {
        const { start, end } = parsedRange;
        const chunkSize = end - start + 1;
        response.writeHead(206, {
          ...headers,
          'Content-Length': chunkSize,
          'Content-Range': `bytes ${start}-${end}/${stats.size}`
        });

        if (request.method === 'HEAD') {
          response.end();
          return;
        }

        fs.createReadStream(filePath, { start, end }).pipe(response);
        return;
      }

      headers['Content-Length'] = stats.size;
      response.writeHead(200, headers);
      if (request.method === 'HEAD') {
        response.end();
        return;
      }

      fs.createReadStream(filePath).pipe(response);
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        sendJson(response, error.code === 'ENOENT' ? 404 : 500, {
          error: error.code === 'ENOENT' ? 'Not found' : 'Unable to read file'
        });
        return;
      }

      if (acceptsGzip(request, filePath)) {
        headers['Content-Encoding'] = 'gzip';
        response.writeHead(200, headers);
        response.end(request.method === 'HEAD' ? undefined : zlib.gzipSync(data));
        return;
      }

      response.writeHead(200, headers);
      response.end(request.method === 'HEAD' ? undefined : data);
    });
  });
}

function serveFile(request, response) {
  let filePath = safePublicPath(request.url || '/');
  if (!filePath) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }

  serveResolvedFile(request, response, filePath);
}

const server = http.createServer((request, response) => {
  if ((request.url || '').startsWith('/api/world-chat')) {
    worldChat(request, response);
    return;
  }

  if ((request.url || '').startsWith('/api/pet-chat')) {
    petChat(request, response);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const requestPath = decodedRequestPath(request);
  if (requestPath === 'js/dream-theme-manifest.js') {
    const body = dynamicThemeManifest();
    response.writeHead(200, {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    response.end(request.method === 'HEAD' ? undefined : body);
    return;
  }

  const pictureAssetPath = safeAssetPath(pictureDir, requestPath, 'assets/picture/');
  if (pictureAssetPath && fs.existsSync(pictureAssetPath)) {
    serveResolvedFile(request, response, pictureAssetPath);
    return;
  }

  serveFile(request, response);
});

server.listen(port, () => {
  const url = `http://localhost:${port}/`;
  console.log(`Preview with API: ${url}`);
  console.log(`World page: ${new URL('/world/', url).href}`);
  console.log(`Local file root: ${pathToFileURL(publicDir).href}`);
});
