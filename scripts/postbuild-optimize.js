'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const JS_EXT = /\.js$/i;
const CSS_EXT = /\.css$/i;
const HTML_EXT = /\.html$/i;
const IMAGE_EXT = /\.(?:jpe?g|png|webp)$/i;

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

function run(command, args) {
  let bin = command;
  let finalArgs = args;

  if (process.platform === 'win32') {
    bin = 'cmd.exe';
    finalArgs = ['/d', '/s', '/c', [command].concat(args).map((arg) => {
      const value = String(arg);
      return /[\s&()^=;!'+,`~]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
    }).join(' ')];
  }

  const result = spawnSync(bin, finalArgs, {
    cwd: rootDir,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    const detail = [result.error && result.error.message, result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `\n${detail}` : ''}`);
  }

  return result;
}

function byteLength(file) {
  return fs.existsSync(file) ? fs.statSync(file).size : 0;
}

function rel(file) {
  return path.relative(rootDir, file).split(path.sep).join('/');
}

function stripHtmlComments(content) {
  return content.replace(/<!--(?!\[if|<!|\s*ko)[\s\S]*?-->/g, '');
}

function minifyCss(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyJs(content) {
  return content
    .replace(/^\s*\/\/# sourceMappingURL=.*$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function optimizeTextFiles() {
  walk(publicDir).forEach((file) => {
    if (CSS_EXT.test(file)) {
      fs.writeFileSync(file, minifyCss(fs.readFileSync(file, 'utf8')));
    } else if (JS_EXT.test(file) && !file.includes(`${path.sep}vendor${path.sep}`)) {
      fs.writeFileSync(file, minifyJs(fs.readFileSync(file, 'utf8')));
    } else if (HTML_EXT.test(file)) {
      fs.writeFileSync(file, stripHtmlComments(fs.readFileSync(file, 'utf8')));
    }
  });
}

function optimizeModel() {
  const model = path.join(publicDir, 'world', 'models', 'base_basic_pbr.glb');
  if (!fs.existsSync(model)) return;

  const tmp = model.replace(/\.glb$/i, '.optimized.glb');
  run('npx', [
    '--yes',
    '@gltf-transform/cli',
    'optimize',
    rel(model),
    rel(tmp),
    '--compress',
    'quantize',
    '--texture-compress',
    'webp',
    '--texture-size',
    '1024'
  ]);
  fs.renameSync(tmp, model);
}

function optimizeImage(input, outputDir, width, height, format, quality) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const args = ['--yes', 'sharp-cli', '-i', input, '-o', outputDir];

  if (format) {
    args.push('-f', format);
  }
  if (quality) {
    args.push('-q', String(quality));
  }

  args.push('resize', String(width));
  if (height) {
    args.push(String(height));
  }

  run('npx', args);
  return path.join(outputDir, path.basename(input));
}

function replaceIfSmaller(original, optimized) {
  if (!fs.existsSync(optimized)) return false;
  if (byteLength(optimized) < byteLength(original)) {
    fs.copyFileSync(optimized, original);
    return true;
  }
  return false;
}

function optimizeImages() {
  const tmpDir = path.join(publicDir, '.optimize-tmp');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const iconSource = path.join(publicDir, 'img', 'site-icon.png');
  if (fs.existsSync(iconSource)) {
    let optimized = optimizeImage(iconSource, path.join(tmpDir, 'site-icon-512'), 512, 512, 'png');
    replaceIfSmaller(iconSource, optimized);

    optimized = optimizeImage(iconSource, path.join(tmpDir, 'site-icon-300'), 300, 300, 'png');
    fs.copyFileSync(optimized, path.join(publicDir, 'img', 'avatar.png'));

    optimized = optimizeImage(iconSource, path.join(tmpDir, 'site-icon-180'), 180, 180, 'png');
    fs.copyFileSync(optimized, path.join(publicDir, 'img', 'apple-touch-icon.png'));

    optimized = optimizeImage(iconSource, path.join(tmpDir, 'site-icon-64'), 64, 64, 'png');
    fs.copyFileSync(optimized, path.join(publicDir, 'img', 'site-icon-64.png'));
  }

  walk(path.join(publicDir, 'assets', 'picture')).forEach((file) => {
    if (!IMAGE_EXT.test(file)) return;

    const ext = path.extname(file).toLowerCase();
    const stem = path.basename(file, ext);
    const outputDir = path.join(tmpDir, stem);
    const largeArticleImage = /^(?:mom[2-5]|bg|9488dc7a0c9a3c3df587a60260527835|postpost_memo_image)/i.test(path.basename(file));
    const maxWidth = largeArticleImage ? 1600 : 1400;
    const format = ext === '.png' ? 'png' : ext === '.webp' ? 'webp' : 'jpeg';
    const quality = format === 'png' ? undefined : 82;

    const output = optimizeImage(file, outputDir, maxWidth, null, format, quality);
    replaceIfSmaller(file, output);
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function main() {
  if (!fs.existsSync(publicDir)) {
    throw new Error(`Public directory not found: ${publicDir}`);
  }

  const before = walk(publicDir).reduce((sum, file) => sum + byteLength(file), 0);
  optimizeTextFiles();
  optimizeModel();
  optimizeImages();
  const after = walk(publicDir).reduce((sum, file) => sum + byteLength(file), 0);
  const saved = before - after;
  console.log(`[postbuild-optimize] Saved ${(saved / 1024 / 1024).toFixed(2)} MB (${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB).`);
}

if (require.main === module) {
  main();
}
