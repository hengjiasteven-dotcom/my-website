'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const entryPath = path.join(rootDir, 'source', 'world', 'world-app-entry.js');
const outputPath = path.join(rootDir, 'source', 'world', 'world-app.js');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

function main() {
  if (!fs.existsSync(entryPath)) {
    throw new Error(`Missing world app entry: ${path.relative(rootDir, entryPath)}`);
  }

  run('npx', [
    '--yes',
    'esbuild@0.24.2',
    path.relative(rootDir, entryPath),
    '--bundle',
    '--format=iife',
    '--global-name=WorldApp',
    '--target=es2018',
    `--outfile=${path.relative(rootDir, outputPath)}`
  ]);
}

if (require.main === module) {
  main();
}
