'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

function freshRequire(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function syntaxCheck(relativePath) {
  const result = spawnSync(process.execPath, ['--check', relativePath], {
    cwd: rootDir,
    encoding: 'utf8'
  });

  assert.strictEqual(
    result.status,
    0,
    `${relativePath} failed syntax check.\n${result.stderr || result.stdout || ''}`.trim()
  );
}

function createHexoMock() {
  const events = [];
  const generators = [];
  const filters = [];

  return {
    mock: {
      base_dir: `${rootDir}${path.sep}`,
      source_dir: path.join(rootDir, 'source'),
      config: {
        root: '/',
        url: 'https://xiaodaidai.site'
      },
      log: {
        warn() {},
        info() {}
      },
      on(event, handler) {
        events.push({ event, handler });
      },
      extend: {
        filter: {
          register(name, handler) {
            filters.push({ name, handler });
          }
        },
        generator: {
          register(name, handler) {
            generators.push({ name, handler });
          }
        }
      }
    },
    events,
    generators,
    filters
  };
}

function validateDreamThemeAssets() {
  const { mock, events, generators, filters } = createHexoMock();
  global.hexo = mock;
  const mod = freshRequire(path.join(rootDir, 'scripts', 'dream-theme-assets.js'));
  delete global.hexo;

  assert.strictEqual(typeof mod.collect, 'function', 'dream-theme-assets.js should export collect().');
  assert.strictEqual(typeof mod.generateRoutes, 'function', 'dream-theme-assets.js should export generateRoutes().');
  assert.ok(events.some((item) => item.event === 'generateBefore'), 'dream-theme-assets.js should register generateBefore hook.');
  assert.ok(filters.some((item) => item.name === 'after_render:html'), 'dream-theme-assets.js should register after_render:html hook.');
  assert.ok(generators.some((item) => item.name === 'dream_theme_assets'), 'dream-theme-assets.js should register dream_theme_assets generator.');

  mod.BACKGROUND_IMAGE_NAMES.forEach((name) => {
    assert.ok(fs.existsSync(path.join(rootDir, 'picture', name)), `Missing configured background image: picture/${name}`);
  });

  mod.collect(mock);
  const routes = mod.generateRoutes(mock);
  assert.ok(Array.isArray(routes) && routes.length > 0, 'dream-theme-assets.js should generate asset routes.');
  assert.ok(routes.some((route) => route.path === 'js/dream-theme-manifest.js'), 'Missing dream-theme manifest route.');
}

function validateDreamSiteData() {
  const { mock, generators } = createHexoMock();
  global.hexo = mock;
  const mod = freshRequire(path.join(rootDir, 'scripts', 'dream-site-data.js'));
  delete global.hexo;

  assert.strictEqual(typeof mod.generateSiteData, 'function', 'dream-site-data.js should export generateSiteData().');
  assert.ok(generators.some((item) => item.name === 'dream_site_data'), 'dream-site-data.js should register dream_site_data generator.');

  const route = mod.generateSiteData(mock, {
    posts: {
      toArray() {
        return [{
          draft: false,
          title: '示例文章',
          date: '2026-06-01T00:00:00.000Z',
          updated: '2026-06-02T00:00:00.000Z',
          content: '<p>Hello</p>',
          raw: 'Hello',
          path: '2026/06/01/demo/'
        }];
      }
    },
    tags: {
      toArray() {
        return [{
          name: '测试',
          length: 1,
          path: 'tags/test/'
        }];
      }
    }
  });

  assert.strictEqual(route.path, 'js/dream-site-data.js', 'dream-site-data.js should generate the expected route path.');
  assert.ok(/DREAM_SITE_DATA/.test(route.data), 'dream-site-data.js should emit window.DREAM_SITE_DATA.');
}

function validateBuildWorldApp() {
  const mod = freshRequire(path.join(rootDir, 'scripts', 'build-world-app.js'));

  assert.strictEqual(typeof mod.main, 'function', 'build-world-app.js should export main().');
  assert.ok(fs.existsSync(mod.entryPath), 'world app entry file should exist.');
  assert.ok(path.basename(mod.outputPath) === 'world-app.js', 'world app output should target world-app.js.');
}

function validateFriendLinksChecker() {
  const mod = freshRequire(path.join(rootDir, 'scripts', 'check-friend-links.js'));

  assert.deepStrictEqual(
    mod.REQUIRED_FIELDS,
    ['name', 'url', 'avatar', 'description', 'backlink'],
    'Friend link required fields should stay stable.'
  );
  assert.strictEqual(mod.isHttpUrl('https://xiaodaidai.site/'), true, 'Friend link checker should accept https URLs.');
  assert.strictEqual(mod.isHttpUrl('notaurl'), false, 'Friend link checker should reject invalid URLs.');
  assert.doesNotThrow(() => {
    mod.validateFriendShape({
      name: 'Example',
      url: 'https://example.com/',
      avatar: 'https://example.com/avatar.png',
      description: 'Example site',
      backlink: 'https://example.com/links/'
    }, 'example.json');
  }, 'Friend link checker should accept valid friend records.');
}

function validatePackageManager() {
  assert.ok(fs.existsSync(path.join(rootDir, 'package-lock.json')), 'package-lock.json should exist.');
  assert.ok(!fs.existsSync(path.join(rootDir, 'yarn.lock')), 'yarn.lock should be removed; npm is the single package manager.');
}

function main() {
  [
    'scripts/dream-theme-assets.js',
    'scripts/dream-site-data.js',
    'scripts/build-world-app.js',
    'scripts/check-friend-links.js'
  ].forEach(syntaxCheck);

  validatePackageManager();
  validateDreamThemeAssets();
  validateDreamSiteData();
  validateBuildWorldApp();
  validateFriendLinksChecker();

  console.log('[validate-scripts] All script checks passed.');
}

main();
