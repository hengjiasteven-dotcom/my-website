'use strict';

const fs = require('fs');
const path = require('path');

const FRIENDS_DIR = path.join(process.cwd(), 'source', '_data', 'friends');
const SITE_URL = 'https://xiaodaidai.site/';
const REQUIRED_FIELDS = ['name', 'url', 'avatar', 'description', 'backlink'];

function fail(message) {
  console.error(`[Friend Links] ${message}`);
  process.exitCode = 1;
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'friend-link-checker'
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.text();
}

async function main() {
  if (!fs.existsSync(FRIENDS_DIR)) {
    console.log('[Friend Links] No friends directory found, skipping.');
    return;
  }

  const files = fs.readdirSync(FRIENDS_DIR)
    .filter((name) => path.extname(name).toLowerCase() === '.json')
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));

  const seenUrls = new Set();

  for (const fileName of files) {
    const fullPath = path.join(FRIENDS_DIR, fileName);
    let friend;

    try {
      friend = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (error) {
      fail(`${fileName} is not valid JSON: ${error.message}`);
      continue;
    }

    for (const field of REQUIRED_FIELDS) {
      if (!friend[field] || typeof friend[field] !== 'string') {
        fail(`${fileName} is missing required field "${field}".`);
      }
    }

    if (!isHttpUrl(friend.url)) {
      fail(`${fileName} has an invalid url.`);
    }

    if (!isHttpUrl(friend.avatar)) {
      fail(`${fileName} has an invalid avatar url.`);
    }

    if (!isHttpUrl(friend.backlink)) {
      fail(`${fileName} has an invalid backlink url.`);
    }

    if (seenUrls.has(friend.url)) {
      fail(`${fileName} has a duplicate site url: ${friend.url}`);
    }
    seenUrls.add(friend.url);

    try {
      await fetchText(friend.url);
    } catch (error) {
      fail(`${fileName} site url is not reachable: ${error.message}`);
    }

    try {
      await fetchText(friend.avatar);
    } catch (error) {
      fail(`${fileName} avatar url is not reachable: ${error.message}`);
    }

    try {
      const backlinkPage = await fetchText(friend.backlink);
      if (!backlinkPage.includes(SITE_URL)) {
        fail(`${fileName} backlink page does not contain ${SITE_URL}`);
      }
    } catch (error) {
      fail(`${fileName} backlink page is not reachable: ${error.message}`);
    }
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log(`[Friend Links] Checked ${files.length} friend file(s).`);
}

if (require.main === module) {
  main().catch((error) => {
    fail(error.message);
    process.exit(1);
  });
}
