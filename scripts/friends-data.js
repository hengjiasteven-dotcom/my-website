'use strict';

const fs = require('fs');
const path = require('path');

function normalizeFriend(friend) {
  if (!friend || !friend.name || !friend.url) return null;

  return {
    title: String(friend.name),
    intro: String(friend.description || ''),
    link: String(friend.url),
    avatar: String(friend.avatar || '/img/avatar.png')
  };
}

function readFriendsDirectory(baseDir) {
  const dir = path.join(baseDir, 'source', '_data', 'friends');
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((name) => path.extname(name).toLowerCase() === '.json')
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map((name) => {
      const file = path.join(dir, name);

      try {
        const friend = JSON.parse(fs.readFileSync(file, 'utf8'));
        return normalizeFriend(friend);
      } catch (error) {
        hexo.log.warn(`[Friends] Failed to read ${name}: ${error.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

function readFriendsList(baseDir) {
  const file = path.join(baseDir, 'source', '_data', 'friends.json');
  if (!fs.existsSync(file)) return [];

  try {
    const friends = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(friends)) return [];

    return friends
      .map((friend) => normalizeFriend(friend))
      .filter(Boolean);
  } catch (error) {
    hexo.log.warn(`[Friends] Failed to read friends.json: ${error.message}`);
    return [];
  }
}

function readFriends(baseDir) {
  const directoryFriends = readFriendsDirectory(baseDir);
  if (directoryFriends.length > 0) return directoryFriends;

  return readFriendsList(baseDir);
}

hexo.on('generateBefore', () => {
  const theme = hexo.theme && hexo.theme.config;
  if (!theme || !theme.links) return;

  theme.links.items = readFriends(hexo.base_dir);
});
