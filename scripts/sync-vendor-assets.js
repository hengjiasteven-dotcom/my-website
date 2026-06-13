'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'source');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing vendor asset: ${path.relative(rootDir, from)}`);
  }

  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function copyPatchedFile(from, to, replacements) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing vendor asset: ${path.relative(rootDir, from)}`);
  }

  ensureDir(path.dirname(to));
  let content = fs.readFileSync(from, 'utf8');
  replacements.forEach(([fromPattern, toValue]) => {
    content = content.replace(fromPattern, toValue);
  });
  fs.writeFileSync(to, content);
}

function replaceInFile(file, from, to) {
  const content = fs.readFileSync(file, 'utf8');
  const next = content.replace(from, to);

  if (next !== content) {
    fs.writeFileSync(file, next);
  }
}

function copyDir(from, to, filter = () => true) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing vendor directory: ${path.relative(rootDir, from)}`);
  }

  fs.rmSync(to, { recursive: true, force: true });
  ensureDir(to);

  fs.readdirSync(from, { withFileTypes: true }).forEach((entry) => {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDir(src, dest, filter);
    } else if (entry.isFile() && filter(src)) {
      copyFile(src, dest);
    }
  });
}

function syncWaline() {
  const walineSrc = path.join(rootDir, 'node_modules', '@waline', 'client', 'dist');
  const walineDest = path.join(sourceDir, 'js', 'vendor', 'waline');

  copyFile(path.join(walineSrc, 'waline.js'), path.join(walineDest, 'waline.js'));
  copyFile(path.join(walineSrc, 'waline.css'), path.join(walineDest, 'waline.css'));
  copyFile(path.join(walineSrc, 'pageview.js'), path.join(walineDest, 'pageview.js'));

  copyDir(
    path.join(rootDir, 'node_modules', '@waline', 'emojis', 'weibo'),
    path.join(sourceDir, 'js', 'vendor', 'waline-emojis', 'weibo'),
    (file) => /\.(?:json|png|webp|gif|jpe?g|svg)$/i.test(file)
  );
}

function syncThree() {
  const threeRoot = path.join(rootDir, 'node_modules', 'three');
  const threeDest = path.join(sourceDir, 'js', 'vendor', 'three');
  const threeModuleDest = path.join(threeDest, 'build', 'three.module.js');

  copyFile(
    path.join(threeRoot, 'build', 'three.module.js'),
    threeModuleDest
  );
  replaceInFile(threeModuleDest, /\n\t\t\t \tmaterial = getMaterial\( data\.material \);/, '\n\t\t\t\tmaterial = getMaterial( data.material );');
  copyPatchedFile(
    path.join(threeRoot, 'examples', 'jsm', 'controls', 'OrbitControls.js'),
    path.join(threeDest, 'examples', 'jsm', 'controls', 'OrbitControls.js'),
    [[/from 'three';/g, "from '../../../build/three.module.js';"]]
  );
  copyPatchedFile(
    path.join(threeRoot, 'examples', 'jsm', 'loaders', 'GLTFLoader.js'),
    path.join(threeDest, 'examples', 'jsm', 'loaders', 'GLTFLoader.js'),
    [[/from 'three';/g, "from '../../../build/three.module.js';"]]
  );
  copyPatchedFile(
    path.join(threeRoot, 'examples', 'jsm', 'objects', 'Reflector.js'),
    path.join(threeDest, 'examples', 'jsm', 'objects', 'Reflector.js'),
    [[/from 'three';/g, "from '../../../build/three.module.js';"]]
  );
  copyPatchedFile(
    path.join(threeRoot, 'examples', 'jsm', 'utils', 'BufferGeometryUtils.js'),
    path.join(threeDest, 'examples', 'jsm', 'utils', 'BufferGeometryUtils.js'),
    [[/from 'three';/g, "from '../../../build/three.module.js';"]]
  );
}

function syncFfmpeg() {
  const ffmpegDest = path.join(sourceDir, 'js', 'vendor', 'ffmpeg');
  const ffmpegSrc = path.join(rootDir, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'umd');

  copyFile(path.join(ffmpegSrc, 'ffmpeg.js'), path.join(ffmpegDest, 'ffmpeg.js'));
  copyFile(path.join(ffmpegSrc, '814.ffmpeg.js'), path.join(ffmpegDest, '814.ffmpeg.js'));
  fs.rmSync(path.join(ffmpegDest, 'core'), { recursive: true, force: true });
}

function main() {
  syncWaline();
  syncThree();
  syncFfmpeg();
  console.log('[vendor:sync] Local vendor assets synced.');
}

if (require.main === module) {
  main();
}
