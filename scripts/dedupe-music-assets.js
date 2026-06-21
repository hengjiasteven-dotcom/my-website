'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const sourceMusicDir = path.join(rootDir, 'music');
const publicMusicDir = path.join(rootDir, 'public', 'assets', 'music');
const AUDIO_EXT = /\.(?:mp3|ogg|wav|m4a|flac)$/i;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  });

  return files;
}

function fileHash(file) {
  const hash = crypto.createHash('sha1');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function dedupePublicMusic() {
  if (!fs.existsSync(sourceMusicDir) || !fs.existsSync(publicMusicDir)) {
    return { linked: 0, bytesSaved: 0, missing: true };
  }

  let linked = 0;
  let bytesSaved = 0;
  const sourceFiles = new Map();

  walk(sourceMusicDir).forEach((file) => {
    if (!AUDIO_EXT.test(file)) return;
    sourceFiles.set(path.basename(file), file);
  });

  walk(publicMusicDir).forEach((file) => {
    if (!AUDIO_EXT.test(file)) return;

    const source = sourceFiles.get(path.basename(file));
    if (!source || !fs.existsSync(source)) return;

    const sourceStat = fs.statSync(source);
    const targetStat = fs.statSync(file);
    if (sourceStat.size !== targetStat.size) return;

    try {
      if (fileHash(source) !== fileHash(file)) return;
      fs.rmSync(file, { force: true });
      fs.linkSync(source, file);
      linked += 1;
      bytesSaved += targetStat.size;
    } catch (error) {
      throw new Error(`Failed to hard-link ${path.basename(file)}: ${error.message}`);
    }
  });

  return { linked, bytesSaved, missing: false };
}

function main() {
  const result = dedupePublicMusic();
  if (result.missing) {
    console.log('[dedupe-music-assets] Skipped: source or public music directory is missing.');
    return;
  }

  console.log(`[dedupe-music-assets] Hard-linked ${result.linked} duplicated music asset(s), reclaiming about ${(result.bytesSaved / 1024 / 1024).toFixed(2)} MB of local disk usage.`);
}

if (require.main === module) {
  main();
}

module.exports = {
  dedupePublicMusic
};
