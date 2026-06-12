(function() {
  'use strict';

  var assets = window.DREAM_THEME_ASSETS || { pictures: [], music: [] };
  var storageKey = 'DreamFluidPlayer';
  var walineServerURL = 'https://my-blog-eta-one-13.vercel.app';
  var root = document.documentElement;
  var searchShortcutBound = false;
  var dreamToolsHashBound = false;
  var activeDreamToolShow = null;
  var pjaxBound = false;
  var pjaxController = null;
  var friendLinksRequest = null;
  var siteDataPromise = null;
  var initialPictureNames = (assets.pictures || []).map(function(picture) {
    return picture.name;
  });

  function icon(name) {
    var paths = {
      play: '<path d="M7 5v14l11-7z"></path>',
      pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"></path>',
      prev: '<path d="M6 6h2v12H6zM9 12l9 6V6z"></path>',
      next: '<path d="M16 6h2v12h-2zM6 18l9-6-9-6z"></path>',
      music: '<path d="M9 18V5l10-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="16" cy="16" r="3"></circle>'
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

  function normalizeIndex(index, length) {
    if (!length) return 0;
    return (index + length) % length;
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

  function setCounterText(selector, text) {
    Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function(node) {
      node.textContent = text;
    });
  }

  function initWalineCounters() {
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
    postsCol.classList.add('dream-home-posts', 'col-lg-8');

    var profile = document.createElement('aside');
    profile.className = 'col-12 col-lg-4 dream-profile-col';
    profile.innerHTML = [
      '<div class="dream-profile-stack">',
      '<section class="dream-profile-card" aria-label="profile">',
      '<div class="dream-profile-avatar-wrap">',
      '<img class="dream-profile-avatar" src="' + siteAssetUrl('assets/picture/profile-avatar.jpeg') + '" alt="&#x5C0F;&#x5446;&#x5446;">',
      '</div>',
      '<div class="dream-profile-copy">',
      '<h2 class="dream-profile-name">&#x5C0F;&#x5446;&#x5446;</h2>',
      '<span class="dream-profile-line" aria-hidden="true"></span>',
      '<p class="dream-profile-bio">&#x5728;&#x4EE3;&#x7801;&#x4E2D;&#x6784;&#x5EFA;&#x4E16;&#x754C;&#xFF0C;<br>&#x5728;&#x6587;&#x5B57;&#x91CC;&#x5B89;&#x653E;&#x81EA;&#x5DF1;&#xFF0C;<br>&#x4FDD;&#x6301;&#x597D;&#x5947;&#xFF0C;&#x4FDD;&#x6301;&#x70ED;&#x7231;&#x3002;</p>',
      '</div>',
      '</section>',
      '</div>'
    ].join('');

    layoutRow.appendChild(profile);
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

    if (bannerText.querySelector('.dream-hero-subcopy')) return;

    var subcopy = document.createElement('p');
    subcopy.className = 'dream-hero-subcopy';
    subcopy.textContent = '在代码与文字之间，寻找热爱，保持思考，成为更好的自己。';
    bannerText.appendChild(subcopy);
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
        '- 支持链接：[小呆呆的博客](https://xiaodaidai.site/)',
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

  function createPlayer() {
    if (!assets.music || assets.music.length === 0 || document.querySelector('.dream-player')) return;

    var state = Object.assign({
      index: 0,
      volume: 0.55,
      started: false,
      playing: false,
      currentTime: 0,
      position: null
    }, getStored());
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
          '<select class="dream-track-select" aria-label="Music library"></select>' +
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

    volume.value = state.volume;

    assets.music.forEach(function(track, index) {
      var option = document.createElement('option');
      option.value = String(index);
      option.textContent = track.title || track.name || ('Track ' + (index + 1));
      trackSelect.appendChild(option);
    });

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
      if (!profileCard || player.classList.contains('dream-player-in-profile')) return;

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

      title.textContent = track.title || track.name || ('Track ' + (state.index + 1));
      trackSelect.value = String(state.index);

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
      scheduleDragCleanup();
      event.preventDefault();
    }

    function endDrag(event) {
      if (!dragState && !player.classList.contains('is-dragging')) return;

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
      persist({ position: state.position }, { keepTime: true });
      if (event) event.preventDefault();
    }

    disc.addEventListener('click', togglePlay);
    toggle.addEventListener('click', togglePlay);
    trackSelect.addEventListener('change', function() {
      var shouldPlay = state.started && !audio.paused;
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
    markPageType();
    pickBackgrounds();
    enhanceHomeHero();
    constrainListingImages();
    groupIndexCardsByDate();
    createHomeProfile();
    onScroll();
    revealCards();
    enhanceSearch();
    initAboutDashboard();
    initClassificationTags();
    initWalineCounters();
    initDreamTools();
    initLinksPage();
    createPlayer();
    createHomeWorldPortal();
  }

  function initOnce() {
    addBackgroundLayer();
    window.addEventListener('scroll', onScroll, { passive: true });
    initPjaxNavigation();
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
