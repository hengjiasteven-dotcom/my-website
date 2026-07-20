'use strict';

const crypto = require('crypto');

const PASSWORD = '414756';
const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function toBase64(value) {
  return Buffer.from(value).toString('base64');
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEncryptedPost(page) {
  return page.encrypt === true || page.encrypted === true;
}

function encryptHtml(html, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(html), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    kdf: 'PBKDF2',
    digest: 'SHA-256',
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(Buffer.concat([encrypted, tag]))
  };
}

function lockTemplate(page, payload) {
  const storageKey = `dream-post-unlocked:${page.path || page.slug || page.title || 'post'}`;
  const safeTitle = htmlEscape(page.title || '加密文章');
  const payloadJson = JSON.stringify(payload);

  return `<div class="dream-encrypt" data-storage-key="${htmlEscape(storageKey)}">
  <style>
    .dream-encrypt {
      --dream-lock-ink: #1f2f3d;
      --dream-lock-muted: #647587;
      --dream-lock-line: rgba(82, 120, 132, 0.20);
      --dream-lock-accent: #267e8e;
      --dream-lock-accent-strong: #1f6a78;
      --dream-lock-bg: rgba(255, 255, 255, 0.86);
      margin: 18px auto 28px;
      color: var(--dream-lock-ink);
    }

    .dream-encrypt__panel {
      max-width: 560px;
      margin: 0 auto;
      padding: 28px;
      border: 1px solid var(--dream-lock-line);
      border-radius: 8px;
      background: var(--dream-lock-bg);
      box-shadow: 0 18px 50px rgba(27, 54, 66, 0.12);
      backdrop-filter: blur(12px);
    }

    .dream-encrypt__title {
      margin: 0 0 10px;
      font-size: 24px;
      line-height: 1.35;
      color: var(--dream-lock-ink);
      letter-spacing: 0;
    }

    .dream-encrypt__text {
      margin: 0 0 20px;
      color: var(--dream-lock-muted);
      font-size: 15px;
      line-height: 1.7;
    }

    .dream-encrypt__form {
      display: flex;
      gap: 10px;
      align-items: stretch;
    }

    .dream-encrypt__input {
      flex: 1;
      min-width: 0;
      height: 44px;
      padding: 0 14px;
      border: 1px solid var(--dream-lock-line);
      border-radius: 6px;
      color: var(--dream-lock-ink);
      background: rgba(255, 255, 255, 0.92);
      font-size: 16px;
      outline: none;
    }

    .dream-encrypt__input:focus {
      border-color: rgba(38, 126, 142, 0.58);
      box-shadow: 0 0 0 3px rgba(38, 126, 142, 0.13);
    }

    .dream-encrypt__button {
      min-width: 96px;
      height: 44px;
      padding: 0 18px;
      border: 0;
      border-radius: 6px;
      color: #fff;
      background: var(--dream-lock-accent);
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
    }

    .dream-encrypt__button:hover,
    .dream-encrypt__button:focus {
      background: var(--dream-lock-accent-strong);
    }

    .dream-encrypt__button:disabled {
      cursor: wait;
      opacity: 0.72;
    }

    .dream-encrypt__status {
      min-height: 22px;
      margin: 12px 0 0;
      color: #b43b46;
      font-size: 14px;
      line-height: 1.5;
    }

    .dream-encrypt__content {
      display: none;
    }

    @media (max-width: 560px) {
      .dream-encrypt__panel {
        padding: 22px 18px;
      }

      .dream-encrypt__form {
        flex-direction: column;
      }

      .dream-encrypt__button {
        width: 100%;
      }
    }
  </style>

  <div class="dream-encrypt__panel" data-dream-lock-panel>
    <h2 class="dream-encrypt__title">${safeTitle}</h2>
    <p class="dream-encrypt__text">这篇文章已加密，请输入密码后阅读。</p>
    <form class="dream-encrypt__form" data-dream-lock-form>
      <input class="dream-encrypt__input" data-dream-lock-password type="password" inputmode="numeric" autocomplete="current-password" placeholder="输入密码" aria-label="输入密码">
      <button class="dream-encrypt__button" data-dream-lock-submit type="submit">打开</button>
    </form>
    <p class="dream-encrypt__status" data-dream-lock-status aria-live="polite"></p>
  </div>
  <div class="dream-encrypt__content markdown-body" data-dream-lock-content></div>
</div>

<script>
(function () {
  var root = document.currentScript.previousElementSibling;
  if (!root || !root.classList.contains('dream-encrypt')) return;

  var payload = ${payloadJson};
  var panel = root.querySelector('[data-dream-lock-panel]');
  var form = root.querySelector('[data-dream-lock-form]');
  var input = root.querySelector('[data-dream-lock-password]');
  var button = root.querySelector('[data-dream-lock-submit]');
  var status = root.querySelector('[data-dream-lock-status]');
  var content = root.querySelector('[data-dream-lock-content]');

  function fromBase64(value) {
    var binary = window.atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function runScripts(container) {
    var scripts = Array.prototype.slice.call(container.querySelectorAll('script'));
    scripts.forEach(function (oldScript) {
      var nextScript = document.createElement('script');
      Array.prototype.slice.call(oldScript.attributes).forEach(function (attribute) {
        nextScript.setAttribute(attribute.name, attribute.value);
      });
      nextScript.text = oldScript.text;
      oldScript.parentNode.replaceChild(nextScript, oldScript);
    });
  }

  async function decrypt(password) {
    var salt = fromBase64(payload.salt);
    var iv = fromBase64(payload.iv);
    var packed = fromBase64(payload.data);
    var rawKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    var key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: payload.iterations,
        hash: payload.digest
      },
      rawKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    var plain = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 },
      key,
      packed
    );
    return new TextDecoder().decode(plain);
  }

  function unlock(html) {
    content.innerHTML = html;
    content.style.display = 'block';
    panel.style.display = 'none';
    root.classList.add('is-unlocked');
    runScripts(content);
    if (window.Fluid && Fluid.boot && Fluid.boot.refresh) {
      Fluid.boot.refresh();
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!window.crypto || !window.crypto.subtle) {
      status.textContent = '当前浏览器环境不支持解密，请使用 HTTPS 或 localhost 打开。';
      return;
    }

    var password = input.value.trim();
    if (!password) {
      status.textContent = '请输入密码。';
      input.focus();
      return;
    }

    button.disabled = true;
    status.textContent = '正在打开...';

    try {
      unlock(await decrypt(password));
      status.textContent = '';
    } catch (error) {
      status.textContent = '密码不正确，请再试一次。';
      input.select();
      button.disabled = false;
    }
  });

  window.setTimeout(function () {
    input.focus();
  }, 120);
}());
</script>`;
}

hexo.extend.filter.register('after_post_render', (page) => {
  if (!isEncryptedPost(page)) return page;

  const originalContent = page.content || '';
  page.content = lockTemplate(page, encryptHtml(originalContent, PASSWORD));
  page.excerpt = page.description || '这篇文章已加密，请输入密码后阅读。';

  return page;
}, 999);
