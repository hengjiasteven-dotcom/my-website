const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const zlib = require('node:zlib');
const worldChat = require('../api/world-chat');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
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
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
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
  if (longCacheExts.has(path.extname(filePath).toLowerCase())) {
    return 'public, max-age=31536000, immutable';
  }

  return 'no-cache';
}

function acceptsGzip(request, filePath) {
  if (!/\.(?:html|css|js|json|svg|xml)$/i.test(filePath)) return false;
  return /\bgzip\b/i.test(request.headers['accept-encoding'] || '');
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
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

function serveFile(request, response) {
  let filePath = safePublicPath(request.url || '/');
  if (!filePath) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }

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

    fs.readFile(filePath, (error, data) => {
      if (error) {
        sendJson(response, error.code === 'ENOENT' ? 404 : 500, {
          error: error.code === 'ENOENT' ? 'Not found' : 'Unable to read file'
        });
        return;
      }

      const headers = {
        'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': cacheControlFor(filePath),
        ETag: etag
      };

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

const server = http.createServer((request, response) => {
  if ((request.url || '').startsWith('/api/world-chat')) {
    worldChat(request, response);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Method not allowed' });
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
