'use strict';

const fs = require('fs');
const path = require('path');

const staticPackageJson = `${JSON.stringify({
  name: 'xiaodaidai-static-site',
  version: '0.0.0',
  private: true,
  scripts: {
    build: 'node scripts/vercel-static-build.js'
  }
}, null, 2)}\n`;

const staticVercelJson = `${JSON.stringify({
  buildCommand: 'npm run build',
  outputDirectory: 'public',
  functions: {
    'api/world-chat.js': {
      maxDuration: 30
    }
  }
}, null, 2)}\n`;

const staticBuildScript = `'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const ignored = new Set([
  '.git',
  '.vercel',
  'api',
  'node_modules',
  'package-lock.json',
  'package.json',
  'public',
  'scripts',
  'vercel.json'
]);

function copyEntry(source, target) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    fs.readdirSync(source).forEach((name) => {
      copyEntry(path.join(source, name), path.join(target, name));
    });
    return;
  }

  fs.copyFileSync(source, target);
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

fs.readdirSync(root).forEach((name) => {
  if (ignored.has(name)) return;
  copyEntry(path.join(root, name), path.join(output, name));
});

console.log('Prepared static output for Vercel.');
`;

hexo.extend.generator.register('vercel_static_output', function() {
  const worldChatApi = path.join(hexo.base_dir, 'api', 'world-chat.js');

  return [{
    path: 'package.json',
    data: staticPackageJson
  }, {
    path: 'vercel.json',
    data: staticVercelJson
  }, {
    path: 'scripts/vercel-static-build.js',
    data: `${staticBuildScript}\n`
  }, {
    path: 'api/world-chat.js',
    data: () => Promise.resolve(fs.readFileSync(worldChatApi))
  }];
});
