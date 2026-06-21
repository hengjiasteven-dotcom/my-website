(function() {
  'use strict';

  var assets = window.DREAM_THEME_ASSETS || { pictures: [], music: [] };

  function dedupeMusicAssets(list) {
    var seen = Object.create(null);
    return (Array.isArray(list) ? list : []).filter(function(track) {
      if (!track) return false;
      var name = String(track.name || '').trim().toLowerCase();
      var url = String(track.url || '').trim().toLowerCase();
      var key = name || url;
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  assets.music = dedupeMusicAssets(assets.music);
  var storageKey = 'DreamFluidPlayer';
  var visitStorageKey = 'DreamVisitorCounters';
  var petStorageKey = 'DreamNetworkPet';
  var taskStorageKey = 'DreamHomeTaskState';
  var legalConsentStorageKey = 'DreamLegalConsent';
  var legalConsentVersion = '2026-06-18';
  var walineServerURL = 'https://my-blog-eta-one-13.vercel.app';
  var root = document.documentElement;
  var searchShortcutBound = false;
  var dreamToolsHashBound = false;
  var activeDreamToolShow = null;
  var pjaxBound = false;
  var pjaxController = null;
  var friendLinksRequest = null;
  var siteDataPromise = null;
  var homeHeroTypingTimers = [];
  var deferredHomeFeaturesStarted = false;
  var homeAutoScrollState = null;
  var homeIntroStorageKey = 'DreamHomeIntroSeen';
  var homeIntroState = null;
  var legalPolicyTemplates = {
    'privacy-policy': [
      '<article class="about-legal-modal-article">',
      '<h2>隐私政策</h2>',
      '<h3>1. 信息收集范围</h3>',
      '<ol>',
      '<li>本站仅会自动收集您访问网站时产生的基础访问日志，包含访问IP地址、访问时间、浏览器类型、访问页面、设备类型等匿名化访问数据，仅用于站点访问量统计、异常访问排查、网站安全防护与访问体验优化，不会定位到具体自然人身份。</li>',
      '<li>仅当您主动在本站评论、留言时，您自愿填写的昵称、邮箱、留言内容会被本站存储；邮箱仅用于留言回复通知、防恶意刷评论校验，不会公开展示在页面中。</li>',
      '<li>本站不会主动收集您的身份证、手机号、住址、银行卡等敏感个人隐私信息，不会强制要求您授权第三方账号登录。</li>',
      '</ol>',
      '<h3>2. 信息使用规则</h3>',
      '<ol>',
      '<li>所有收集的访问统计数据、留言信息仅用于本站正常运营，不会向任何无关第三方出售、出租、共享、泄露您的个人信息。</li>',
      '<li>匿名访问日志会定期自动清理，仅保留最近12个月的站点统计数据；您的留言内容可由您联系站长申请删除、修改。</li>',
      '<li>本站不会基于收集的用户数据开展精准广告推送、用户画像商业营销行为。</li>',
      '</ol>',
      '<h3>3. 第三方服务说明</h3>',
      '<ol>',
      '<li>本站可能接入第三方访客统计、评论系统、字体、图标、CDN加速等第三方服务，第三方将遵循其自身隐私政策处理相关访问数据，本站会优先选择合规正规的第三方服务商。</li>',
      '<li>若您拒绝提供留言所需信息，仅会无法使用评论互动功能，不影响网站文章、页面的正常浏览。</li>',
      '</ol>',
      '<h3>4. 用户权利</h3>',
      '<ol>',
      '<li>您有权随时联系站长，申请查看、删除本人的留言记录；可通过浏览器清除Cookie拒绝本站本地存储的访问授权记录。</li>',
      '<li>如后续本站隐私条款发生更新，您再次访问网站时将重新触发访问确认弹窗，需重新同意后方可继续浏览。</li>',
      '</ol>',
      '<h3>5. 数据安全保障</h3>',
      '<p>本站会通过基础技术防护手段保护您的非公开数据，防止信息泄露、篡改、恶意访问；如遭遇非法网络攻击导致数据泄露，站长会第一时间采取补救措施并公示风险提示。</p>',
      '</article>'
    ].join(''),
    'terms-of-service': [
      '<article class="about-legal-modal-article">',
      '<h2>网站服务协议</h2>',
      '<h3>1. 站点性质说明</h3>',
      '<ol>',
      '<li>本站为<strong>个人非经营性公益向技术博客站点</strong>，仅用于站长个人技术学习记录、知识分享、技术交流，不开展任何线上交易、金融理财、付费咨询、托管担保、医疗法律专业意见、商品售卖等经营性商业活动。</li>',
      '<li>本站所有免费公开内容仅作学习参考，不构成任何投资、就业、技术落地的专业保证，您依据本站内容产生的一切决策、行为风险由您个人自行承担。</li>',
      '</ol>',
      '<h3>2. 用户使用规范</h3>',
      '<ol>',
      '<li>您在本站留言、评论、转载分享站内内容时，必须严格遵守《中华人民共和国网络安全法》《互联网信息服务管理办法》等相关法律法规，禁止发布下列内容：<ul><li>造谣、诽谤、辱骂、人身攻击、色情暴力、涉恐涉赌、涉政违法违规言论；</li><li>广告引流、恶意灌水、外链推广、病毒木马、恶意程序、钓鱼网站相关内容；</li><li>侵犯他人肖像权、著作权、隐私权等合法权益的内容。</li></ul></li>',
      '<li>禁止对本站实施恶意网络攻击、高频爬虫批量抓取全站资源、伪造请求滥用网站接口、破解站点权限、植入恶意脚本等破坏网站正常运营的行为；一经发现，站长有权封禁您的访问IP、删除违规留言，并保留追究法律责任的权利。</li>',
      '<li>未成年人访问本站需在监护人陪同下浏览，请勿在留言区泄露自身家庭、学校、手机号等私密信息。</li>',
      '</ol>',
      '<h3>3. 服务免责声明</h3>',
      '<ol>',
      '<li>本站尽力保障网站稳定可访问，但因服务器故障、运营商网络波动、第三方服务异常、不可抗力等因素导致网站临时无法访问、数据短暂异常，本站不承担任何赔偿责任。</li>',
      '<li>站内文章可能存在技术疏漏、时效性滞后等问题，站长会不定期修正内容，但不对信息绝对准确性、完整性作出承诺；站内第三方跳转链接的页面内容、服务由第三方平台负责，本站不对外链内容承担担保责任。</li>',
      '<li>站长有权在不提前通知的前提下，对网站内容、页面功能、服务条款、隐私政策进行调整、更新，或临时关停、永久下线本站。</li>',
      '</ol>',
      '<h3>4. 协议生效与终止</h3>',
      '<p>您勾选同意条款并进入网站，即代表本服务协议在您与本站之间生效；若您违反本服务条款及国家法律法规，站长有权随时终止您的本站访问、留言权限。</p>',
      '</article>'
    ].join(''),
    'copyright-notice': [
      '<article class="about-legal-modal-article">',
      '<h2>版权声明</h2>',
      '<h3>1. 原创内容版权归属</h3>',
      '<ol>',
      '<li>除页面明确标注转载、引用来源的内容外，本站内所有原创文章、技术笔记、页面文案、原创配图、代码示例、站点页面设计版式等内容，著作权均归本站主办者个人所有，受《中华人民共和国著作权法》保护。</li>',
      '<li>未经站长书面授权，禁止任何单位、个人将本站原创内容用于商业用途转载、汇编、二次售卖、封装至付费产品内。</li>',
      '</ol>',
      '<h3>2. 非商业使用规范</h3>',
      '<ol>',
      '<li>个人学习、技术交流等<strong>非商业场景</strong>下，允许有限转载、摘抄本站原创内容，但必须同时满足以下两项要求：<ul><li>清晰标注原文作者、文章来源；</li><li>附上本站原文原始访问链接，不得篡改、删减原文内容后伪装为原创发布。</li></ul></li>',
      '<li>社交媒体、技术社区等平台合理引用本站少量内容，需遵守上述署名、留来源链接规则，单次引用不得超过原文完整篇幅的30%。</li>',
      '</ol>',
      '<h3>3. 开源与第三方素材说明</h3>',
      '<ol>',
      '<li>本站部分图标、前端框架、开源工具、第三方开源代码片段遵循对应开源协议使用，相关知识产权归原开源作者所有，本站仅做合规学习部署使用。</li>',
      '<li>站内标注转载的文章、图片、素材，版权归原作者所有，本站仅做知识分享用途；若权利人发现本站存在侵权内容，可联系站长，本站会在24小时内完成侵权内容下架、删除处理。</li>',
      '</ol>',
      '<h3>4. 侵权投诉方式</h3>',
      '<p>如您发现本站存在侵犯您著作权、肖像权等合法权益的内容，可通过留言方式联系站长，提交权属证明、侵权位置等材料，本站核实后将第一时间处理侵权内容；若您违反本版权声明擅自商用、洗稿篡改本站原创内容，本站将依法维护自身著作权，追究侵权方相关法律责任。</p>',
      '</article>'
    ].join('')
  };
  var legalPolicySummaries = [
    {
      id: 'privacy-policy',
      title: '隐私条款'
    },
    {
      id: 'terms-of-service',
      title: '服务条款'
    },
    {
      id: 'copyright-notice',
      title: '版权说明'
    }
  ];
  var initialPictureNames = (assets.pictures || []).map(function(picture) {
    return picture.name;
  });

  function icon(name) {
    var paths = {
      play: '<path d="M7 5v14l11-7z"></path>',
      pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"></path>',
      prev: '<path d="M6 6h2v12H6zM9 12l9 6V6z"></path>',
      next: '<path d="M16 6h2v12h-2zM6 18l9-6-9-6z"></path>',
      music: '<path d="M9 18V5l10-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="16" cy="16" r="3"></circle>',
      chevronDown: '<path d="M7.4 9.8 12 14.4l4.6-4.6 1.4 1.4-6 6-6-6z"></path>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + '</svg>';
  }

  function getStored() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (err) {
      return {};
    }
  }

  function setStored(value) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (err) {}
  }

  function getVisitStored() {
    try {
      return JSON.parse(localStorage.getItem(visitStorageKey) || '{}');
    } catch (err) {
      return {};
    }
  }

  function setVisitStored(value) {
    try {
      localStorage.setItem(visitStorageKey, JSON.stringify(value));
    } catch (err) {}
  }

  function getPetStored() {
    try {
      return JSON.parse(localStorage.getItem(petStorageKey) || '{}');
    } catch (err) {
      return {};
    }
  }

  function setPetStored(value) {
    try {
      localStorage.setItem(petStorageKey, JSON.stringify(value));
    } catch (err) {}
  }

  function getTaskStored() {
    try {
      return JSON.parse(localStorage.getItem(taskStorageKey) || '{}');
    } catch (err) {
      return {};
    }
  }

  function setTaskStored(value) {
    try {
      localStorage.setItem(taskStorageKey, JSON.stringify(value));
    } catch (err) {}
  }

  function getLegalConsentStored() {
    try {
      return JSON.parse(localStorage.getItem(legalConsentStorageKey) || '{}');
    } catch (err) {
      return {};
    }
  }

  function setLegalConsentStored(value) {
    try {
      localStorage.setItem(legalConsentStorageKey, JSON.stringify(value));
    } catch (err) {}
  }

  function getHomeIntroStored() {
    try {
      return JSON.parse(sessionStorage.getItem(homeIntroStorageKey) || '{}');
    } catch (err) {
      return {};
    }
  }

  function setHomeIntroStored(value) {
    try {
      sessionStorage.setItem(homeIntroStorageKey, JSON.stringify(value));
    } catch (err) {}
  }

  function localDateKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function normalizeIndex(index, length) {
    if (!length) return 0;
    return (index + length) % length;
  }

  function musicSignature() {
    return (assets.music || []).map(function(track) {
      return [track.name || '', track.title || '', track.url || ''].join('|');
    }).join('||');
  }

  function runWhenIdle(callback, timeout) {
    if ('requestIdleCallback' in window) {
      return window.requestIdleCallback(callback, { timeout: timeout || 1600 });
    }

    return window.setTimeout(callback, 0);
  }

  function loadScriptOnce(src) {
    return new Promise(function(resolve, reject) {
      var existing = Array.prototype.slice.call(document.scripts).find(function(script) {
        return script.src === src || script.getAttribute('src') === src;
      });

      if (existing) {
        if (existing.dataset.loaded === 'true') {
          resolve();
          return;
        }
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = function() {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function getSiteData() {
    if (window.DREAM_SITE_DATA) {
      return Promise.resolve(window.DREAM_SITE_DATA);
    }

    if (!siteDataPromise) {
      siteDataPromise = loadScriptOnce(siteAssetUrl('js/dream-site-data.js')).then(function() {
        return window.DREAM_SITE_DATA || {};
      }).catch(function(error) {
        console.warn('Dream site data failed:', error);
        return {};
      });
    }

    return siteDataPromise;
  }

  function pickBackgrounds() {
    if (!assets.pictures || assets.pictures.length === 0) return;

    var path = window.location.pathname || '';
    var seed = 0;
    for (var i = 0; i < path.length; i += 1) {
      seed += path.charCodeAt(i);
    }
    var current = seed % assets.pictures.length;
    var next = (current + 1) % assets.pictures.length;
    var currentUrl = 'url("' + assets.pictures[current].url + '")';

    root.style.setProperty('--dream-bg-image', currentUrl);
    root.style.setProperty('--dream-bg-image-next', 'none');

    var banner = document.getElementById('banner');
    if (banner) {
      var inlineStyle = banner.getAttribute('style') || '';
      if (!/background\s*:|background-image\s*:/i.test(inlineStyle)) {
        banner.style.backgroundImage = currentUrl;
      }
    }

    runWhenIdle(function() {
      if (!assets.pictures || assets.pictures.length < 2) return;
      root.style.setProperty('--dream-bg-image-next', 'url("' + assets.pictures[next].url + '")');
    }, 2200);
  }

  function pictureNameFromUrl(value) {
    if (!value) return '';
    try {
      var url = new URL(value, window.location.href);
      return decodeURIComponent(url.pathname.split('/').pop() || '');
    } catch (err) {
      return decodeURIComponent(String(value).split('/').pop().split('?')[0] || '');
    }
  }

  function constrainListingImages() {
    if (!assets.pictures || assets.pictures.length === 0) return;

    var allowed = new Set(initialPictureNames);
    var cards = Array.prototype.slice.call(document.querySelectorAll('.index-card .index-img img'));
    cards.forEach(function(img, index) {
      var currentSrc = img.getAttribute('src') || img.currentSrc || '';
      if (/\/assets\/picture\//.test(currentSrc)) return;

      var currentName = pictureNameFromUrl(currentSrc);
      if (!currentName || allowed.has(currentName)) return;

      var fallback = assets.pictures[index % assets.pictures.length];
      if (!fallback || !fallback.url) return;

      img.setAttribute('src', fallback.url);
      img.removeAttribute('srcset');
      img.removeAttribute('lazyload');
    });
  }

  function parseCardDate(card) {
    var time = card.querySelector('.post-meta time[datetime], time[datetime], .post-meta time');
    if (!time) return null;

    var value = time.getAttribute('datetime') || time.textContent || '';
    var match = String(value).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;

    return {
      year: match[1],
      month: match[2],
      day: match[3],
      monthKey: match[1] + '-' + match[2],
      dayKey: match[1] + '-' + match[2] + '-' + match[3]
    };
  }

  function groupIndexCardsByDate() {
    if (!document.body.classList.contains('home')) return;

    var cards = Array.prototype.slice.call(document.querySelectorAll('.index-card'));
    if (!cards.length) return;

    document.querySelectorAll('.dream-archive-month, .dream-archive-day').forEach(function(marker) {
      marker.parentNode.removeChild(marker);
    });

    var monthCounts = {};
    cards.forEach(function(card) {
      var date = parseCardDate(card);
      if (!date) return;
      monthCounts[date.monthKey] = (monthCounts[date.monthKey] || 0) + 1;
    });

    var lastMonth = '';
    var lastDay = '';
    cards.forEach(function(card, index) {
      var date = parseCardDate(card);
      if (!date) return;

      if (index === 0) {
        card.classList.add('dream-visible');
      }

      if (date.monthKey !== lastMonth) {
        var month = document.createElement('div');
        month.className = 'dream-archive-month';
        month.setAttribute('role', 'heading');
        month.setAttribute('aria-level', '2');
        month.innerHTML = '<span>' + date.year + '年' + date.month + '月</span><small>共 ' + monthCounts[date.monthKey] + ' 篇</small>';
        card.parentNode.insertBefore(month, card);
        lastMonth = date.monthKey;
        lastDay = '';
      }

      if (date.dayKey !== lastDay) {
        var day = document.createElement('div');
        day.className = 'dream-archive-day';
        day.innerHTML = '<time datetime="' + date.dayKey + '">' + date.month + '月' + date.day + '日</time>';
        card.parentNode.insertBefore(day, card);
        lastDay = date.dayKey;
      }
    });
  }

  function siteAssetUrl(assetPath) {
    var script = document.querySelector('script[src*="/js/dream-fluid.js"], script[src*="/js/dream-theme-manifest.js"]');
    var rootPath = '/';
    if (script) {
      var src = script.getAttribute('src') || '';
      var match = src.match(/^(.*\/)js\/[^/]+(?:\?.*)?$/);
      if (match) {
        rootPath = match[1];
      }
    } else if (assets.pictures && assets.pictures.length && assets.pictures[0].url) {
      rootPath = String(assets.pictures[0].url).replace(/assets\/picture\/.*$/, '');
    }
    return rootPath.replace(/\/?$/, '/') + assetPath.replace(/^\//, '');
  }

  function normalizedCurrentPath() {
    return decodeURI((window.location.pathname || '/').replace(/\/*(index.html)?$/, '/'));
  }

  function isPostPath() {
    return /\/\d{4}\/\d{2}\/\d{2}\//.test(window.location.pathname || '');
  }

  function escapeAttribute(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function chinaDateKey() {
    var now = new Date();
    var utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    var china = new Date(utcTime + 8 * 60 * 60000);
    return [
      china.getFullYear(),
      String(china.getMonth() + 1).padStart(2, '0'),
      String(china.getDate()).padStart(2, '0')
    ].join('-');
  }

  function ensureWalineCounter(selector, attrName, path) {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));

    if (!nodes.length) {
      var holder = document.querySelector('[data-dream-hidden-counters]');
      if (!holder) {
        holder = document.createElement('div');
        holder.setAttribute('data-dream-hidden-counters', '');
        holder.hidden = true;
        document.body.appendChild(holder);
      }

      var node = document.createElement('span');
      node.className = 'waline-pageview-count';
      node.setAttribute(attrName, '');
      holder.appendChild(node);
      nodes = [node];
    }

    nodes.forEach(function(node) {
      node.setAttribute('data-path', path);
    });
  }

  function appendPostPageview(path) {
    if (!isPostPath() || document.querySelector('.dream-pageview-meta')) return false;

    var metaRow = document.querySelector('.banner-text .mt-1');
    if (!metaRow) return false;

    var item = document.createElement('span');
    item.className = 'post-meta mr-2 dream-pageview-meta';
    item.innerHTML = [
      '<i class="iconfont icon-eye" aria-hidden="true"></i>',
      ' 阅读 ',
      '<span class="waline-pageview-count" data-dream-article-view data-path="' + escapeAttribute(path) + '">--</span>'
    ].join('');
    metaRow.appendChild(item);
    return true;
  }

  function hasAcceptedLegalConsent() {
    var stored = getLegalConsentStored();
    return stored && stored.version === legalConsentVersion && stored.accepted === true;
  }

  function closeCurrentPage() {
    try {
      window.open('about:blank', '_self');
    } catch (err) {}
    try {
      window.close();
    } catch (err) {}
    window.setTimeout(function() {
      if (!document.hidden) {
        window.location.replace('about:blank');
      }
    }, 120);
  }

  function unlockLegalConsentGate() {
    document.body.classList.remove('dream-consent-locked');
    var gate = document.querySelector('.dream-consent-gate');
    if (gate && gate.parentNode) {
      gate.parentNode.removeChild(gate);
    }
  }

  function buildLegalConsentGate() {
    var gate = document.createElement('div');
    gate.className = 'dream-consent-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'dream-consent-title');
    gate.innerHTML = [
      '<div class="dream-consent-panel">',
        '<h2 id="dream-consent-title">访问确认</h2>',
        '<p class="dream-consent-intro">为使站点的展示、留言与互动使用更清晰可控，本站在首次访问或条款更新后，会要求你先确认隐私条款、服务条款与版权说明，再继续浏览页面内容。</p>',
        '<div class="dream-consent-grid">',
          '<div class="dream-consent-item">',
            '<strong>隐私条款</strong>',
            '<p>本站仅在必要范围内处理访问日志、基础统计与访客主动提交的留言信息，不向无关第三方出售个人数据。</p>',
          '</div>',
          '<div class="dream-consent-item">',
            '<strong>服务条款</strong>',
            '<p>本站属于个人非经营性内容站点，不提供交易、托管或专业意见保证，禁止恶意抓取、滥用接口与违法互动内容。</p>',
          '</div>',
          '<div class="dream-consent-item">',
            '<strong>版权说明</strong>',
            '<p>除特别标注外，原创文章、页面文案与站点整理内容归本站主办者所有；非商业引用请保留来源与原始链接。</p>',
          '</div>',
        '</div>',
        '<div class="dream-consent-links">',
          '<button type="button" class="dream-consent-link" data-consent-legal-open="privacy-policy">查看隐私条款</button>',
          '<button type="button" class="dream-consent-link" data-consent-legal-open="terms-of-service">查看服务条款</button>',
          '<button type="button" class="dream-consent-link" data-consent-legal-open="copyright-notice">查看版权说明</button>',
        '</div>',
        '<label class="dream-consent-check">',
          '<input type="checkbox" data-dream-consent-check>',
          '<span>我已阅读并同意本站的隐私条款、服务条款与版权说明，理解留言、互动和转载应在合法、克制与注明来源的前提下进行。</span>',
        '</label>',
        '<div class="dream-consent-actions">',
          '<button type="button" class="dream-consent-btn is-primary" data-dream-consent-accept disabled>同意并进入网站</button>',
          '<button type="button" class="dream-consent-btn" data-dream-consent-decline>暂不进入</button>',
        '</div>',
        '<p class="dream-consent-note" data-dream-consent-note>本确认仅用于站点访问规则留痕。若后续条款更新，系统会再次请求确认。</p>',
      '</div>'
    ].join('');
    return gate;
  }

  function initLegalConsentGate() {
    if (hasAcceptedLegalConsent()) {
      unlockLegalConsentGate();
      return;
    }

    document.body.classList.add('dream-consent-locked');

    var gate = document.querySelector('.dream-consent-gate');
    if (!gate) {
      gate = buildLegalConsentGate();
      document.body.appendChild(gate);
    }

    var checkbox = gate.querySelector('[data-dream-consent-check]');
    var accept = gate.querySelector('[data-dream-consent-accept]');
    var decline = gate.querySelector('[data-dream-consent-decline]');
    var note = gate.querySelector('[data-dream-consent-note]');
    var legalLinks = Array.prototype.slice.call(gate.querySelectorAll('[data-consent-legal-open]'));

    if (!checkbox || !accept || !decline || !note) return;

    accept.disabled = !checkbox.checked;

    checkbox.addEventListener('change', function() {
      accept.disabled = !checkbox.checked;
      if (checkbox.checked) {
        note.textContent = '确认后将记录当前条款版本，并允许继续访问站点内容。';
      } else {
        note.textContent = '本确认仅用于站点访问规则留痕。若后续条款更新，系统会再次请求确认。';
      }
    });

    accept.addEventListener('click', function() {
      if (!checkbox.checked) return;
      setLegalConsentStored({
        accepted: true,
        version: legalConsentVersion,
        acceptedAt: new Date().toISOString()
      });
      unlockLegalConsentGate();
      initHomeAutoScroll();
      startDeferredHomeFeatures();
    });

    decline.addEventListener('click', function() {
      checkbox.checked = false;
      accept.disabled = true;
      note.textContent = '你尚未同意本站条款，因此页面内容继续保持不可访问状态。准备好后勾选同意并继续。';
      closeCurrentPage();
    });

    legalLinks.forEach(function(button) {
      button.addEventListener('click', function() {
        var policyKey = button.getAttribute('data-consent-legal-open');
        if (!policyKey) return;
        openLegalModal(policyKey, { overConsent: true });
      });
    });
  }

  function closeLegalModal() {
    document.body.classList.remove('dream-consent-locked');
    var modal = document.querySelector('.dream-legal-modal');
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    if (/^#(privacy-policy|terms-of-service|copyright-notice)$/.test(window.location.hash || '')) {
      history.replaceState(history.state || {}, '', window.location.pathname + window.location.search);
    }
  }

  function openLegalModal(policyKey, options) {
    options = options || {};
    var template = legalPolicyTemplates[policyKey];
    if (!template) return;

    closeLegalModal();
    document.body.classList.add('dream-consent-locked');

    var modal = document.createElement('div');
    modal.className = 'dream-legal-modal';
    if (options.overConsent) {
      modal.classList.add('is-over-consent');
    }
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = [
      '<div class="dream-legal-modal__panel">',
        '<div class="dream-legal-modal__head">',
          '<h2>完整条款</h2>',
          '<button type="button" class="dream-legal-modal__close" data-legal-close aria-label="关闭">×</button>',
        '</div>',
        '<div class="dream-legal-modal__body"></div>',
      '</div>'
    ].join('');

    var body = modal.querySelector('.dream-legal-modal__body');
    if (!body) return;

    body.innerHTML = template;
    document.body.appendChild(modal);

    var closeBtn = modal.querySelector('[data-legal-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeLegalModal);
    }

    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        closeLegalModal();
      }
    });
  }

  function initAboutLegalPolicy() {
    var root = document.querySelector('[data-about-legal-grid]');
    if (!root) return;

    if (!root.children.length) {
      root.innerHTML = legalPolicySummaries.map(function(item) {
        return [
          '<button class="about-legal-entry" type="button" id="' + item.id + '" data-legal-open="' + item.id + '">',
            item.title,
          '</button>'
        ].join('');
      }).join('');
    }

    Array.prototype.slice.call(root.querySelectorAll('[data-legal-open]')).forEach(function(button) {
      button.addEventListener('click', function() {
        var policyKey = button.getAttribute('data-legal-open');
        if (!policyKey) return;
        openLegalModal(policyKey);
      });
    });

    var hash = (window.location.hash || '').replace(/^#/, '');
    if (hash === 'privacy-policy' || hash === 'terms-of-service' || hash === 'copyright-notice') {
      openLegalModal(hash);
    }
  }

  function shouldInitWalineCounters() {
    if (isPostPath()) return true;
    return Boolean(
      document.querySelector('[data-dream-visit-total]') ||
      document.querySelector('[data-dream-visit-today]') ||
      document.querySelector('[data-dream-visitor-total]') ||
      document.querySelector('[data-dream-visitor-today]')
    );
  }

  function setCounterText(selector, text) {
    Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function(node) {
      node.textContent = text;
    });
  }

  function initWalineCountersLegacy() {
    if (!walineServerURL) return;

    var oldHolder = document.querySelector('[data-dream-hidden-counters]');
    if (oldHolder && oldHolder.parentNode) {
      oldHolder.parentNode.removeChild(oldHolder);
    }

    var currentPath = normalizedCurrentPath();
    var totalPath = '/__site_total__';
    var todayPath = '/__site_daily__/' + chinaDateKey();
    var counters = [
      { path: totalPath, selector: '[data-dream-visit-total]' },
      { path: todayPath, selector: '[data-dream-visit-today]' }
    ];

    ensureWalineCounter('[data-dream-visit-total]', 'data-dream-visit-total', totalPath);
    ensureWalineCounter('[data-dream-visit-today]', 'data-dream-visit-today', todayPath);
    setCounterText('[data-dream-visit-total], [data-dream-visit-today]', '加载中');

    if (appendPostPageview(currentPath)) {
      counters.push({ path: currentPath, selector: '[data-dream-article-view]' });
    }

    runWhenIdle(function() {
      import(siteAssetUrl('js/vendor/waline/pageview.js'))
      .then(function(module) {
        if (!module || !module.pageviewCount) return;
        counters.forEach(function(counter) {
          module.pageviewCount({
            serverURL: walineServerURL,
            path: counter.path,
            selector: counter.selector,
            update: true,
            lang: 'zh-CN'
          });
        });
      })
      .catch(function(error) {
        setCounterText('[data-dream-visit-total], [data-dream-visit-today]', '暂不可用');
        console.warn('Waline pageview failed:', error);
      });
    }, 1800);
  }

  function initWalineCounters() {
    if (!walineServerURL) return;
    if (!shouldInitWalineCounters()) return;

    var oldHolder = document.querySelector('[data-dream-hidden-counters]');
    if (oldHolder && oldHolder.parentNode) {
      oldHolder.parentNode.removeChild(oldHolder);
    }

    var currentPath = normalizedCurrentPath();
    var todayKey = chinaDateKey();
    var totalPath = '/__site_total__';
    var todayPath = '/__site_daily__/' + todayKey;
    var totalVisitorPath = '/__site_unique_total__';
    var todayVisitorPath = '/__site_unique_daily__/' + todayKey;
    var visitorState = getVisitStored();
    var shouldUpdateTotalVisitor = visitorState.total !== true;
    var shouldUpdateTodayVisitor = visitorState.date !== todayKey;
    var counterLoadingSelector = [
      '[data-dream-visit-total]',
      '[data-dream-visit-today]',
      '[data-dream-visitor-total]',
      '[data-dream-visitor-today]'
    ].join(', ');
    var counters = [
      { path: totalPath, selector: '[data-dream-visit-total]' },
      { path: todayPath, selector: '[data-dream-visit-today]' },
      { path: totalVisitorPath, selector: '[data-dream-visitor-total]', update: shouldUpdateTotalVisitor },
      { path: todayVisitorPath, selector: '[data-dream-visitor-today]', update: shouldUpdateTodayVisitor }
    ];

    ensureWalineCounter('[data-dream-visit-total]', 'data-dream-visit-total', totalPath);
    ensureWalineCounter('[data-dream-visit-today]', 'data-dream-visit-today', todayPath);
    ensureWalineCounter('[data-dream-visitor-total]', 'data-dream-visitor-total', totalVisitorPath);
    ensureWalineCounter('[data-dream-visitor-today]', 'data-dream-visitor-today', todayVisitorPath);
    setCounterText(counterLoadingSelector, '加载中');

    if (appendPostPageview(currentPath)) {
      counters.push({ path: currentPath, selector: '[data-dream-article-view]' });
    }

    runWhenIdle(function() {
      import(siteAssetUrl('js/vendor/waline/pageview.js'))
      .then(function(module) {
        if (!module || !module.pageviewCount) return;
        counters.forEach(function(counter) {
          module.pageviewCount({
            serverURL: walineServerURL,
            path: counter.path,
            selector: counter.selector,
            update: counter.update !== false,
            lang: 'zh-CN'
          });
        });
        if (shouldUpdateTotalVisitor || shouldUpdateTodayVisitor) {
          visitorState.total = true;
          visitorState.date = todayKey;
          setVisitStored(visitorState);
        }
      })
      .catch(function(error) {
        setCounterText(counterLoadingSelector, '暂不可用');
        console.warn('Waline pageview failed:', error);
      });
    }, 1800);
  }

  function createHomeProfile() {
    if (!document.body.classList.contains('home')) return;
    if (document.querySelector('.dream-profile-col')) return;

    var firstCard = document.querySelector('.index-card');
    if (!firstCard) return;

    var postsCol = firstCard.closest('.col-12');
    var layoutRow = postsCol && postsCol.parentNode;
    if (!postsCol || !layoutRow || !layoutRow.classList || !layoutRow.classList.contains('row')) return;

    layoutRow.classList.add('dream-home-layout', 'align-items-start');
    postsCol.classList.remove('col-md-10', 'm-auto');
    postsCol.classList.add('dream-home-posts', 'col-lg-7');

    var profile = document.createElement('aside');
    profile.className = 'col-12 col-lg-4 dream-profile-col';
    profile.innerHTML = [
      '<div class="dream-profile-stack">',
      '<section class="dream-profile-card" aria-label="profile">',
      '<div class="dream-profile-avatar-wrap">',
      '<img class="dream-profile-avatar" src="' + siteAssetUrl('assets/picture/头像背面.jpeg') + '" alt="&#x5C0F;&#x5446;&#x5446;">',
      '</div>',
      '<div class="dream-profile-copy">',
      '<h2 class="dream-profile-name">&#x5C0F;&#x5446;&#x5446;</h2>',
      '<span class="dream-profile-line" aria-hidden="true"></span>',
      '<p class="dream-profile-bio">&#x96EA;&#x843D;&#x65F6;&#xFF0C;&#x7709;&#x776B;&#x4E0A;&#x7684;&#x94F6;&#x6CB3;&#x51DD;&#x56FA;&#x6210;&#x4F60;&#x540D;&#x5B57;&#x7684;&#x661F;&#x5B50;&#xFF1B;<br>&#x6F6E;&#x6C50;&#x9000;&#x53BB;&#xFF0C;&#x8D1D;&#x58F3;&#x6DF1;&#x5904;&#x8FD8;&#x54CD;&#x7740;&#x4F60;&#x672A;&#x8BF4;&#x51FA;&#x53E3;&#x7684;&#x9ECE;&#x660E;</p>',
      '</div>',
      '</section>',
      '</div>'
    ].join('');

    var spacer = document.createElement('div');
    spacer.className = 'd-none d-lg-block col-lg-1 dream-home-gap';

    layoutRow.insertBefore(profile, postsCol);
    layoutRow.insertBefore(spacer, postsCol);
  }

  function cancelHomeAutoScroll() {
    if (!homeAutoScrollState) return;
    if (homeAutoScrollState.timer) {
      window.clearTimeout(homeAutoScrollState.timer);
    }
    homeAutoScrollState.cleanup.forEach(function(cleanup) {
      cleanup();
    });
    homeAutoScrollState = null;
  }

  function initHomeAutoScroll() {
    cancelHomeAutoScroll();
    if (!document.body.classList.contains('home')) return;
    if (document.body.classList.contains('dream-consent-locked')) return;
    if ((window.location.hash || '') !== '') return;
    if (window.scrollY > 8) return;

    var board = document.getElementById('board');
    if (!board) return;

    var cancelled = false;
    var cleanup = [];
    var cancel = function() {
      cancelled = true;
      cancelHomeAutoScroll();
    };

    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function(eventName) {
      var handler = function() {
        cancel();
      };
      window.addEventListener(eventName, handler, { once: true, passive: true });
      cleanup.push(function() {
        window.removeEventListener(eventName, handler, { once: true, passive: true });
      });
    });

    var timer = window.setTimeout(function() {
      if (cancelled || window.scrollY > 8) {
        cancelHomeAutoScroll();
        return;
      }
      var targetTop = Math.max(0, board.getBoundingClientRect().top + window.scrollY - 24);
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
      window.setTimeout(cancelHomeAutoScroll, 1200);
    }, 1800);

    homeAutoScrollState = {
      timer: timer,
      cleanup: cleanup
    };
  }

  function startDeferredHomeFeatures() {
    if (deferredHomeFeaturesStarted) return;
    if (document.body.classList.contains('dream-consent-locked')) return;
    deferredHomeFeaturesStarted = true;

    var boot = function() {
      runWhenIdle(function() {
        createPlayer();
        createNetworkPet();
        initWalineCounters();
      }, 2400);
    };

    if (document.readyState === 'complete') {
      boot();
      return;
    }

    window.addEventListener('load', boot, { once: true });
  }

  function createHomeWorldPortal() {
    if (!document.body.classList.contains('home')) return;

    var profileCard = document.querySelector('.dream-profile-stack') || document.querySelector('.dream-profile-card');
    if (!profileCard) return;

    var portal = profileCard.querySelector('.dream-world-entry');
    if (!portal) {
      portal = document.createElement('a');
      portal.className = 'dream-world-entry';
      portal.target = '_blank';
      portal.rel = 'noopener';
      portal.setAttribute('data-no-pjax', '');
      portal.setAttribute('aria-label', '打开3D世界');
      portal.innerHTML = [
        '<span class="dream-world-mark" aria-hidden="true">',
          '<svg viewBox="0 0 24 24">',
            '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z"></path>',
            '<path d="m4 7.5 8 4.5 8-4.5M12 12v9"></path>',
          '</svg>',
        '</span>',
        '<span class="dream-world-copy">',
          '<strong>3D世界</strong>',
          '<small>进入角色场景</small>',
        '</span>',
        '<span class="dream-world-arrow" aria-hidden="true">',
          '<svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"></path></svg>',
        '</span>'
      ].join('');
    }

    portal.href = siteAssetUrl('world/');

    var player = profileCard.querySelector('.dream-player');
    if (player) {
      profileCard.insertBefore(portal, player.nextSibling);
    } else {
      profileCard.appendChild(portal);
    }
  }

  function compareHomeTaskDate(left, right) {
    if (left && right) return left.localeCompare(right);
    if (left) return -1;
    if (right) return 1;
    return 0;
  }

  function compareHomeTaskTime(left, right) {
    if (left && right) return left.localeCompare(right);
    if (left) return -1;
    if (right) return 1;
    return 0;
  }

  function normalizeHomeTasks(tasks) {
    return (Array.isArray(tasks) ? tasks : []).filter(function(task) {
      return task && task.id && task.title;
    }).slice().sort(function(a, b) {
      var completedDelta = Number(Boolean(a.completed)) - Number(Boolean(b.completed));
      if (completedDelta !== 0) return completedDelta;

      var dateDelta = compareHomeTaskDate(String(a.date || ''), String(b.date || ''));
      if (dateDelta !== 0) return dateDelta;

      var timeDelta = compareHomeTaskTime(String(a.startTime || ''), String(b.startTime || ''));
      if (timeDelta !== 0) return timeDelta;

      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
  }

  function isHomeTaskCompleted(task, overrides) {
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, task.id)) {
      return Boolean(overrides[task.id]);
    }
    return Boolean(task.completed);
  }

  function formatHomeTaskTime(task) {
    if (task.startTime && task.endTime) return task.startTime + '-' + task.endTime;
    return task.startTime || task.endTime || '';
  }

  function setHomeTaskCompleted(taskId, completed) {
    var stored = getTaskStored();
    stored[taskId] = Boolean(completed);
    setTaskStored(stored);
  }

  function renderHomeTasksCard(card, tasks) {
    if (!card) return;

    var taskItems = normalizeHomeTasks(tasks);
    var todayKey = localDateKey(new Date());
    var overrides = getTaskStored();
    var todays = taskItems.filter(function(task) {
      return String(task.date || '') === todayKey;
    });
    var visible = todays.length ? todays : taskItems.filter(function(task) {
      return !isHomeTaskCompleted(task, overrides) && String(task.date || '') > todayKey;
    }).slice(0, 3);
    var completedCount = todays.filter(function(task) {
      return isHomeTaskCompleted(task, overrides);
    }).length;
    var progressLabel = todays.length ? (completedCount + '/' + todays.length) : (visible.length ? 'next' : '0/0');
    var helperText = todays.length
      ? '打开主页就能看到今天的安排。'
      : (visible.length ? '今天空着，先看接下来的安排。' : '今天还没有排任务。');

    card.innerHTML = [
      '<div class="dream-task-card-head">',
      '<div>',
      '<span class="dream-task-eyebrow">Planner</span>',
      '<h3>今日计划</h3>',
      '</div>',
      '<span class="dream-task-progress">' + escapeHtml(progressLabel) + '</span>',
      '</div>',
      '<p class="dream-task-summary">' + escapeHtml(helperText) + '</p>',
      visible.length ? '<div class="dream-task-list">' + visible.map(function(task) {
        var completed = isHomeTaskCompleted(task, overrides);
        var meta = [task.date === todayKey ? formatHomeTaskTime(task) : [task.date || '', formatHomeTaskTime(task)].filter(Boolean).join(' '), task.notes || ''].filter(Boolean);
        return [
          '<label class="dream-task-item' + (completed ? ' is-complete' : '') + '">',
          '<input class="dream-task-check" type="checkbox" data-task-check="' + escapeHtml(task.id) + '"' + (completed ? ' checked' : '') + '>',
          '<span class="dream-task-copy">',
          '<span class="dream-task-title-row">',
          '<strong>' + escapeHtml(task.title) + '</strong>',
          formatHomeTaskTime(task) ? '<small>' + escapeHtml(formatHomeTaskTime(task)) + '</small>' : '',
          '</span>',
          meta.length ? '<span class="dream-task-meta">' + escapeHtml(meta.join(' · ')) + '</span>' : '',
          '</span>',
          '</label>'
        ].join('');
      }).join('') + '</div>' : '<div class="dream-task-empty">后台里新增任务后，这里会自动出现。</div>'
    ].join('');

    Array.prototype.slice.call(card.querySelectorAll('[data-task-check]')).forEach(function(input) {
      input.addEventListener('change', function() {
        setHomeTaskCompleted(input.getAttribute('data-task-check'), input.checked);
        renderHomeTasksCard(card, tasks);
      });
    });
  }

  function createHomeTasksCard() {
    if (!document.body.classList.contains('home')) return;

    var profileCard = document.querySelector('.dream-profile-stack') || document.querySelector('.dream-profile-card');
    if (!profileCard || profileCard.querySelector('.dream-task-card')) return;

    var card = document.createElement('section');
    card.className = 'dream-task-card';
    card.setAttribute('aria-label', 'home planner');
    card.innerHTML = [
      '<div class="dream-task-card-head">',
      '<div>',
      '<span class="dream-task-eyebrow">Planner</span>',
      '<h3>今日计划</h3>',
      '</div>',
      '<span class="dream-task-progress">...</span>',
      '</div>',
      '<p class="dream-task-summary">正在读取任务安排...</p>'
    ].join('');

    var worldEntry = profileCard.querySelector('.dream-world-entry');
    if (worldEntry && worldEntry.nextSibling) {
      profileCard.insertBefore(card, worldEntry.nextSibling);
    } else {
      profileCard.appendChild(card);
    }

    getSiteData().then(function(data) {
      renderHomeTasksCard(card, (data || {}).tasks || []);
    }).catch(function(error) {
      console.warn('Home tasks failed:', error);
      card.innerHTML = '<div class="dream-task-empty">任务暂时无法加载。</div>';
    });
  }

  function shiftDateKey(dateKey, amount) {
    var date = new Date(dateKey + 'T00:00:00');
    date.setDate(date.getDate() + amount);
    return localDateKey(date);
  }

  function weekdayFromDateKey(dateKey) {
    var date = new Date(dateKey + 'T00:00:00');
    return Number.isNaN(date.getTime()) ? -1 : date.getDay();
  }

  function taskOccursOnDate(task, dateKey) {
    var taskDate = String(task.date || '');
    var repeatMode = String(task.repeatMode || 'none');
    var repeatUntil = String(task.repeatUntil || '');
    var repeatDays = Array.isArray(task.repeatDays) ? task.repeatDays : [];

    if (repeatMode === 'none') return taskDate ? taskDate === dateKey : false;
    if (!taskDate || dateKey < taskDate) return false;
    if (repeatUntil && dateKey > repeatUntil) return false;
    if (repeatMode === 'daily') return true;
    if (repeatMode === 'weekly') return repeatDays.indexOf(weekdayFromDateKey(dateKey)) >= 0;
    return false;
  }

  function buildTaskOccurrence(task, dateKey) {
    return {
      occurrenceId: String(task.id) + '@' + dateKey,
      taskId: String(task.id),
      date: dateKey,
      title: String(task.title || ''),
      startTime: String(task.startTime || ''),
      endTime: String(task.endTime || ''),
      notes: String(task.notes || ''),
      repeatMode: String(task.repeatMode || 'none'),
      completed: Boolean(task.completed)
    };
  }

  function expandHomeTaskOccurrences(tasks, startDateKey, days) {
    var taskItems = Array.isArray(tasks) ? tasks.filter(function(task) {
      return task && task.id && task.title;
    }) : [];
    var occurrences = [];

    for (var offset = 0; offset < days; offset += 1) {
      var dateKey = shiftDateKey(startDateKey, offset);
      taskItems.forEach(function(task) {
        if (taskOccursOnDate(task, dateKey)) occurrences.push(buildTaskOccurrence(task, dateKey));
      });
    }

    return occurrences.sort(function(a, b) {
      var dateDelta = compareHomeTaskDate(a.date, b.date);
      if (dateDelta !== 0) return dateDelta;
      var timeDelta = compareHomeTaskTime(a.startTime, b.startTime);
      if (timeDelta !== 0) return timeDelta;
      return String(a.taskId).localeCompare(String(b.taskId));
    });
  }

  function isHomeTaskCompleted(task, overrides) {
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, task.occurrenceId)) {
      return Boolean(overrides[task.occurrenceId]);
    }
    return Boolean(task.completed);
  }

  function formatHomeTaskRepeat(task) {
    if (task.repeatMode === 'daily') return 'daily';
    if (task.repeatMode === 'weekly') return 'weekly';
    return '';
  }

  function setHomeTaskCompleted(occurrenceId, completed) {
    var stored = getTaskStored();
    stored[occurrenceId] = Boolean(completed);
    setTaskStored(stored);
  }

  function renderHomeTasksCard(card, tasks) {
    if (!card) return;

    var todayKey = localDateKey(new Date());
    var overrides = getTaskStored();
    var occurrences = expandHomeTaskOccurrences(tasks, todayKey, 14);
    var todays = occurrences.filter(function(task) {
      return task.date === todayKey;
    });
    var visible = todays.length ? todays : occurrences.filter(function(task) {
      return task.date > todayKey || (task.date === todayKey && !isHomeTaskCompleted(task, overrides));
    }).slice(0, 3);
    var completedCount = todays.filter(function(task) {
      return isHomeTaskCompleted(task, overrides);
    }).length;
    var progressLabel = todays.length ? (completedCount + '/' + todays.length) : (visible.length ? 'next' : '0/0');
    var helperText = todays.length
      ? 'Open the homepage to see today\'s plan.'
      : (visible.length ? 'No fixed task today. Here is what comes next.' : 'Add tasks in the admin panel and they will appear here.');

    card.innerHTML = [
      '<div class="dream-task-card-head">',
      '<div>',
      '<span class="dream-task-eyebrow">Planner</span>',
      '<h3>Today</h3>',
      '</div>',
      '<span class="dream-task-progress">' + escapeHtml(progressLabel) + '</span>',
      '</div>',
      '<p class="dream-task-summary">' + escapeHtml(helperText) + '</p>',
      visible.length ? '<div class="dream-task-list">' + visible.map(function(task) {
        var completed = isHomeTaskCompleted(task, overrides);
        var timeLabel = formatHomeTaskTime(task);
        var metaParts = [];
        if (task.date !== todayKey) metaParts.push(task.date);
        if (timeLabel) metaParts.push(timeLabel);
        if (task.notes) metaParts.push(task.notes);
        return [
          '<label class="dream-task-item' + (completed ? ' is-complete' : '') + '">',
          '<input class="dream-task-check" type="checkbox" data-task-check="' + escapeHtml(task.occurrenceId) + '"' + (completed ? ' checked' : '') + '>',
          '<span class="dream-task-copy">',
          '<span class="dream-task-title-row">',
          '<strong>' + escapeHtml(task.title) + '</strong>',
          timeLabel ? '<small>' + escapeHtml(timeLabel) + '</small>' : '',
          '</span>',
          formatHomeTaskRepeat(task) ? '<span class="dream-task-repeat-badge">' + escapeHtml(formatHomeTaskRepeat(task)) + '</span>' : '',
          metaParts.length ? '<span class="dream-task-meta">' + escapeHtml(metaParts.join(' · ')) + '</span>' : '',
          '</span>',
          '</label>'
        ].join('');
      }).join('') + '</div>' : '<div class="dream-task-empty">No tasks yet.</div>'
    ].join('');

    Array.prototype.slice.call(card.querySelectorAll('[data-task-check]')).forEach(function(input) {
      input.addEventListener('change', function() {
        setHomeTaskCompleted(input.getAttribute('data-task-check'), input.checked);
        renderHomeTasksCard(card, tasks);
      });
    });
  }

  function getDailySignList() {
    return Array.isArray(window.DREAM_DAILY_SIGNS) ? window.DREAM_DAILY_SIGNS : [];
  }

  function dailySignStorageKey(dateKey) {
    return 'DreamDailySign:' + dateKey;
  }

  function hashDailySignKey(dateKey) {
    var hash = 0;
    for (var i = 0; i < dateKey.length; i += 1) {
      hash = ((hash << 5) - hash) + dateKey.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getDailySignIndex(dateKey, total) {
    if (!total) return 0;

    var cacheKey = dailySignStorageKey(dateKey);
    try {
      var cached = localStorage.getItem(cacheKey);
      if (cached !== null && cached !== '') {
        var cachedIndex = Number(cached);
        if (Number.isFinite(cachedIndex)) return normalizeIndex(cachedIndex, total);
      }
    } catch (err) {}

    var overrides = {};
    var overrideIndex = Object.prototype.hasOwnProperty.call(overrides, dateKey) ? Number(overrides[dateKey]) : null;
    var index = Number.isFinite(overrideIndex) ? normalizeIndex(overrideIndex, total) : (hashDailySignKey(dateKey) % total);

    try {
      localStorage.setItem(cacheKey, String(index));
    } catch (err) {}

    return index;
  }

  function getDailySignLabel(sign) {
    if (!sign) return '';
    return [sign.name, sign.level].filter(Boolean).join(' · ');
  }

  function pickDailySignPreviewIndex(baseIndex, total) {
    if (total <= 1) return baseIndex;

    var nextIndex = baseIndex;
    for (var attempt = 0; attempt < 6 && nextIndex === baseIndex; attempt += 1) {
      nextIndex = Math.floor(Math.random() * total);
    }

    return nextIndex === baseIndex ? normalizeIndex(baseIndex + 1, total) : nextIndex;
  }

  function renderHomeDailySignCard(card) {
    if (!card) return;

    var signs = getDailySignList();
    if (!signs.length) {
      card.innerHTML = '<div class="dream-sign-empty">每日一签正在加载</div>';
      return;
    }

    var todayKey = localDateKey(new Date());
    var state = card._dailySignState || { stage: 0, previewIndex: null, dateKey: todayKey };
    if (state.dateKey !== todayKey) {
      state.stage = 0;
      state.previewIndex = null;
      state.dateKey = todayKey;
    }

    state.baseIndex = getDailySignIndex(todayKey, signs.length);
    card._dailySignState = state;
    card.dataset.stage = String(state.stage);

    var activeIndex = Number.isFinite(state.previewIndex) ? normalizeIndex(state.previewIndex, signs.length) : state.baseIndex;
    var sign = signs[activeIndex] || signs[state.baseIndex];
    var signatureLabel = getDailySignLabel(sign);

    card.innerHTML = [
      '<div class="dream-sign-head">',
      '<div class="dream-sign-heading">',
      '<span class="dream-sign-eyebrow">每日一签</span>',
      '<div class="dream-sign-number">' + escapeHtml(signatureLabel) + '</div>',
      '</div>',
      '<div class="dream-sign-arrow" aria-hidden="true">▾</div>',
      '</div>',
      '<div class="dream-sign-poem">' + escapeHtml(sign.poem || '') + '</div>',
      '<div class="dream-sign-expand">',
      '<div class="dream-sign-divider"></div>',
      '<div class="dream-sign-explain">' + escapeHtml(sign.explain || '') + '</div>',
      '</div>',
      '<div class="dream-sign-deep">',
      '<div class="dream-sign-suggest"><span class="dream-sign-yi">宜</span><span>' + escapeHtml(sign.suggest || '') + '</span></div>',
      '<button class="dream-sign-reroll" type="button">重求一签</button>',
      '</div>'
    ].join('');

    var reroll = card.querySelector('.dream-sign-reroll');
    if (reroll) {
      reroll.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        state.previewIndex = pickDailySignPreviewIndex(state.baseIndex, signs.length);
        state.stage = 2;
        renderHomeDailySignCard(card);
      });
    }
  }

  function createHomeDailySignCard() {
    if (!document.body.classList.contains('home')) return;

    var profileCard = document.querySelector('.dream-profile-stack') || document.querySelector('.dream-profile-card');
    if (!profileCard || profileCard.querySelector('.dream-daily-sign-card')) return;

    var card = document.createElement('section');
    card.className = 'dream-daily-sign-card';
    card.setAttribute('aria-label', '每日一签');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card._dailySignState = {
      stage: 0,
      previewIndex: null,
      dateKey: localDateKey(new Date())
    };

    card.addEventListener('click', function(event) {
      var rerollButton = event.target && event.target.closest ? event.target.closest('.dream-sign-reroll') : null;
      if (rerollButton) return;

      var state = card._dailySignState || { stage: 0, previewIndex: null, dateKey: localDateKey(new Date()) };
      state.stage = state.stage >= 2 ? 0 : state.stage + 1;
      if (state.stage === 0) state.previewIndex = null;
      card._dailySignState = state;
      renderHomeDailySignCard(card);
    });

    card.addEventListener('keydown', function(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      card.click();
    });

    var taskCard = profileCard.querySelector('.dream-task-card');
    var worldEntry = profileCard.querySelector('.dream-world-entry');
    if (taskCard) {
      profileCard.insertBefore(card, taskCard.nextSibling);
    } else if (worldEntry) {
      profileCard.insertBefore(card, worldEntry.nextSibling);
    } else {
      profileCard.appendChild(card);
    }

    renderHomeDailySignCard(card);
  }

  function friendLinkBranchApiUrl() {
    return 'https://api.github.com/repos/hengjiasteven-dotcom/my-website/contents/source/_data/friends?ref=friend-links';
  }

  function createFriendCard(friend) {
    if (!friend || !friend.name || !friend.url) return null;

    var card = document.createElement('div');
    card.className = 'card col-lg-4 col-md-6 col-sm-12';

    var link = document.createElement('a');
    link.className = 'card-body hover-with-bg';
    link.href = String(friend.url);
    link.target = '_blank';
    link.rel = 'noopener';

    var content = document.createElement('div');
    content.className = 'card-content';

    if (friend.avatar) {
      var avatarWrap = document.createElement('div');
      avatarWrap.className = 'link-avatar my-auto';

      var img = document.createElement('img');
      img.src = String(friend.avatar);
      img.alt = String(friend.name);
      img.onerror = function() {
        this.onerror = null;
        this.src = siteAssetUrl('img/avatar.png');
      };

      avatarWrap.appendChild(img);
      content.appendChild(avatarWrap);
    }

    var text = document.createElement('div');
    text.className = 'link-text';

    var title = document.createElement('div');
    title.className = 'link-title';
    title.textContent = String(friend.name);

    var intro = document.createElement('div');
    intro.className = 'link-intro';
    intro.textContent = String(friend.description || '');

    text.appendChild(title);
    text.appendChild(intro);
    content.appendChild(text);
    link.appendChild(content);
    card.appendChild(link);

    return card;
  }

  function fetchRemoteFriendLinks() {
    if (friendLinksRequest) return friendLinksRequest;

    friendLinksRequest = fetch(friendLinkBranchApiUrl(), {
      headers: {
        'Accept': 'application/vnd.github+json'
      }
    }).then(function(response) {
      if (!response.ok) {
        throw new Error('GitHub API returned ' + response.status);
      }
      return response.json();
    }).then(function(entries) {
      if (!Array.isArray(entries)) return [];

      var files = entries
        .filter(function(entry) {
          return entry && entry.type === 'file' && /\.json$/i.test(entry.name || '') && entry.download_url;
        })
        .sort(function(a, b) {
          return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
        });

      return Promise.all(files.map(function(file) {
        return fetch(file.download_url, {
          headers: {
            'Accept': 'application/json'
          }
        }).then(function(response) {
          if (!response.ok) {
            throw new Error(file.name + ' returned ' + response.status);
          }
          return response.json();
        }).catch(function(error) {
          console.warn('Friend link file failed:', error);
          return null;
        });
      })).then(function(items) {
        return items.filter(function(item) {
          return item && item.name && item.url;
        });
      });
    }).catch(function(error) {
      console.warn('Friend links fetch failed:', error);
      return [];
    });

    return friendLinksRequest;
  }

  function initLinksPage() {
    if (!/\/links\/?$/.test(window.location.pathname || '')) return;

    var linksRoot = document.querySelector('.row.links');
    if (!linksRoot) return;

    fetchRemoteFriendLinks().then(function(friends) {
      if (!friends.length) return;

      linksRoot.innerHTML = '';
      friends.forEach(function(friend) {
        var card = createFriendCard(friend);
        if (card) {
          linksRoot.appendChild(card);
        }
      });
    });
  }

  function addBackgroundLayer() {
    if (document.querySelector('.dream-bg')) return;
    var bg = document.createElement('div');
    bg.className = 'dream-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = '<span class="dream-bg-veil"></span>';
    document.body.insertBefore(bg, document.body.firstChild);
  }

  function markPageType() {
    var path = window.location.pathname;
    if (/\/(\d{4}\/|archives\/|categories\/|tags\/|tools\/|about\/|links\/|message\/)/.test(path)) {
      document.body.classList.remove('home');
    } else {
      document.body.classList.add('home');
    }
  }

  function onScroll() {
    document.body.classList.toggle('dream-scrolled', window.scrollY > 28);
  }

  function clearHomeHeroTyping() {
    while (homeHeroTypingTimers.length) {
      window.clearTimeout(homeHeroTypingTimers.pop());
    }
  }

  function queueHomeHeroTyping(callback, delay) {
    var timer = window.setTimeout(function() {
      homeHeroTypingTimers = homeHeroTypingTimers.filter(function(item) {
        return item !== timer;
      });
      callback();
    }, delay);
    homeHeroTypingTimers.push(timer);
  }

  function typeHeroText(element, text, speed, done) {
    var chars = Array.from(text || '');
    var index = 0;

    element.textContent = '';
    element.setAttribute('aria-label', text || '');
    element.classList.remove('dream-typewriter-caret');
    element.classList.add('dream-typewriter-active');

    if (!chars.length) {
      element.classList.remove('dream-typewriter-active');
      if (done) done();
      return;
    }

    function tick() {
      index += 1;
      element.textContent = chars.slice(0, index).join('');
      if (index < chars.length) {
        queueHomeHeroTyping(tick, speed);
        return;
      }

      element.classList.remove('dream-typewriter-active');
      if (done) {
        queueHomeHeroTyping(done, 180);
      }
    }

    queueHomeHeroTyping(tick, 180);
  }

  function playHomeHeroTypewriter(title, subcopy, bannerText) {
    if (!title || !subcopy || !bannerText) return;
    if (bannerText.getAttribute('data-dream-typewriter') === 'done') return;

    var titleText = title.getAttribute('data-dream-typewriter-text') ||
      title.getAttribute('data-typed-text') ||
      title.textContent.trim();
    var subcopyText = subcopy.getAttribute('data-dream-typewriter-text') ||
      subcopy.textContent.trim();

    bannerText.setAttribute('data-dream-typewriter', 'done');
    title.setAttribute('data-dream-typewriter-text', titleText);
    subcopy.setAttribute('data-dream-typewriter-text', subcopyText);
    clearHomeHeroTyping();
    subcopy.textContent = '';
    subcopy.classList.remove('dream-typewriter-active', 'dream-typewriter-caret');

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      title.textContent = titleText;
      subcopy.textContent = subcopyText;
      return;
    }

    typeHeroText(title, titleText, 58, function() {
      typeHeroText(subcopy, subcopyText, 34, function() {
        subcopy.classList.add('dream-typewriter-caret');
      });
    });
  }

  function removeHomeIntroState(markSeen) {
    var overlay = homeIntroState && homeIntroState.overlay;
    if (homeIntroState && homeIntroState.playTimer) {
      window.clearTimeout(homeIntroState.playTimer);
    }

    if (overlay) {
      overlay.classList.remove('is-visible');
      overlay.classList.add('is-leaving');
      window.setTimeout(function() {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 320);
    }

    if (markSeen) {
      var stored = getHomeIntroStored();
      stored.seen = true;
      stored.updatedAt = '2026-06-18';
      setHomeIntroStored(stored);
    }

    document.body.classList.remove('dream-intro-lock');
    homeIntroState = null;
  }

  function buildHomeIntroOverlay() {
    var overlay = document.querySelector('[data-dream-home-intro]');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'dream-home-intro';
    overlay.setAttribute('data-dream-home-intro', '');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = [
      '<div class="dream-home-intro__backdrop" aria-hidden="true"></div>',
      '<div class="dream-home-intro__shell">',
      '  <div class="dream-home-intro__stage">',
      '    <video class="dream-home-intro__video" muted playsinline preload="auto" src="/video/intro.mp4"></video>',
      '    <div class="dream-home-intro__veil" aria-hidden="true"></div>',
      '    <div class="dream-home-intro__copy">',
      '      <span class="dream-home-intro__eyebrow">HOME INTRO</span>',
      '      <strong class="dream-home-intro__title">青栀札记</strong>',
      '      <span class="dream-home-intro__subcopy">分享技术 · 记录成长 · 思考生活</span>',
      '      <span class="dream-home-intro__meter" aria-hidden="true"><span></span></span>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.insertBefore(overlay, document.body.firstChild);
    return overlay;
  }

  function startHomeIntro() {
    if (!document.body.classList.contains('home')) {
      var staleOverlay = document.querySelector('[data-dream-home-intro]');
      if (staleOverlay && staleOverlay.parentNode) {
        staleOverlay.parentNode.removeChild(staleOverlay);
      }
      document.body.classList.remove('dream-intro-lock');
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      removeHomeIntroState(true);
      return;
    }

    var stored = getHomeIntroStored();
    if (stored && stored.seen) {
      var existingOverlay = document.querySelector('[data-dream-home-intro]');
      if (existingOverlay && existingOverlay.parentNode) {
        existingOverlay.parentNode.removeChild(existingOverlay);
      }
      document.body.classList.remove('dream-intro-lock');
      return;
    }

    if (homeIntroState && homeIntroState.overlay) {
      return;
    }

    var overlay = buildHomeIntroOverlay();
    if (!overlay) return;

    var video = overlay.querySelector('.dream-home-intro__video');
    if (!video) return;

    homeIntroState = {
      overlay: overlay,
      video: video,
      finished: false,
      playTimer: null
    };

    document.body.classList.add('dream-intro-lock');
    overlay.hidden = false;

    window.requestAnimationFrame(function() {
      if (!homeIntroState || homeIntroState.overlay !== overlay) return;
      overlay.classList.add('is-visible');
    });

    function finishIntro() {
      if (!homeIntroState || homeIntroState.finished) return;
      homeIntroState.finished = true;
      removeHomeIntroState(true);
    }

    video.addEventListener('ended', finishIntro, { once: true });
    video.addEventListener('error', finishIntro, { once: true });

    homeIntroState.playTimer = window.setTimeout(function() {
      if (!homeIntroState || homeIntroState.overlay !== overlay || homeIntroState.finished) return;
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function() {});
      }
    }, 0);

    var initialPlayPromise = video.play();
    if (initialPlayPromise && typeof initialPlayPromise.catch === 'function') {
      initialPlayPromise.catch(function() {});
    }
  }

  function enhanceHomeHero() {
    if (!document.body.classList.contains('home')) return;

    var banner = document.getElementById('banner');
    if (banner && !banner.querySelector('.dream-hero-art')) {
      var bannerStyle = window.getComputedStyle(banner);
      var bannerImage = bannerStyle.backgroundImage;
      if (bannerImage && bannerImage !== 'none') {
        root.style.setProperty('--dream-bg-image', bannerImage);
        root.style.setProperty('--dream-bg-image-next', 'none');

        var art = document.createElement('span');
        art.className = 'dream-hero-art';
        art.setAttribute('aria-hidden', 'true');
        art.style.backgroundImage = bannerImage;
        banner.insertBefore(art, banner.firstChild);
        banner.style.backgroundImage = 'none';
      }
    }

    var bannerText = document.querySelector('.banner-text');
    if (!bannerText) return;

    var subtitle = document.getElementById('subtitle');
    if (subtitle) {
      var typedText = subtitle.getAttribute('data-typed-text');
      if (typedText && subtitle.textContent.trim() !== typedText) {
        subtitle.innerHTML = escapeAttribute(typedText).replace(' · 思考生活', '<span class="dream-hero-break"></span> · 思考生活');
      }
    }

    var subcopy = bannerText.querySelector('.dream-hero-subcopy');
    if (!subcopy) {
      subcopy = document.createElement('p');
      subcopy.className = 'dream-hero-subcopy';
      subcopy.textContent = '在代码与文字之间，寻找热爱，保持思考，成为更好的自己。';
      bannerText.appendChild(subcopy);
    }

    playHomeHeroTypewriter(subtitle, subcopy, bannerText);
  }

  function revealCards() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.index-card'));
    if (!cards.length) return;

    if (!('IntersectionObserver' in window)) {
      cards.forEach(function(card) {
        card.classList.add('dream-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('dream-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    cards.forEach(function(card) {
      observer.observe(card);
    });
  }

  function enhanceSearch() {
    var input = document.getElementById('local-search-input');
    var modal = document.getElementById('modalSearch');
    if (!input || !modal) return;

    input.setAttribute('placeholder', '搜索标题、正文、分类或标签');

    if (searchShortcutBound) return;
    searchShortcutBound = true;

    document.addEventListener('keydown', function(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (window.jQuery) {
          window.jQuery('#modalSearch').modal('show');
        }
      }
      if (event.key === 'Escape' && window.jQuery) {
        window.jQuery('#modalSearch').modal('hide');
      }
    });
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('zh-CN');
  }

  function formatMonthLabel(date) {
    return date.getFullYear() + '年 ' + (date.getMonth() + 1) + '月';
  }

  function initAboutDashboard() {
    var statsRoot = document.querySelector('[data-dream-stats]');
    var calendarRoot = document.querySelector('[data-dream-calendar]');
    if (!statsRoot && !calendarRoot) return;

    getSiteData().then(function(data) {
      data = data || {};
    var stats = data.stats || {};
    var calendarData = data.calendar || {};
    var statsRoot = document.querySelector('[data-dream-stats]');

    if (statsRoot) {
      Array.prototype.slice.call(statsRoot.querySelectorAll('[data-stat]')).forEach(function(node) {
        var key = node.getAttribute('data-stat');
        node.textContent = formatNumber(stats[key]);
      });
    }

    var calendarRoot = document.querySelector('[data-dream-calendar]');
    var grid = calendarRoot && calendarRoot.querySelector('[data-calendar-grid]');
    if (!calendarRoot || !grid) return;

    var today = new Date();
    var year = today.getFullYear();
    var month = today.getMonth();
    var first = new Date(year, month, 1);
    var lastDate = new Date(year, month + 1, 0).getDate();
    var offset = first.getDay();
    var labels = ['日', '一', '二', '三', '四', '五', '六'];
    var cells = labels.map(function(label) {
      return '<span class="about-calendar-weekday">' + label + '</span>';
    });

    for (var empty = 0; empty < offset; empty += 1) {
      cells.push('<span class="about-calendar-empty"></span>');
    }

    for (var day = 1; day <= lastDate; day += 1) {
      var key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var info = calendarData[key];
      var classes = ['about-calendar-day'];
      var title = key;
      var inner = String(day);
      if (day === today.getDate()) classes.push('is-today');
      if (info && info.count) {
        classes.push('has-post');
        title += '，' + info.count + ' 篇文章';
        inner += '<span aria-hidden="true"></span>';
      }
      cells.push('<time class="' + classes.join(' ') + '" datetime="' + key + '" title="' + title + '">' + inner + '</time>');
    }

    var heading = calendarRoot.querySelector('[data-calendar-title]') || calendarRoot.querySelector('h2');
    if (heading) heading.textContent = formatMonthLabel(today);
    grid.innerHTML = cells.join('');
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initClassificationTags() {
    if (!/\/categories\/?$/.test(normalizedCurrentPath())) return;
    if (document.querySelector('.category-tags-section')) return;

    var categoryList = document.querySelector('.category-list');
    if (!categoryList) return;

    getSiteData().then(function(data) {
      var tags = Array.isArray((data || {}).tags) ? data.tags : [];
      if (!tags.length || document.querySelector('.category-tags-section')) return;

    var section = document.createElement('section');
    section.className = 'category-tags-section';
    section.innerHTML = [
      '<div class="category-tags-head">',
      '<h2>标签索引</h2>',
      '<p>标签也是一种更细的分类方式，适合从关键词进入文章。</p>',
      '</div>',
      '<div class="category-tags-cloud">',
      tags.map(function(tag) {
        return '<a href="' + escapeAttribute(tag.path) + '">' +
          '<span>' + escapeHtml(tag.name) + '</span>' +
          '<small>' + formatNumber(tag.count) + '</small>' +
        '</a>';
      }).join(''),
      '</div>'
    ].join('');

    categoryList.parentNode.insertBefore(section, categoryList.nextSibling);
    });
  }

  function formatFileSize(bytes) {
    var size = Number(bytes || 0);
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / 1024 / 1024).toFixed(1) + ' MB';
  }

  function fileStem(name) {
    return String(name || 'download').replace(/\.[^.]+$/, '') || 'download';
  }

  function fileExtension(name, fallback) {
    var match = String(name || '').match(/\.([a-z0-9]+)$/i);
    return (match ? match[1].toLowerCase() : fallback) || 'bin';
  }

  function revokeToolUrl(node) {
    var previous = node && node.getAttribute('data-object-url');
    if (previous) {
      URL.revokeObjectURL(previous);
      node.removeAttribute('data-object-url');
    }
  }

  function setToolDownload(link, url, filename) {
    if (!link) return;
    revokeToolUrl(link);
    link.href = url;
    link.download = filename;
    link.hidden = false;
    link.setAttribute('data-object-url', url);
  }

  function setToolPreview(media, url) {
    if (!media) return;
    revokeToolUrl(media);
    media.src = url;
    media.hidden = false;
    media.setAttribute('data-object-url', url);
  }

  function readTextFile(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        resolve(String(reader.result || ''));
      };
      reader.onerror = function() {
        reject(reader.error || new Error('File read failed'));
      };
      reader.readAsText(file);
    });
  }

  function safeMarkdownUrl(value) {
    var url = String(value || '').trim();
    return !url || /^(https?:|mailto:|\/|#|\.\.?\/)/i.test(url);
  }

  function renderMarkdownInline(value) {
    var html = escapeHtml(value);

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, function(match, alt, href) {
      if (!safeMarkdownUrl(href)) return match;
      return '<img src="' + escapeAttribute(href) + '" alt="' + escapeAttribute(alt) + '">';
    });
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, function(match, label, href) {
      if (!safeMarkdownUrl(href)) return match;
      return '<a href="' + escapeAttribute(href) + '" target="_blank" rel="noopener">' + label + '</a>';
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    return html;
  }

  function isMarkdownBlockStart(line) {
    return /^(#{1,6})\s+/.test(line) ||
      /^>\s?/.test(line) ||
      /^([-*+])\s+/.test(line) ||
      /^\d+\.\s+/.test(line) ||
      /^```/.test(line) ||
      /^---+$/.test(line.trim());
  }

  function markdownToHtml(source) {
    var lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
    var html = [];
    var index = 0;

    while (index < lines.length) {
      var line = lines[index];
      var trimmed = line.trim();

      if (!trimmed) {
        index += 1;
        continue;
      }

      if (/^```/.test(trimmed)) {
        var language = trimmed.replace(/^```/, '').trim();
        var code = [];
        index += 1;
        while (index < lines.length && !/^```/.test(lines[index].trim())) {
          code.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        html.push('<pre><code class="language-' + escapeAttribute(language) + '">' + escapeHtml(code.join('\n')) + '</code></pre>');
        continue;
      }

      var heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        var level = heading[1].length;
        html.push('<h' + level + '>' + renderMarkdownInline(heading[2]) + '</h' + level + '>');
        index += 1;
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        html.push('<hr>');
        index += 1;
        continue;
      }

      if (/^>\s?/.test(line)) {
        var quotes = [];
        while (index < lines.length && /^>\s?/.test(lines[index])) {
          quotes.push(lines[index].replace(/^>\s?/, ''));
          index += 1;
        }
        html.push('<blockquote><p>' + renderMarkdownInline(quotes.join('\n')).replace(/\n/g, '<br>') + '</p></blockquote>');
        continue;
      }

      if (/^([-*+])\s+/.test(line)) {
        var bullets = [];
        while (index < lines.length && /^([-*+])\s+/.test(lines[index])) {
          bullets.push(lines[index].replace(/^([-*+])\s+/, ''));
          index += 1;
        }
        html.push('<ul>' + bullets.map(function(item) {
          return '<li>' + renderMarkdownInline(item) + '</li>';
        }).join('') + '</ul>');
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        var ordered = [];
        while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
          ordered.push(lines[index].replace(/^\d+\.\s+/, ''));
          index += 1;
        }
        html.push('<ol>' + ordered.map(function(item) {
          return '<li>' + renderMarkdownInline(item) + '</li>';
        }).join('') + '</ol>');
        continue;
      }

      var paragraph = [line];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isMarkdownBlockStart(lines[index])) {
        paragraph.push(lines[index]);
        index += 1;
      }
      html.push('<p>' + renderMarkdownInline(paragraph.join(' ')) + '</p>');
    }

    return html.join('\n');
  }

  function initMarkdownPreview() {
    var root = document.querySelector('[data-markdown-tool]');
    if (!root) return;

    var input = root.querySelector('[data-markdown-input]');
    var output = root.querySelector('[data-markdown-output]');
    var file = root.querySelector('#markdown-file');
    var clear = root.querySelector('[data-markdown-clear]');
    if (!input || !output) return;

    if (!input.value) {
      input.value = [
        '# Markdown 预览',
        '',
        '在这里输入内容，右侧会即时显示预览。',
        '',
        '- 支持列表',
        '- 支持 **加粗** 和 *斜体*',
        '- 支持链接：[青禾札记](https://xiaodaidai.site/)',
        '',
        '> 愿你的梦里总有星星。',
        '',
        '```js',
        "console.log('Hello, Markdown!');",
        '```'
      ].join('\n');
    }

    function render() {
      output.innerHTML = markdownToHtml(input.value);
    }

    input.addEventListener('input', render);
    if (file) {
      file.addEventListener('change', function() {
        var selected = file.files && file.files[0];
        if (!selected) return;
        readTextFile(selected).then(function(text) {
          input.value = text;
          render();
        }).catch(function() {
          input.value = '文件读取失败，请重试。';
          render();
        });
      });
    }
    if (clear) {
      clear.addEventListener('click', function() {
        input.value = '';
        render();
        input.focus();
      });
    }

    render();
  }

  function initImageConverter() {
    var root = document.querySelector('[data-image-tool]');
    if (!root) return;

    var input = root.querySelector('#image-file');
    var label = root.querySelector('[data-image-file-label]');
    var format = root.querySelector('[data-image-format]');
    var quality = root.querySelector('[data-image-quality]');
    var qualityLabel = root.querySelector('[data-image-quality-label]');
    var button = root.querySelector('[data-image-convert]');
    var status = root.querySelector('[data-image-status]');
    var preview = root.querySelector('[data-image-preview]');
    var download = root.querySelector('[data-image-download]');

    function selectedImage() {
      return input && input.files && input.files[0];
    }

    function updateQualityLabel() {
      if (!quality || !qualityLabel) return;
      qualityLabel.textContent = Math.round(Number(quality.value || 0.92) * 100) + '%';
    }

    function convertImage() {
      var file = selectedImage();
      if (!file) {
        status.textContent = '请先选择一张图片。';
        return;
      }

      var mime = format.value || 'image/png';
      var extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
      var imageUrl = URL.createObjectURL(file);
      var image = new Image();

      button.disabled = true;
      status.textContent = '正在读取图片...';

      image.onload = function() {
        var canvas = document.createElement('canvas');
        var width = image.naturalWidth || image.width;
        var height = image.naturalHeight || image.height;
        canvas.width = width;
        canvas.height = height;

        var context = canvas.getContext('2d');
        if (mime === 'image/jpeg') {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, width, height);
        }
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(imageUrl);

        canvas.toBlob(function(blob) {
          button.disabled = false;
          if (!blob) {
            status.textContent = '当前浏览器不支持转换为这个格式。';
            return;
          }

          var outputUrl = URL.createObjectURL(blob);
          setToolPreview(preview, outputUrl);
          setToolDownload(download, outputUrl, fileStem(file.name) + '.' + extension);
          status.textContent = '转换完成：' + width + ' x ' + height + '，' + formatFileSize(blob.size);
        }, mime, Number(quality.value || 0.92));
      };

      image.onerror = function() {
        URL.revokeObjectURL(imageUrl);
        button.disabled = false;
        status.textContent = '图片读取失败，请换一张图片试试。';
      };

      image.src = imageUrl;
    }

    if (quality) {
      quality.addEventListener('input', updateQualityLabel);
      updateQualityLabel();
    }
    if (input) {
      input.addEventListener('change', function() {
        var file = selectedImage();
        label.textContent = file ? file.name + ' · ' + formatFileSize(file.size) : '支持 png / jpg / webp / gif / bmp，动图会转换为第一帧';
        if (file) status.textContent = '已选择图片，点击开始转换。';
      });
    }
    if (button) {
      button.addEventListener('click', convertImage);
    }
  }

  var audioFFmpegPromise = null;

  function loadAudioFFmpeg(onProgress) {
    if (audioFFmpegPromise) return audioFFmpegPromise;

    audioFFmpegPromise = new Promise(function(resolve, reject) {
      var existing = window.FFmpegWASM;
      if (existing && existing.FFmpeg) {
        resolve(existing);
        return;
      }

      var script = document.createElement('script');
      script.src = siteAssetUrl('js/vendor/ffmpeg/ffmpeg.js');
      script.async = true;
      script.onload = function() {
        if (window.FFmpegWASM && window.FFmpegWASM.FFmpeg) {
          resolve(window.FFmpegWASM);
        } else {
          reject(new Error('转换核心脚本加载后未初始化'));
        }
      };
      script.onerror = function() {
        reject(new Error('转换核心脚本加载失败'));
      };
      document.head.appendChild(script);
    }).then(function(module) {
      var ffmpeg = new module.FFmpeg();
      var coreBase = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

      if (onProgress) {
        ffmpeg.on('progress', function(event) {
          var percent = Math.max(0, Math.min(99, Math.round((event.progress || 0) * 100)));
          onProgress('正在转换音频...' + percent + '%');
        });
      }

      return ffmpeg.load({
        coreURL: coreBase + '/ffmpeg-core.js',
        wasmURL: coreBase + '/ffmpeg-core.wasm'
      }).then(function() {
        return {
          ffmpeg: ffmpeg,
          fetchFile: function(file) {
            return file.arrayBuffer().then(function(buffer) {
              return new Uint8Array(buffer);
            });
          }
        };
      });
    });

    return audioFFmpegPromise;
  }

  function audioMime(format) {
    var types = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      aac: 'audio/aac'
    };
    return types[format] || 'application/octet-stream';
  }

  function audioArgs(format, bitrate) {
    if (format === 'wav') return ['-vn', '-codec:a', 'pcm_s16le'];
    if (format === 'ogg') return ['-vn', '-codec:a', 'libvorbis', '-b:a', bitrate];
    if (format === 'aac') return ['-vn', '-codec:a', 'aac', '-b:a', bitrate];
    return ['-vn', '-codec:a', 'libmp3lame', '-b:a', bitrate];
  }

  function initAudioConverter() {
    var root = document.querySelector('[data-audio-tool]');
    if (!root) return;

    var input = root.querySelector('#audio-file');
    var label = root.querySelector('[data-audio-file-label]');
    var format = root.querySelector('[data-audio-format]');
    var bitrate = root.querySelector('[data-audio-bitrate]');
    var button = root.querySelector('[data-audio-convert]');
    var status = root.querySelector('[data-audio-status]');
    var preview = root.querySelector('[data-audio-preview]');
    var download = root.querySelector('[data-audio-download]');

    function selectedAudio() {
      return input && input.files && input.files[0];
    }

    function setStatus(text) {
      if (status) status.textContent = text;
    }

    if (input) {
      input.addEventListener('change', function() {
        var file = selectedAudio();
        label.textContent = file ? file.name + ' · ' + formatFileSize(file.size) : '支持 mp3 / wav / flac / m4a / aac / ogg 等常见格式';
        setStatus(file ? '已选择音频，点击开始转换。' : '请选择一个音频文件。');
      });
    }

    if (!button) return;

    button.addEventListener('click', function() {
      var file = selectedAudio();
      if (!file) {
        setStatus('请先选择一个音频文件。');
        return;
      }

      var outputFormat = format.value || 'mp3';
      var inputName = 'input-' + Date.now() + '.' + fileExtension(file.name, 'audio');
      var outputName = 'output-' + Date.now() + '.' + outputFormat;

      button.disabled = true;
      setStatus('正在加载音频转换核心，首次使用会慢一点...');

      loadAudioFFmpeg(setStatus).then(function(runtime) {
        setStatus('正在写入音频文件...');
        return runtime.fetchFile(file).then(function(data) {
          return runtime.ffmpeg.writeFile(inputName, data);
        }).then(function() {
          setStatus('正在转换音频...0%');
          return runtime.ffmpeg.exec(['-i', inputName].concat(audioArgs(outputFormat, bitrate.value || '192k'), [outputName]));
        }).then(function() {
          return runtime.ffmpeg.readFile(outputName);
        }).then(function(data) {
          var blob = new Blob([data.buffer], { type: audioMime(outputFormat) });
          var url = URL.createObjectURL(blob);
          setToolPreview(preview, url);
          setToolDownload(download, url, fileStem(file.name) + '.' + outputFormat);
          setStatus('转换完成：' + formatFileSize(blob.size));
        }).finally(function() {
          runtime.ffmpeg.deleteFile(inputName).catch(function() {});
          runtime.ffmpeg.deleteFile(outputName).catch(function() {});
        });
      }).catch(function(error) {
        audioFFmpegPromise = null;
        var detail = error && (error.message || error.toString) ? (error.message || error.toString()) : '';
        console.warn('Audio conversion failed:', error);
        setStatus('音频转换暂时不可用。' + (detail ? '原因：' + detail : '请确认网络可以加载转换核心，或换一个较小的音频文件重试。'));
      }).finally(function() {
        button.disabled = false;
      });
    });
  }

  function initDreamTools() {
    var toolsRoot = document.querySelector('[data-dream-tools]');
    if (!toolsRoot) {
      activeDreamToolShow = null;
      return;
    }

    var cards = Array.prototype.slice.call(toolsRoot.querySelectorAll('[data-tool-open]'));
    var panels = Array.prototype.slice.call(toolsRoot.querySelectorAll('[data-tool-panel]'));
    var intro = toolsRoot.querySelector('.tools-intro');
    var grid = toolsRoot.querySelector('.tools-grid');

    function showTool(id, options) {
      options = options || {};
      var matched = false;

      panels.forEach(function(panel) {
        var active = panel.id === id;
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
        if (active) matched = true;
      });

      cards.forEach(function(card) {
        card.classList.toggle('is-active', card.getAttribute('data-tool-open') === id && matched);
      });

      if (intro) intro.hidden = matched;
      if (grid) grid.hidden = matched;
      toolsRoot.classList.toggle('is-tool-open', matched);

      if (!matched) {
        if (window.location.hash && !options.keepHash) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        return;
      }

      if (!options.keepHash && window.location.hash !== '#' + id) {
        history.pushState(null, '', '#' + id);
      }

      if (options.scroll !== false) {
        toolsRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    activeDreamToolShow = showTool;

    cards.forEach(function(card) {
      if (card.dataset.toolBound === 'true') return;
      card.dataset.toolBound = 'true';
      card.addEventListener('click', function(event) {
        event.preventDefault();
        showTool(card.getAttribute('data-tool-open'));
      });
    });

    panels.forEach(function(panel) {
      var close = panel.querySelector('[data-tool-close]');
      panel.hidden = true;
      if (close && close.dataset.toolBound !== 'true') {
        close.dataset.toolBound = 'true';
        close.addEventListener('click', function() {
          showTool('');
          toolsRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });

    if (!dreamToolsHashBound) {
      dreamToolsHashBound = true;
      window.addEventListener('hashchange', function() {
        if (typeof activeDreamToolShow === 'function') {
          activeDreamToolShow((window.location.hash || '').replace(/^#/, ''), { keepHash: true, scroll: false });
        }
      });
    }

    showTool((window.location.hash || '').replace(/^#/, ''), { keepHash: true, scroll: false });
    initImageConverter();
    initMarkdownPreview();
    initAudioConverter();
  }

  function createNetworkPet() {
    if (document.querySelector('.dream-network-pet')) return;

    var messages = [
      '\u4f60\u597d\uff0c\u6211\u4f4f\u8fdb\u535a\u5ba2\u5566\u3002',
      '\u4eca\u5929\u4e5f\u8981\u597d\u597d\u5199\u4e00\u70b9\u70b9\u3002',
      '\u6211\u5728\u8fd9\u91cc\u966a\u4f60\u5de1\u903b\u9875\u9762\u3002',
      '\u6709\u65b0\u7075\u611f\u7684\u8bdd\uff0c\u5148\u6293\u4f4f\u5b83\u3002',
      '\u6b63\u5728\u770b\u98ce\u666f\u3002'
    ];
    var touchMessages = [
      '\u6478\u6478\u6536\u5230\uff0c\u80fd\u91cf\u52a0\u4e00\u3002',
      '\u6211\u56de\u6765\u5566\u3002',
      '\u62d6\u5230\u559c\u6b22\u7684\u4f4d\u7f6e\uff0c\u53cc\u51fb\u6211\u53ef\u4ee5\u56de\u89d2\u843d\u3002'
    ];
    var state = Object.assign({
      collapsed: false,
      position: null,
      touches: 0,
      lastMessage: '',
      chatHistory: []
    }, getPetStored());
    var pet = document.createElement('section');
    var speechTimer = null;
    var idleTimer = null;
    var sleepTimer = null;
    var dragState = null;
    var suppressClickUntil = 0;
    var lastActionAt = Date.now();

    state.collapsed = Boolean(state.collapsed);
    state.position = normalizePetPosition(state.position);
    state.touches = Math.max(0, Number(state.touches || 0));
    state.chatHistory = normalizeChatHistory(state.chatHistory);

    pet.className = 'dream-network-pet';
    if (state.collapsed) {
      pet.classList.add('is-collapsed');
    }
    pet.setAttribute('aria-label', '\u7f51\u7edc\u5ba0\u7269');
    pet.innerHTML = [
      '<div class="dream-pet-bubble" role="status" aria-live="polite"><span></span></div>',
      '<form class="dream-pet-chatbox" hidden>',
        '<input class="dream-pet-input" type="text" maxlength="120" autocomplete="off" placeholder="\u548c\u5b83\u8bf4\u53e5\u8bdd">',
        '<button class="dream-pet-send" type="submit" aria-label="\u53d1\u9001">\u53d1\u9001</button>',
      '</form>',
      '<div class="dream-pet-shell">',
        '<button class="dream-pet-control dream-pet-home" type="button">',
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 12 6l7 6"></path><path d="M7 11v7h10v-7"></path></svg>',
        '</button>',
        '<button class="dream-pet-control dream-pet-chat" type="button">',
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14v9H9l-4 3v-12Z"></path><path d="M8.5 10h7M8.5 13h4"></path></svg>',
        '</button>',
        '<button class="dream-pet-control dream-pet-toggle" type="button"><span class="dream-pet-toggle-mark" aria-hidden="true"></span></button>',
        '<button class="dream-pet-figure" type="button">',
          '<span class="dream-pet-shadow"></span>',
          '<img class="dream-pet-img dream-pet-img-front" src="' + siteAssetUrl('assets/pet/reg-front.png') + '" alt="\u5ba0\u7269\u6b63\u9762">',
          '<img class="dream-pet-img dream-pet-img-head" src="' + siteAssetUrl('assets/pet/reg-head.png') + '" alt="\u5ba0\u7269\u5934\u50cf">',
          '<span class="dream-pet-sleep-mark" aria-hidden="true">Z</span>',
        '</button>',
      '</div>'
    ].join('');
    document.body.appendChild(pet);

    var bubble = pet.querySelector('.dream-pet-bubble span');
    var figure = pet.querySelector('.dream-pet-figure');
    var toggle = pet.querySelector('.dream-pet-toggle');
    var home = pet.querySelector('.dream-pet-home');
    var chatButton = pet.querySelector('.dream-pet-chat');
    var chatForm = pet.querySelector('.dream-pet-chatbox');
    var chatInput = pet.querySelector('.dream-pet-input');
    var chatSubmit = pet.querySelector('.dream-pet-send');

    figure.setAttribute('aria-label', '\u6478\u6478\u5ba0\u7269');
    figure.title = '\u62d6\u52a8\u5ba0\u7269';
    home.setAttribute('aria-label', '\u5ba0\u7269\u56de\u5230\u89d2\u843d');
    home.title = '\u5ba0\u7269\u56de\u5230\u89d2\u843d';
    chatButton.setAttribute('aria-label', '\u548c\u5ba0\u7269\u804a\u5929');
    chatButton.title = '\u548c\u5ba0\u7269\u804a\u5929';
    updateToggleLabel();

    if (state.position) {
      requestAnimationFrame(function() {
        applyPetPosition(state.position, { save: false });
      });
    }

    function normalizePetPosition(position) {
      if (!position || typeof position !== 'object') return null;

      var x = Number(position.x);
      var y = Number(position.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x: x, y: y };
    }

    function normalizeChatHistory(history) {
      if (!Array.isArray(history)) return [];

      return history.slice(-8).map(function(item) {
        var role = item && item.role === 'assistant' ? 'assistant' : 'user';
        var content = String(item && item.content || '').replace(/\s+/g, ' ').trim().slice(0, 220);
        return content ? { role: role, content: content } : null;
      }).filter(Boolean);
    }

    function petChatEndpoints() {
      var primary = siteAssetUrl('api/pet-chat');
      var fallback = 'https://my-website-zeta-indol-39.vercel.app/api/pet-chat';

      if (primary === fallback) {
        return [primary];
      }

      return [primary, fallback];
    }

    function clampPetPosition(position) {
      var margin = 8;
      var maxX = Math.max(margin, window.innerWidth - pet.offsetWidth - margin);
      var maxY = Math.max(margin, window.innerHeight - pet.offsetHeight - margin);
      return {
        x: Math.min(maxX, Math.max(margin, Number(position.x || 0))),
        y: Math.min(maxY, Math.max(margin, Number(position.y || 0)))
      };
    }

    function pick(list) {
      return list[Math.floor(Math.random() * list.length)] || '';
    }

    function persist(extra) {
      state = Object.assign(state, extra || {});
      state.position = normalizePetPosition(state.position);
      setPetStored({
        collapsed: Boolean(state.collapsed),
        position: state.position,
        touches: Math.max(0, Number(state.touches || 0)),
        lastMessage: state.lastMessage || '',
        chatHistory: normalizeChatHistory(state.chatHistory),
        updatedAt: Date.now()
      });
    }

    function updateToggleLabel() {
      var label = state.collapsed ? '\u53eb\u9192\u5ba0\u7269' : '\u6536\u8d77\u5ba0\u7269';
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }

    function showMessage(text, options) {
      options = options || {};
      if (!text || state.collapsed) return;

      window.clearTimeout(speechTimer);
      state.lastMessage = text;
      bubble.textContent = text;
      pet.classList.add('is-talking');
      speechTimer = window.setTimeout(function() {
        pet.classList.remove('is-talking');
      }, options.duration || 4600);
      persist();
    }

    function wakePet() {
      pet.classList.remove('is-sleeping');
      lastActionAt = Date.now();
      scheduleIdle();
      scheduleSleep();
    }

    function setCollapsed(collapsed) {
      state.collapsed = Boolean(collapsed);
      pet.classList.toggle('is-collapsed', state.collapsed);
      pet.classList.remove('is-talking', 'is-sleeping', 'is-happy');
      updateToggleLabel();
      persist();
      if (state.collapsed) {
        bubble.textContent = '';
        window.clearTimeout(speechTimer);
        closeChat();
        showCollapsedHint();
      } else {
        wakePet();
        showMessage('\u6211\u56de\u6765\u5566\u3002', { duration: 3200 });
      }
    }

    function openChat() {
      if (state.collapsed) {
        setCollapsed(false);
      }
      wakePet();
      pet.classList.add('is-chat-open');
      chatForm.hidden = false;
      window.setTimeout(function() {
        chatInput.focus();
      }, 0);
    }

    function closeChat() {
      pet.classList.remove('is-chat-open', 'is-chat-sending');
      chatForm.hidden = true;
      chatInput.value = '';
      chatInput.disabled = false;
      chatSubmit.disabled = false;
    }

    function toggleChat() {
      if (chatForm.hidden) {
        openChat();
      } else {
        closeChat();
      }
    }

    function setChatSending(sending) {
      pet.classList.toggle('is-chat-sending', sending);
      chatInput.disabled = sending;
      chatSubmit.disabled = sending;
      chatInput.placeholder = sending ? '\u5b83\u6b63\u5728\u614c\u5fd9\u601d\u8003...' : '\u548c\u5b83\u8bf4\u53e5\u8bdd';
    }

    function rememberChat(role, content) {
      state.chatHistory = normalizeChatHistory(state.chatHistory.concat([{
        role: role,
        content: content
      }]));
      persist({ chatHistory: state.chatHistory });
    }

    function fallbackPetReply(error) {
      if (error && error.name === 'AbortError') {
        return '\u600e\u4e48\u529e\u2026\u2026\u6211\u521a\u521a\u60f3\u4e86\u597d\u4e45\uff0c\u597d\u50cf\u8fde\u4e0d\u4e0a\u3002\u6ca1\u4e8b\u7684\uff0c\u7b49\u4e00\u4e0b\u518d\u8bd5\u8bd5\u3002';
      }
      return '\u54a6\u2026\u2026AI\u90a3\u8fb9\u597d\u50cf\u6ca1\u6709\u56de\u5e94\u3002\u6ca1\u4e8b\u7684\uff0c\u6211\u8fd8\u5728\u8fd9\u91cc\u966a\u4f60\u3002';
    }

    function requestPetChat(endpoint, message) {
      var controller = new AbortController();
      var timeout = window.setTimeout(function() {
        controller.abort();
      }, 26000);

      return fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          history: state.chatHistory
        })
      }).then(function(response) {
        return response.json().catch(function() {
          return {};
        }).then(function(data) {
          if (!response.ok) {
            var error = new Error(data.error || 'Pet chat failed');
            error.statusCode = response.status;
            throw error;
          }
          return data.reply || '';
        });
      }).finally(function() {
        window.clearTimeout(timeout);
      });
    }

    function shouldTryPetChatFallback(error) {
      if (!error) return false;
      return error.name === 'TypeError' || error.statusCode === 404 || error.statusCode === 405;
    }

    function sendPetChat(message) {
      var endpoints = petChatEndpoints();
      var index = 0;

      function next() {
        return requestPetChat(endpoints[index], message).catch(function(error) {
          index += 1;
          if (index < endpoints.length && shouldTryPetChatFallback(error)) {
            return next();
          }

          throw error;
        });
      }

      return next();
    }

    function showCollapsedHint() {
      pet.setAttribute('data-pet-hint', '\u53eb\u9192\u5ba0\u7269');
    }

    function resetHome() {
      state.position = null;
      pet.classList.remove('is-drag-positioned', 'is-dragging');
      pet.style.left = '';
      pet.style.top = '';
      pet.style.right = '';
      pet.style.bottom = '';
      wakePet();
      persist({ position: null });
      showMessage('\u5df2\u56de\u5230\u89d2\u843d\u3002', { duration: 3000 });
    }

    function applyPetPosition(position, options) {
      options = options || {};
      if (!position) return;

      var nextPosition = clampPetPosition(position);
      state.position = nextPosition;
      pet.classList.add('is-drag-positioned');
      pet.style.left = nextPosition.x + 'px';
      pet.style.top = nextPosition.y + 'px';
      pet.style.right = 'auto';
      pet.style.bottom = 'auto';
      if (options.save) {
        persist({ position: nextPosition });
      }
    }

    function resetPetPositionIfNeeded() {
      if (state.position) {
        applyPetPosition(state.position, { save: false });
      }
    }

    function scheduleIdle() {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(function() {
        if (!state.collapsed && !pet.classList.contains('is-dragging') && Date.now() - lastActionAt > 14000) {
          showMessage(pick(messages), { duration: 4200 });
        }
        scheduleIdle();
      }, 22000 + Math.floor(Math.random() * 14000));
    }

    function scheduleSleep() {
      window.clearTimeout(sleepTimer);
      sleepTimer = window.setTimeout(function() {
        if (state.collapsed || pet.classList.contains('is-dragging')) return;
        pet.classList.add('is-sleeping');
        showMessage('\u6211\u772f\u4e00\u4f1a\u513f\uff0c\u6709\u4e8b\u70b9\u6211\u3002', { duration: 5200 });
      }, 90000);
    }

    function touchPet() {
      if (Date.now() < suppressClickUntil) return;
      if (state.collapsed) {
        setCollapsed(false);
        return;
      }

      state.touches += 1;
      wakePet();
      pet.classList.add('is-happy');
      window.setTimeout(function() {
        pet.classList.remove('is-happy');
      }, 900);
      showMessage(pick(touchMessages), { duration: 3600 });
      persist({ touches: state.touches });
    }

    function beginDrag(event) {
      if (event.button !== undefined && event.button !== 0) return;

      var target = event.target;
      if (target && target.closest && target.closest('.dream-pet-control')) return;

      var rect = pet.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: rect.left,
        originY: rect.top,
        moved: false
      };
      applyPetPosition({ x: rect.left, y: rect.top }, { save: false });
      wakePet();
      if (pet.setPointerCapture && event.pointerId !== undefined) {
        try {
          pet.setPointerCapture(event.pointerId);
        } catch (err) {}
      }
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      window.addEventListener('blur', endDrag);
      event.preventDefault();
    }

    function onDragMove(event) {
      if (!dragState) return;

      var dx = event.clientX - dragState.startX;
      var dy = event.clientY - dragState.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragState.moved = true;
        pet.classList.add('is-dragging');
      }
      applyPetPosition({
        x: dragState.originX + dx,
        y: dragState.originY + dy
      }, { save: false });
      event.preventDefault();
    }

    function endDrag(event) {
      if (!dragState) return;

      if (dragState.moved) {
        suppressClickUntil = Date.now() + 180;
      }
      if (pet.releasePointerCapture && dragState.pointerId !== undefined) {
        try {
          pet.releasePointerCapture(dragState.pointerId);
        } catch (err) {}
      }
      pet.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('blur', endDrag);
      dragState = null;
      persist({ position: state.position });
      if (event) event.preventDefault();
    }

    pet.addEventListener('pointerdown', beginDrag);
    figure.addEventListener('click', touchPet);
    figure.addEventListener('dblclick', function(event) {
      event.preventDefault();
      resetHome();
    });
    toggle.addEventListener('click', function(event) {
      event.preventDefault();
      setCollapsed(!state.collapsed);
      if (state.collapsed) {
        persist();
      } else {
        showMessage('\u6211\u56de\u6765\u5566\u3002', { duration: 3200 });
      }
    });
    home.addEventListener('click', function(event) {
      event.preventDefault();
      resetHome();
    });
    chatButton.addEventListener('click', function(event) {
      event.preventDefault();
      toggleChat();
    });
    chatForm.addEventListener('submit', function(event) {
      event.preventDefault();
      var text = chatInput.value.replace(/\s+/g, ' ').trim();
      if (!text || pet.classList.contains('is-chat-sending')) return;

      wakePet();
      rememberChat('user', text);
      chatInput.value = '';
      setChatSending(true);
      showMessage('\u600e\u4e48\u529e\u2026\u2026\u6211\u5728\u60f3\uff0c\u522b\u6025\u3002', { duration: 8000 });
      sendPetChat(text).then(function(reply) {
        var message = reply || '\u6ca1\u4e8b\u7684\uff0c\u6211\u5728\u8fd9\u91cc\u3002';
        rememberChat('assistant', message);
        showMessage(message, { duration: 9000 });
      }).catch(function(error) {
        showMessage(fallbackPetReply(error), { duration: 7200 });
      }).finally(function() {
        setChatSending(false);
        if (!chatForm.hidden) {
          chatInput.focus();
        }
      });
    });
    window.addEventListener('resize', resetPetPositionIfNeeded);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        persist();
      }
    });

    scheduleIdle();
    scheduleSleep();
    if (!state.collapsed) {
      window.setTimeout(function() {
        showMessage(state.lastMessage || messages[0], { duration: 3800 });
      }, 900);
    } else {
      showCollapsedHint();
    }
  }

  function createPlayer() {
    if (!assets.music || assets.music.length === 0 || document.querySelector('.dream-player')) return;

    var state = Object.assign({
      index: 0,
      volume: 0.55,
      started: false,
      playing: false,
      currentTime: 0,
      position: null,
      musicSignature: ''
    }, getStored());
    var currentMusicSignature = musicSignature();
    if (state.musicSignature !== currentMusicSignature) {
      state.index = 0;
      state.started = false;
      state.playing = false;
      state.currentTime = 0;
      state.musicSignature = currentMusicSignature;
    }
    var storedWasPlaying = Boolean(state.playing);
    var storedUpdatedAt = Number(state.updatedAt || 0);
    var shouldAutoResume = storedWasPlaying && Date.now() - storedUpdatedAt < 30000;
    var shouldShowResumeHint = Boolean(storedWasPlaying || state.started);

    state.index = normalizeIndex(Number(state.index || 0), assets.music.length);
    state.volume = Math.min(1, Math.max(0, Number(state.volume || 0.55)));
    state.currentTime = Math.max(0, Number(state.currentTime || 0));
    state.playing = shouldAutoResume;
    state.position = normalizePlayerPosition(state.position);

    var player = document.createElement('section');
    player.className = 'dream-player';
    player.setAttribute('aria-label', '背景音乐播放器');
    player.innerHTML =
      '<div class="dream-player-inner">' +
        '<button class="dream-player-drag" type="button" aria-label="拖动播放器" title="拖动播放器，双击归位"><span></span><span></span><span></span></button>' +
        '<button class="dream-player-disc" type="button" aria-label="播放或暂停音乐"></button>' +
        '<div class="dream-player-main">' +
          '<div class="dream-player-title"></div>' +
          '<div class="dream-library">' +
            '<button class="dream-library-toggle" type="button" aria-expanded="false" aria-label="\u6253\u5f00\u66f2\u76ee\u76ee\u5f55">' +
              '<span class="dream-library-toggle-copy">' +
                '<span class="dream-library-label">\u66f2\u76ee\u76ee\u5f55</span>' +
                '<span class="dream-library-current"></span>' +
              '</span>' +
              '<span class="dream-library-toggle-meta">' +
                '<span class="dream-library-count" data-library-count></span>' +
                '<span class="dream-library-caret">' + icon('chevronDown') + '</span>' +
              '</span>' +
            '</button>' +
            '<div class="dream-library-panel" hidden>' +
              '<div class="dream-library-panel-head">' +
                '<strong class="dream-library-panel-title">\u97f3\u4e50\u76ee\u5f55</strong>' +
                '<span class="dream-library-count" data-library-count></span>' +
              '</div>' +
              '<div class="dream-library-list" role="listbox" aria-label="\u97f3\u4e50\u76ee\u5f55"></div>' +
            '</div>' +
            '<select class="dream-track-select" aria-label="Music library" hidden></select>' +
          '</div>' +
          '<div class="dream-player-progress">' +
            '<input class="dream-progress" aria-label="Playback progress" type="range" min="0" max="0" step="0.1" value="0">' +
            '<span class="dream-time">0:00 / 0:00</span>' +
          '</div>' +
          '<div class="dream-player-controls">' +
            '<button class="dream-icon-btn dream-prev" type="button" aria-label="上一首">' + icon('prev') + '</button>' +
            '<button class="dream-icon-btn dream-toggle" type="button" aria-label="播放音乐">' + icon('play') + '</button>' +
            '<button class="dream-icon-btn dream-next" type="button" aria-label="下一首">' + icon('next') + '</button>' +
            '<input class="dream-volume" aria-label="音量" type="range" min="0" max="1" step="0.01">' +
            '<div class="dream-player-wave" aria-hidden="true"><span></span><span></span><span></span></div>' +
          '</div>' +
          '<div class="dream-player-note">点击唱片打开音乐</div>' +
        '</div>' +
      '</div>';

    var audio = document.createElement('audio');
    audio.preload = 'none';
    audio.volume = state.volume;
    player.appendChild(audio);

    var profileCard = currentProfileCard();
    if (profileCard && !state.position) {
      player.classList.add('dream-player-in-profile');
      profileCard.appendChild(player);
    } else {
      document.body.appendChild(player);
    }

    var title = player.querySelector('.dream-player-title');
    var disc = player.querySelector('.dream-player-disc');
    var toggle = player.querySelector('.dream-toggle');
    var prev = player.querySelector('.dream-prev');
    var next = player.querySelector('.dream-next');
    var libraryToggle = player.querySelector('.dream-library-toggle');
    var libraryPanel = player.querySelector('.dream-library-panel');
    var libraryCurrent = player.querySelector('.dream-library-current');
    var libraryList = player.querySelector('.dream-library-list');
    var libraryCount = Array.prototype.slice.call(player.querySelectorAll('[data-library-count]'));
    var trackSelect = player.querySelector('.dream-track-select');
    var progress = player.querySelector('.dream-progress');
    var time = player.querySelector('.dream-time');
    var volume = player.querySelector('.dream-volume');
    var note = player.querySelector('.dream-player-note');
    var dragHandle = player.querySelector('.dream-player-drag');
    var lastProgressSave = 0;
    var isSeeking = false;
    var loadedTrackIndex = -1;
    var loadedTrackUrl = '';
    var pendingRestoreTime = state.currentTime;
    var suppressClickUntil = 0;
    var dragState = null;
    var profilePlaceholder = null;
    var playFallbackTimer = null;
    var playRequested = false;
    var dragCleanupTimer = null;
    var activeReturnTarget = null;

    volume.value = state.volume;

    assets.music.forEach(function(track, index) {
      var option = document.createElement('option');
      option.value = String(index);
      option.textContent = track.title || track.name || ('Track ' + (index + 1));
      trackSelect.appendChild(option);
    });

    function trackLabel(track, index) {
      return (track && (track.title || track.name)) || ('Track ' + (index + 1));
    }

    function trackCatalogMeta(track, index) {
      if (!track) return '';

      var fileName = String(track.name || '').replace(/\.[^.]+$/, '');
      var label = trackLabel(track, index);
      if (!fileName || !label) return '';
      if (fileName.indexOf(label + ' - ') === 0) return fileName.slice(label.length + 3);
      return fileName !== label ? fileName : '';
    }

    function trackCatalogIndex(index) {
      return String(index + 1).padStart(2, '0');
    }

    function trackCatalogCount(total) {
      return total + ' \u9996';
    }

    function setLibraryOpen(open) {
      if (!libraryToggle || !libraryPanel) return;

      var nextOpen = Boolean(open);
      player.classList.toggle('is-library-open', nextOpen);
      libraryToggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      libraryPanel.hidden = !nextOpen;
      if (nextOpen) {
        renderTrackCatalog();
      }
    }

    function scrollActiveLibraryItem() {
      if (!libraryList || !libraryPanel || libraryPanel.hidden) return;

      var activeItem = libraryList.querySelector('.dream-library-item.is-active');
      if (activeItem && activeItem.scrollIntoView) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }

    function renderTrackCatalog() {
      if (!libraryList || !libraryCurrent) return;

      var track = currentTrack();
      libraryCurrent.textContent = trackLabel(track, state.index);
      libraryCount.forEach(function(node) {
        node.textContent = trackCatalogCount(assets.music.length);
      });

      libraryList.innerHTML = assets.music.map(function(item, index) {
        var active = index === state.index;
        var meta = trackCatalogMeta(item, index);
        return [
          '<button class="dream-library-item' + (active ? ' is-active' : '') + '" type="button" data-track-index="' + index + '" role="option" aria-selected="' + (active ? 'true' : 'false') + '">',
          '<span class="dream-library-index">' + trackCatalogIndex(index) + '</span>',
          '<span class="dream-library-item-copy">',
          '<strong>' + escapeHtml(trackLabel(item, index)) + '</strong>',
          meta ? '<small>' + escapeHtml(meta) + '</small>' : '',
          '</span>',
          active ? '<span class="dream-library-mark">\u5728\u64ad</span>' : '',
          '</button>'
        ].join('');
      }).join('');

      Array.prototype.slice.call(libraryList.querySelectorAll('[data-track-index]')).forEach(function(button) {
        button.addEventListener('click', function() {
          var index = normalizeIndex(Number(button.getAttribute('data-track-index') || 0), assets.music.length);
          if (trackSelect.value !== String(index)) {
            trackSelect.value = String(index);
            trackSelect.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            setLibraryOpen(false);
          }
        });
      });

      scrollActiveLibraryItem();
    }

    function normalizePlayerPosition(position) {
      if (!position || typeof position !== 'object') return null;

      var x = Number(position.x);
      var y = Number(position.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x: x, y: y };
    }

    function canDragPlayer() {
      return window.innerWidth > 575;
    }

    function currentProfileCard() {
      return document.body.classList.contains('home') ? (document.querySelector('.dream-profile-stack') || document.querySelector('.dream-profile-card')) : null;
    }

    function clampPlayerPosition(position) {
      var margin = 8;
      var maxX = Math.max(margin, window.innerWidth - player.offsetWidth - margin);
      var maxY = Math.max(margin, window.innerHeight - player.offsetHeight - margin);
      return {
        x: Math.min(maxX, Math.max(margin, Number(position.x || 0))),
        y: Math.min(maxY, Math.max(margin, Number(position.y || 0)))
      };
    }

    function dragReturnTarget() {
      if (!canDragPlayer()) return null;

      var targetProfileCard = currentProfileCard();
      if (!targetProfileCard) return null;
      if (profilePlaceholder && profilePlaceholder.parentNode) return profilePlaceholder;
      return targetProfileCard;
    }

    function isPlayerOverReturnTarget() {
      var target = dragReturnTarget();
      if (!target || player.classList.contains('dream-player-in-profile')) return false;

      var targetRect = target.getBoundingClientRect();
      if (!targetRect.width || !targetRect.height) return false;

      var playerRect = player.getBoundingClientRect();
      var centerX = playerRect.left + playerRect.width / 2;
      var centerY = playerRect.top + playerRect.height / 2;
      var padding = target === profilePlaceholder ? 46 : 28;
      return centerX >= targetRect.left - padding &&
        centerX <= targetRect.right + padding &&
        centerY >= targetRect.top - padding &&
        centerY <= targetRect.bottom + padding;
    }

    function setReturnTargetActive(active) {
      var target = active ? dragReturnTarget() : null;
      if (activeReturnTarget && activeReturnTarget !== target) {
        activeReturnTarget.classList.remove('is-player-return-target');
      }
      activeReturnTarget = target || null;
      if (activeReturnTarget) {
        activeReturnTarget.classList.toggle('is-player-return-target', Boolean(active));
      }
      player.classList.toggle('is-return-ready', Boolean(active && activeReturnTarget));
    }

    function updateReturnTargetState() {
      setReturnTargetActive(isPlayerOverReturnTarget());
    }

    function detachPlayerFromProfile() {
      if (!player.classList.contains('dream-player-in-profile')) return player.getBoundingClientRect();

      var rect = player.getBoundingClientRect();
      profilePlaceholder = document.createElement('div');
      profilePlaceholder.className = 'dream-player-placeholder';
      profilePlaceholder.style.height = rect.height + 'px';
      player.parentNode.insertBefore(profilePlaceholder, player);
      document.body.appendChild(player);
      player.classList.remove('dream-player-in-profile');
      return rect;
    }

    function restorePlayerToProfile() {
      profileCard = currentProfileCard();
      if (!profileCard || player.classList.contains('dream-player-in-profile')) return false;

      setReturnTargetActive(false);
      state.position = null;
      player.classList.remove('is-drag-positioned', 'is-dragging');
      player.style.left = '';
      player.style.top = '';
      player.style.right = '';
      player.style.bottom = '';
      player.classList.add('dream-player-in-profile');
      profileCard.appendChild(player);
      createHomeWorldPortal();
      if (profilePlaceholder && profilePlaceholder.parentNode) {
        profilePlaceholder.parentNode.removeChild(profilePlaceholder);
      }
      profilePlaceholder = null;
      persist({ position: null }, { keepTime: true });
      return true;
    }

    function movePlayerToBodyForPjax() {
      if (player.parentNode !== document.body) {
        if (player.classList.contains('dream-player-in-profile')) {
          detachPlayerFromProfile();
        } else {
          document.body.appendChild(player);
        }
      }
      if (profilePlaceholder && profilePlaceholder.parentNode) {
        profilePlaceholder.parentNode.removeChild(profilePlaceholder);
      }
      profilePlaceholder = null;
    }

    function applyPlayerPosition(position, options) {
      options = options || {};
      if (!position || !canDragPlayer()) return;

      var nextPosition = clampPlayerPosition(position);
      state.position = nextPosition;
      player.classList.add('is-drag-positioned');
      player.style.left = nextPosition.x + 'px';
      player.style.top = nextPosition.y + 'px';
      player.style.right = 'auto';
      player.style.bottom = 'auto';

      if (options.save) {
        persist({ position: nextPosition }, { keepTime: true });
      }
    }

    function resetPlayerPositionIfNeeded() {
      if (player.classList.contains('dream-player-in-profile')) return;
      if (state.position && canDragPlayer()) {
        applyPlayerPosition(state.position, { save: false });
        return;
      }

      player.classList.remove('is-drag-positioned');
      player.style.left = '';
      player.style.top = '';
      player.style.right = '';
      player.style.bottom = '';
    }

    function currentTrack() {
      return assets.music[state.index];
    }

    function renderTrack(options) {
      options = options || {};
      var track = currentTrack();
      if (!track) return;

      title.textContent = trackLabel(track, state.index);
      trackSelect.value = String(state.index);
      renderTrackCatalog();

      if (!options.keepNote) {
        note.textContent = shouldShowResumeHint || state.currentTime > 0 ? '点击继续播放音乐' : '点击唱片打开音乐';
      }
      updateProgress();
    }

    function persist(extra, options) {
      options = options || {};
      if (!options.keepTime && audio.getAttribute('src') && Number.isFinite(audio.currentTime)) {
        state.currentTime = Math.max(0, audio.currentTime);
      }
      state = Object.assign(state, extra || {});
      state.position = normalizePlayerPosition(state.position);
      setStored({
        index: state.index,
        volume: state.volume,
        started: state.started,
        playing: state.playing,
        currentTime: Math.max(0, Number(state.currentTime || 0)),
        position: state.position,
        musicSignature: currentMusicSignature,
        updatedAt: Date.now()
      });
    }

    function saveProgress(force) {
      var now = Date.now();
      if (!force && now - lastProgressSave < 1500) return;
      lastProgressSave = now;
      persist({
        currentTime: audio.getAttribute('src') && Number.isFinite(audio.currentTime) ? audio.currentTime : state.currentTime,
        playing: state.started && !audio.paused && !audio.ended
      });
    }

    function rememberBeforeNavigation() {
      saveProgress(true);
    }

    function isInternalNavigation(link) {
      var href = link && link.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^javascript:/i.test(href)) return false;
      if (link.target && link.target !== '_self') return false;
      if (link.hasAttribute('download')) return false;

      try {
        var url = new URL(href, window.location.href);
        return url.origin === window.location.origin;
      } catch (err) {
        return false;
      }
    }

    function restoreTime(time) {
      var targetTime = Math.max(0, Number(time || 0));
      if (!targetTime) return;

      try {
        if (Number.isFinite(audio.duration) && audio.duration > 1) {
          targetTime = Math.min(targetTime, Math.max(0, audio.duration - 0.8));
        }
        audio.currentTime = targetTime;
      } catch (err) {}
    }

    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';

      var whole = Math.floor(seconds);
      var minutes = Math.floor(whole / 60);
      var rest = String(whole % 60).padStart(2, '0');
      return minutes + ':' + rest;
    }

    function updateProgress() {
      var hasSource = Boolean(audio.getAttribute('src'));
      var duration = hasSource && Number.isFinite(audio.duration) ? audio.duration : 0;
      var current = hasSource && Number.isFinite(audio.currentTime) ? audio.currentTime : state.currentTime;
      current = Math.max(0, Number(current || 0));

      progress.max = duration > 0 ? String(duration) : '0';
      progress.disabled = !hasSource || duration <= 0;
      if (!isSeeking) {
        progress.value = duration > 0 ? String(Math.min(current, duration)) : '0';
      }
      time.textContent = formatTime(current) + ' / ' + (hasSource ? formatTime(duration) : '--:--');
    }

    function seekTo(value) {
      var duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (duration <= 0) return;

      var target = Math.min(duration, Math.max(0, Number(value || 0)));
      try {
        audio.currentTime = target;
        state.currentTime = target;
        persist({ currentTime: target });
      } catch (err) {}
      updateProgress();
    }

    function ensureAudioSource(resumeTime) {
      var track = currentTrack();
      if (!track) return;

      if (loadedTrackIndex === state.index && loadedTrackUrl === track.url && audio.getAttribute('src')) {
        return true;
      }

      loadedTrackIndex = state.index;
      loadedTrackUrl = track.url;
      pendingRestoreTime = Math.max(0, Number(resumeTime || 0));
      player.classList.add('is-loading');
      note.textContent = '正在载入音乐...';
      audio.preload = 'auto';
      audio.src = track.url;
      audio.load();
      return true;
    }

    function unloadAudioSource() {
      if (!audio.getAttribute('src')) return;

      try {
        audio.pause();
      } catch (err) {}
      audio.removeAttribute('src');
      audio.load();
      loadedTrackIndex = -1;
      loadedTrackUrl = '';
      pendingRestoreTime = 0;
      player.classList.remove('is-loading');
    }

    function loadTrack(shouldPlay) {
      var resumeTime = Number(state.currentTime || 0);
      if (!shouldPlay) {
        unloadAudioSource();
      }
      renderTrack({ keepNote: shouldPlay });
      updateProgress();
      persist({ currentTime: resumeTime }, { keepTime: true });
      if (shouldPlay) {
        play({ keepTime: true });
      }
    }

    function setPlaying(isPlaying) {
      if (isPlaying) {
        playRequested = false;
        clearPlayFallback();
        player.classList.remove('is-loading');
      }

      player.classList.toggle('is-playing', isPlaying);
      toggle.innerHTML = icon(isPlaying ? 'pause' : 'play');
      toggle.setAttribute('aria-label', isPlaying ? '暂停音乐' : '播放音乐');
      if (isPlaying) {
        note.textContent = '正在播放本地 music 文件夹';
      } else if (player.classList.contains('is-loading')) {
        note.textContent = '正在载入音乐...';
      } else {
        note.textContent = state.started ? '音乐已暂停' : '点击唱片打开音乐';
      }
    }

    function clearPlayFallback() {
      if (!playFallbackTimer) return;
      window.clearTimeout(playFallbackTimer);
      playFallbackTimer = null;
    }

    function schedulePlayFallback(delay) {
      clearPlayFallback();
      playFallbackTimer = window.setTimeout(function() {
        if ((!state.playing && !playRequested) || !audio.paused || !audio.getAttribute('src') || audio.readyState < 3) return;

        playRequested = false;
        state.playing = false;
        persist({ playing: false });
        player.classList.remove('is-loading');
        setPlaying(false);
        note.textContent = '浏览器需要你再点一次播放';
      }, delay || 3200);
    }

    function play(options) {
      var resumeTime = Number(state.currentTime || 0);
      state.started = true;
      state.playing = true;
      playRequested = true;
      persist({ started: true, playing: true }, options);
      if (!ensureAudioSource(resumeTime)) return;
      player.classList.add('is-loading');
      note.textContent = '正在载入音乐...';
      schedulePlayFallback(3600);
      audio.play().then(function() {
        setPlaying(true);
      }).catch(function() {
        playRequested = false;
        state.playing = false;
        persist({ playing: false });
        clearPlayFallback();
        player.classList.remove('is-loading');
        setPlaying(false);
        note.textContent = '浏览器需要你再点一次播放';
      });
    }

    function pause() {
      playRequested = false;
      state.playing = false;
      persist({ playing: false });
      clearPlayFallback();
      audio.pause();
      setPlaying(false);
    }

    function togglePlay() {
      if (audio.paused) {
        play();
      } else {
        pause();
      }
    }

    function changeTrack(delta, options) {
      options = options || {};
      var shouldPlay = options.autoplay || (state.started && !audio.paused);
      state.index = normalizeIndex(state.index + delta, assets.music.length);
      state.currentTime = 0;
      persist({ currentTime: 0, playing: shouldPlay });
      loadTrack(shouldPlay);
    }

    function beginDrag(event) {
      if (!canDragPlayer()) return;
      if (event.button !== undefined && event.button !== 0) return;

      var target = event.target;
      var fromHandle = target && target.closest ? target.closest('.dream-player-drag') : null;
      var interactive = target && target.closest ? target.closest('button, input, select, a, label') : null;
      if (!fromHandle && interactive) return;
      setLibraryOpen(false);

      var rect = detachPlayerFromProfile();
      applyPlayerPosition({ x: rect.left, y: rect.top }, { save: false });
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: rect.left,
        originY: rect.top,
        moved: false
      };
      player.classList.add('is-dragging');
      updateReturnTargetState();
      if (player.setPointerCapture && event.pointerId !== undefined) {
        try {
          player.setPointerCapture(event.pointerId);
        } catch (err) {}
      }
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      document.addEventListener('pointerup', endDrag);
      document.addEventListener('pointercancel', endDrag);
      window.addEventListener('blur', endDrag);
      scheduleDragCleanup();
      event.preventDefault();
    }

    function clearDragCleanup() {
      if (!dragCleanupTimer) return;
      window.clearTimeout(dragCleanupTimer);
      dragCleanupTimer = null;
    }

    function scheduleDragCleanup() {
      clearDragCleanup();
      dragCleanupTimer = window.setTimeout(function() {
        endDrag();
      }, 2400);
    }

    function onDragMove(event) {
      if (!dragState) return;

      var dx = event.clientX - dragState.startX;
      var dy = event.clientY - dragState.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragState.moved = true;
      }
      applyPlayerPosition({
        x: dragState.originX + dx,
        y: dragState.originY + dy
      }, { save: false });
      updateReturnTargetState();
      scheduleDragCleanup();
      event.preventDefault();
    }

    function endDrag(event) {
      if (!dragState && !player.classList.contains('is-dragging')) return;

      var shouldRestoreToProfile = dragState && (
        isPlayerOverReturnTarget() ||
        (!dragState.moved && profilePlaceholder && profilePlaceholder.parentNode)
      );
      clearDragCleanup();
      if (dragState && dragState.moved) {
        suppressClickUntil = Date.now() + 120;
      }
      if (player.releasePointerCapture && dragState && dragState.pointerId !== undefined) {
        try {
          player.releasePointerCapture(dragState.pointerId);
        } catch (err) {}
      }
      player.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      document.removeEventListener('pointerup', endDrag);
      document.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('blur', endDrag);
      dragState = null;
      setReturnTargetActive(false);
      if (!shouldRestoreToProfile || !restorePlayerToProfile()) {
        persist({ position: state.position }, { keepTime: true });
      }
      if (event) event.preventDefault();
    }

    disc.addEventListener('click', togglePlay);
    toggle.addEventListener('click', togglePlay);
    if (libraryToggle) {
      libraryToggle.addEventListener('click', function(event) {
        event.preventDefault();
        setLibraryOpen(libraryPanel.hidden);
      });
    }
    trackSelect.addEventListener('change', function() {
      var shouldPlay = state.started && !audio.paused;
      setLibraryOpen(false);
      state.index = normalizeIndex(Number(trackSelect.value || 0), assets.music.length);
      state.currentTime = 0;
      persist({ currentTime: 0, playing: shouldPlay });
      loadTrack(shouldPlay);
    });
    prev.addEventListener('click', function() {
      changeTrack(-1);
    });
    next.addEventListener('click', function() {
      changeTrack(1);
    });
    volume.addEventListener('input', function() {
      state.volume = Number(volume.value);
      audio.volume = state.volume;
      persist();
    });
    progress.addEventListener('input', function() {
      isSeeking = true;
      var duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      var current = Math.min(duration, Math.max(0, Number(progress.value || 0)));
      time.textContent = formatTime(current) + ' / ' + formatTime(duration);
    });
    progress.addEventListener('change', function() {
      seekTo(progress.value);
      isSeeking = false;
    });
    player.addEventListener('pointerdown', beginDrag);
    player.addEventListener('click', function(event) {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
    document.addEventListener('click', function(event) {
      if (!libraryPanel || libraryPanel.hidden) return;
      if (player.contains(event.target)) return;
      setLibraryOpen(false);
    });
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') setLibraryOpen(false);
    });
    if (dragHandle) {
      dragHandle.addEventListener('click', function(event) {
        event.preventDefault();
      });
      dragHandle.addEventListener('dblclick', function(event) {
        restorePlayerToProfile();
        event.preventDefault();
      });
    }
    audio.addEventListener('loadstart', function() {
      if (state.started) {
        player.classList.add('is-loading');
        note.textContent = '正在载入音乐...';
      }
    });
    audio.addEventListener('loadedmetadata', function() {
      restoreTime(pendingRestoreTime);
      updateProgress();
      persist({ currentTime: pendingRestoreTime }, { keepTime: true });
    });
    audio.addEventListener('canplay', function() {
      if ((state.playing || playRequested) && audio.paused) {
        schedulePlayFallback(1400);
      }
      if (!state.playing) {
        player.classList.remove('is-loading');
      }
      updateProgress();
    });
    audio.addEventListener('waiting', function() {
      if (state.playing) {
        player.classList.add('is-loading');
        note.textContent = '正在缓冲音乐...';
      }
    });
    audio.addEventListener('error', function() {
      playRequested = false;
      state.playing = false;
      clearPlayFallback();
      player.classList.remove('is-loading');
      persist({ playing: false });
      setPlaying(false);
      note.textContent = '音乐加载失败，请换一首或稍后再试';
    });
    audio.addEventListener('timeupdate', function() {
      saveProgress(false);
      updateProgress();
    });
    audio.addEventListener('durationchange', function() {
      updateProgress();
    });
    audio.addEventListener('ended', function() {
      persist({ currentTime: 0, playing: true });
      changeTrack(1, { autoplay: true });
    });
    audio.addEventListener('pause', function() {
      if (playRequested && player.classList.contains('is-loading')) return;
      playRequested = false;
      state.playing = false;
      setPlaying(false);
    });
    audio.addEventListener('play', function() {
      state.playing = true;
      clearPlayFallback();
      setPlaying(true);
      persist({ playing: true });
    });
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        saveProgress(true);
      }
    });
    window.addEventListener('pagehide', rememberBeforeNavigation);
    window.addEventListener('beforeunload', rememberBeforeNavigation);
    document.addEventListener('click', function(event) {
      var target = event.target;
      var link = target && target.closest ? target.closest('a[href]') : null;
      if (link && isInternalNavigation(link)) {
        rememberBeforeNavigation();
      }
    }, true);
    window.addEventListener('resize', resetPlayerPositionIfNeeded);
    player.dreamKeepAlive = movePlayerToBodyForPjax;
    player.dreamRefreshPlacement = function() {
      profileCard = currentProfileCard();
      if (!state.position && profileCard) {
        restorePlayerToProfile();
      } else {
        resetPlayerPositionIfNeeded();
      }
      createHomeWorldPortal();
    };

    renderTrack({ keepNote: shouldAutoResume });
    requestAnimationFrame(resetPlayerPositionIfNeeded);
    if (shouldAutoResume) {
      window.setTimeout(function() {
        play({ keepTime: true });
      }, 160);
    }
  }

  function isPjaxEligibleLink(link, event) {
    if (!link || !link.href) return false;
    if (event && (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    if (link.closest('[data-no-pjax], .fancybox, .fancybox\\.image, #modalSearch, .tool-download')) return false;

    var rawHref = link.getAttribute('href') || '';
    if (!rawHref || rawHref.charAt(0) === '#' || /^javascript:/i.test(rawHref) || /^mailto:/i.test(rawHref) || /^tel:/i.test(rawHref)) return false;

    try {
      var url = new URL(rawHref, window.location.href);
      if (url.origin !== window.location.origin) return false;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
      if (url.pathname.indexOf(getSiteRoot()) !== 0) return false;
      return true;
    } catch (err) {
      return false;
    }
  }

  function getSiteRoot() {
    if (window.CONFIG && CONFIG.root) return CONFIG.root;
    var script = document.querySelector('script[src*="/js/dream-fluid.js"]');
    if (script) {
      var src = script.getAttribute('src') || '';
      var match = src.match(/^(.*\/)js\/dream-fluid\.js/i);
      if (match) return match[1];
    }
    return '/';
  }

  function setPjaxLoading(loading) {
    document.documentElement.classList.toggle('dream-pjax-loading', loading);
    if (window.NProgress) {
      if (loading) {
        window.NProgress.start();
      } else {
        window.NProgress.done();
      }
    }
  }

  function keepPlayerAliveForPjax() {
    var player = document.querySelector('.dream-player');
    if (player && typeof player.dreamKeepAlive === 'function') {
      player.dreamKeepAlive();
    }
  }

  function refreshPlayerPlacement() {
    var player = document.querySelector('.dream-player');
    if (player && typeof player.dreamRefreshPlacement === 'function') {
      player.dreamRefreshPlacement();
    }
  }

  function replaceHeadMeta(nextDoc) {
    var title = nextDoc.querySelector('title');
    if (title) document.title = title.textContent;

    var selectors = [
      'meta[name="description"]',
      'meta[property^="og:"]',
      'meta[property^="article:"]',
      'meta[name^="twitter:"]',
      'link[rel="canonical"]'
    ];

    selectors.forEach(function(selector) {
      Array.prototype.slice.call(document.head.querySelectorAll(selector)).forEach(function(node) {
        node.parentNode.removeChild(node);
      });
      Array.prototype.slice.call(nextDoc.head.querySelectorAll(selector)).forEach(function(node) {
        document.head.appendChild(node.cloneNode(true));
      });
    });
  }

  function cloneFreshNode(nextDoc, selector) {
    var current = document.querySelector(selector);
    var next = nextDoc.querySelector(selector);
    if (current && next) {
      current.replaceWith(next.cloneNode(true));
      return true;
    }
    return false;
  }

  function replaceHeader(nextDoc) {
    var currentInner = document.querySelector('.header-inner');
    var nextInner = nextDoc.querySelector('.header-inner');
    var currentBanner = document.getElementById('banner');
    var nextBanner = nextDoc.getElementById('banner');

    if (currentInner && nextInner) {
      currentInner.setAttribute('style', nextInner.getAttribute('style') || '');
      currentInner.className = nextInner.className;
    }
    if (currentBanner && nextBanner) {
      currentBanner.replaceWith(nextBanner.cloneNode(true));
    }
  }

  function primaryMainContent(main) {
    if (!main) return null;
    return Array.prototype.slice.call(main.children).find(function(node) {
      return node.id !== 'scroll-top-button' && node.id !== 'modalSearch';
    }) || null;
  }

  function replaceMainContent(nextDoc) {
    var currentMain = document.querySelector('main');
    var nextMain = nextDoc.querySelector('main');
    var currentContent = primaryMainContent(currentMain);
    var nextContent = primaryMainContent(nextMain);
    if (!currentMain || !nextContent) return false;

    var clone = nextContent.cloneNode(true);
    if (currentContent) {
      currentContent.replaceWith(clone);
    } else {
      var before = currentMain.querySelector('#scroll-top-button, #modalSearch');
      currentMain.insertBefore(clone, before || null);
    }
    return true;
  }

  function replacePjaxContent(nextDoc) {
    keepPlayerAliveForPjax();
    replaceHeader(nextDoc);
    replaceMainContent(nextDoc);
    cloneFreshNode(nextDoc, 'footer');
    document.body.className = nextDoc.body.className;
  }

  function executePjaxContentScripts() {
    var scripts = Array.prototype.slice.call(document.querySelectorAll('main script'));
    scripts.forEach(function(oldScript) {
      var script = document.createElement('script');
      Array.prototype.slice.call(oldScript.attributes).forEach(function(attr) {
        script.setAttribute(attr.name, attr.value);
      });
      script.textContent = oldScript.textContent || '';
      oldScript.parentNode.replaceChild(script, oldScript);
    });
  }

  function initLazyImages() {
    if (!window.Fluid || !Fluid.utils || !window.CONFIG) return;
    Array.prototype.slice.call(document.querySelectorAll('img[lazyload]')).forEach(function(img) {
      Fluid.utils.waitElementVisible(img, function() {
        img.removeAttribute('srcset');
        img.removeAttribute('lazyload');
      }, CONFIG.lazyload ? CONFIG.lazyload.offset_factor : 0);
    });
  }

  function initPjaxToc() {
    var toc = document.getElementById('toc');
    var tocBody = document.getElementById('toc-body');
    var boardCtn = document.getElementById('board-ctn');
    if (!toc || !tocBody || !boardCtn || !window.CONFIG) return;
    if (!window.tocbot && window.Fluid && Fluid.utils) {
      Fluid.utils.createScript('https://lib.baomitu.com/tocbot/4.20.1/tocbot.min.js', initPjaxToc);
      return;
    }
    if (!window.tocbot) return;

    try {
      window.tocbot.destroy();
    } catch (err) {}

    var boardTop = window.jQuery ? window.jQuery(boardCtn).offset().top : boardCtn.getBoundingClientRect().top + window.scrollY;
    var config = Object.assign({
      tocSelector: '#toc-body',
      contentSelector: '.markdown-body',
      linkClass: 'tocbot-link',
      activeLinkClass: 'tocbot-active-link',
      listClass: 'tocbot-list',
      isCollapsedClass: 'tocbot-is-collapsed',
      collapsibleClass: 'tocbot-is-collapsible',
      scrollSmooth: true,
      includeTitleTags: true,
      headingsOffset: -boardTop
    }, CONFIG.toc || {});

    if (CONFIG.toc && CONFIG.toc.expand_all === true) {
      config.collapseDepth = 6;
    }

    window.tocbot.init(config);
    toc.style.visibility = toc.querySelector('.toc-list-item') ? 'visible' : 'hidden';
  }

  function ensureExternalScript(src, test, callback) {
    if (test && test()) {
      if (callback) callback();
      return;
    }
    var existing = Array.prototype.slice.call(document.scripts).find(function(script) {
      return script.src === src;
    });
    if (existing) {
      existing.addEventListener('load', function() {
        if (callback) callback();
      }, { once: true });
      return;
    }
    var script = document.createElement('script');
    script.src = src;
    script.onload = function() {
      if (callback) callback();
    };
    document.body.appendChild(script);
  }

  function ensureStylesheet(href) {
    var exists = Array.prototype.slice.call(document.styleSheets).some(function(sheet) {
      return sheet.href === href;
    }) || Boolean(document.querySelector('link[href="' + href + '"]'));
    if (exists) return;

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureArticleAssets(callback) {
    if (!document.querySelector('.markdown-body')) {
      if (callback) callback();
      return;
    }

    ensureStylesheet('https://lib.baomitu.com/github-markdown-css/4.0.0/github-markdown.min.css');
    ensureStylesheet('https://lib.baomitu.com/hint.css/2.7.0/hint.min.css');
    ensureStylesheet('https://lib.baomitu.com/fancybox/3.5.7/jquery.fancybox.min.css');
    ensureExternalScript('https://lib.baomitu.com/clipboard.js/2.0.11/clipboard.min.js', function() {
      return 'ClipboardJS' in window;
    }, function() {
      if (window.Fluid && Fluid.plugins && Fluid.plugins.codeWidget) {
        Fluid.plugins.codeWidget();
      }
    });
    ensureExternalScript('https://lib.baomitu.com/anchor-js/5.0.0/anchor.min.js', function() {
      return 'anchors' in window;
    }, function() {
      if (window.anchors && window.CONFIG) {
        try {
          window.anchors.removeAll();
          var selector = (CONFIG.anchorjs && CONFIG.anchorjs.element ? CONFIG.anchorjs.element : 'h1,h2,h3,h4,h5,h6')
            .split(',')
            .map(function(item) {
              return '.markdown-body > ' + item.trim();
            })
            .join(', ');
          window.anchors.add(selector);
        } catch (err) {}
      }
    });
    ensureExternalScript('https://lib.baomitu.com/fancybox/3.5.7/jquery.fancybox.min.js', function() {
      return window.jQuery && 'fancybox' in window.jQuery;
    }, function() {
      if (window.Fluid && Fluid.plugins && Fluid.plugins.fancyBox) {
        Fluid.plugins.fancyBox();
      }
      if (callback) callback();
    });
  }

  function refreshThemePluginsAfterPjax() {
    ensureArticleAssets();
    var subtitle = document.getElementById('subtitle');
    var typedText = subtitle && subtitle.getAttribute('data-typed-text');
    if (subtitle && typedText) {
      subtitle.textContent = typedText;
    }
    if (window.Fluid && Fluid.plugins) {
      if (Fluid.plugins.imageCaption) Fluid.plugins.imageCaption();
      if (Fluid.plugins.fancyBox) Fluid.plugins.fancyBox();
      if (Fluid.plugins.codeWidget) Fluid.plugins.codeWidget();
    }
    if (window.anchors && window.CONFIG) {
      try {
        window.anchors.removeAll();
        var selector = (CONFIG.anchorjs && CONFIG.anchorjs.element ? CONFIG.anchorjs.element : 'h1,h2,h3,h4,h5,h6')
          .split(',')
          .map(function(item) {
            return '.markdown-body > ' + item.trim();
          })
          .join(', ');
        window.anchors.add(selector);
      } catch (err) {}
    }
    initLazyImages();
    initPjaxToc();
  }

  function runAfterPjax(options) {
    options = options || {};
    markPageType();
    pickBackgrounds();
    executePjaxContentScripts();
    refreshThemePluginsAfterPjax();
    initPage();
    window.setTimeout(refreshPlayerPlacement, 0);
    onScroll();
    if (options.scroll !== false) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    document.dispatchEvent(new CustomEvent('dream:pjax:complete'));
  }

  function navigateWithPjax(url, options) {
    options = options || {};
    if (pjaxController) {
      pjaxController.abort();
    }
    pjaxController = new AbortController();
    setPjaxLoading(true);

    return fetch(url.href, {
      credentials: 'same-origin',
      signal: pjaxController.signal,
      headers: { 'X-Requested-With': 'DreamPJAX' }
    }).then(function(response) {
      if (!response.ok) throw new Error('PJAX request failed: ' + response.status);
      return response.text();
    }).then(function(html) {
      var nextDoc = new DOMParser().parseFromString(html, 'text/html');
      if (!nextDoc.querySelector('main') || !nextDoc.querySelector('.header-inner')) {
        window.location.href = url.href;
        return;
      }

      replaceHeadMeta(nextDoc);
      replacePjaxContent(nextDoc);
      if (!options.popstate) {
        history.pushState({ dreamPjax: true }, '', url.href);
      }
      runAfterPjax({ scroll: !url.hash });
      if (url.hash) {
        var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }).catch(function(error) {
      if (error && error.name === 'AbortError') return;
      console.warn('PJAX navigation failed:', error);
      window.location.href = url.href;
    }).finally(function() {
      pjaxController = null;
      setPjaxLoading(false);
    });
  }

  function initPjaxNavigation() {
    if (pjaxBound || !window.fetch || !window.DOMParser || !history.pushState) return;
    pjaxBound = true;

    history.replaceState(Object.assign({}, history.state || {}, { dreamPjax: true }), '', window.location.href);

    document.addEventListener('click', function(event) {
      var target = event.target;
      var link = target && target.closest ? target.closest('a[href]') : null;
      if (!isPjaxEligibleLink(link, event)) return;

      var url = new URL(link.getAttribute('href'), window.location.href);
      event.preventDefault();
      navigateWithPjax(url);
    });

    window.addEventListener('popstate', function() {
      navigateWithPjax(new URL(window.location.href), { popstate: true });
    });
  }

  function initPage() {
    deferredHomeFeaturesStarted = false;
    markPageType();
    pickBackgrounds();
    startHomeIntro();
    enhanceHomeHero();
    initHomeAutoScroll();
    constrainListingImages();
    groupIndexCardsByDate();
    createHomeProfile();
    onScroll();
    revealCards();
    enhanceSearch();
    initAboutDashboard();
    initAboutLegalPolicy();
    initClassificationTags();
    initDreamTools();
    initLinksPage();
    createHomeWorldPortal();
    createHomeTasksCard();
    createHomeDailySignCard();
    startDeferredHomeFeatures();
  }

  function initOnce() {
    addBackgroundLayer();
    window.addEventListener('scroll', onScroll, { passive: true });
    initPjaxNavigation();
    initLegalConsentGate();
  }

  function init() {
    initOnce();
    initPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
