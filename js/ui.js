/* ============================================================
   科研日课 · ui.js
   交互组件：模态框 / 提示条 / 确认框 / 菜单 / 全局搜索
   ============================================================ */
window.UI = (function () {
  const modalRoot = document.getElementById('modalRoot');
  const toastRoot = document.getElementById('toastRoot');
  const menuRoot = document.getElementById('menuRoot');
  let modals = [];

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /* ---------------- modal ---------------- */
  function openModal(o) {
    o = o || {};
    const wrap = el(
      '<div class="modal-root">' +
        '<div class="modal-backdrop"></div>' +
        '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true">' +
          '<div class="modal-head">' +
            '<div>' +
              '<div class="modal-title">' + (o.icon ? '<span class="icon-inline">' + Utils.icon(o.icon, 18) + '</span>' : '') + (o.title || '') + '</div>' +
              (o.sub ? '<div class="modal-sub">' + o.sub + '</div>' : '') +
            '</div>' +
            '<button class="icon-btn plain modal-close" title="关闭 (Esc)">' + Utils.icon('x', 18) + '</button>' +
          '</div>' +
          '<div class="modal-body">' + (o.body || '') + '</div>' +
          (o.footer ? '<div class="modal-foot">' + o.footer + '</div>' : '') +
        '</div>' +
      '</div>'
    );
    modalRoot.appendChild(wrap);
    const close = function (result) {
      if (wrap.dataset.closed) return;
      wrap.dataset.closed = '1';
      modals = modals.filter(function (m) { return m.wrap !== wrap; });
      wrap.remove();
      if (o.onClose) o.onClose(result);
    };
    const handle = { wrap: wrap, close: close, body: wrap.querySelector('.modal-body') };
    modals.push(handle);
    wrap.querySelector('.modal-backdrop').addEventListener('click', function () { if (!o.sticky) close(); });
    wrap.querySelector('.modal-close').addEventListener('click', function () { close(); });
    if (o.onMount) o.onMount(handle);
    setTimeout(function () {
      const first = wrap.querySelector('input:not([type=hidden]):not([readonly]), textarea, select');
      if (first && !o.noAutofocus) first.focus();
    }, 60);
    return handle;
  }

  function confirmDialog(o) {
    return new Promise(function (resolve) {
      const h = openModal({
        size: 'slim',
        icon: o.icon || 'alert',
        title: o.title || '确认操作',
        body: '<div class="text-2" style="font-size:13.5px;line-height:1.7">' + (o.message || '') + '</div>' +
          (o.detail ? '<div class="field-hint mt-10">' + o.detail + '</div>' : ''),
        footer: '<button class="btn" data-act="no">取消</button><div class="spacer"></div>' +
          '<button class="btn ' + (o.danger === false ? 'btn-primary' : 'btn-danger') + '" data-act="yes">' + (o.confirmLabel || '确认') + '</button>',
        noAutofocus: true,
        onClose: function () { resolve(false); },
        onMount: function (h) {
          h.wrap.querySelector('[data-act=no]').addEventListener('click', function () { h.close(); });
          h.wrap.querySelector('[data-act=yes]').addEventListener('click', function () { resolve(true); h.close(); });
        }
      });
    });
  }

  function promptDialog(o) {
    return new Promise(function (resolve) {
      openModal({
        size: o.size || 'slim',
        icon: o.icon || 'edit',
        title: o.title || '输入',
        sub: o.sub || '',
        body: '<div class="field">' +
          (o.label ? '<label>' + o.label + '</label>' : '') +
          (o.multiline
            ? '<textarea class="textarea" id="promptInput" placeholder="' + (o.placeholder || '') + '">' + Utils.esc(o.value || '') + '</textarea>'
            : '<input class="input" id="promptInput" value="' + Utils.esc(o.value || '') + '" placeholder="' + (o.placeholder || '') + '">') +
          '</div>',
        footer: '<button class="btn" data-act="cancel">取消</button><div class="spacer"></div>' +
          '<button class="btn btn-primary" data-act="ok">' + (o.okLabel || '确定') + '</button>',
        onClose: function () { resolve(null); },
        onMount: function (h) {
          const input = h.wrap.querySelector('#promptInput');
          const ok = function () { const v = input.value.trim(); if (!v && o.required !== false) return; resolve(v); h.close(); };
          h.wrap.querySelector('[data-act=ok]').addEventListener('click', ok);
          h.wrap.querySelector('[data-act=cancel]').addEventListener('click', function () { h.close(); });
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && (!o.multiline || e.ctrlKey || e.metaKey)) { e.preventDefault(); ok(); }
          });
        }
      });
    });
  }

  function closeTop() {
    if (modals.length) { modals[modals.length - 1].close(); return true; }
    return false;
  }
  function anyOpen() { return modals.length > 0; }

  /* ---------------- toast ---------------- */
  function toast(msg, opts) {
    opts = typeof opts === 'string' ? { type: opts } : (opts || {});
    const safeMsg = opts.html ? msg : Utils.esc(msg);
    const node = el(
      '<div class="toast ' + (opts.type || '') + '">' +
        '<span class="icon-inline">' + Utils.icon(opts.type === 'error' ? 'alert' : opts.type === 'success' ? 'checkCircle' : 'info', 17) + '</span>' +
        '<span class="toast-msg">' + safeMsg + '</span>' +
        (opts.action ? '<button class="toast-action">' + opts.action.label + '</button>' : '') +
      '</div>'
    );
    toastRoot.appendChild(node);
    if (opts.action) {
      node.querySelector('.toast-action').addEventListener('click', function () {
        opts.action.onClick();
        remove();
      });
    }
    const dur = opts.duration || (opts.action ? 6000 : 2600);
    const timer = setTimeout(remove, dur);
    function remove() {
      clearTimeout(timer);
      node.classList.add('leaving');
      setTimeout(function () { node.remove(); }, 240);
    }
    return remove;
  }

  /* ---------------- menu ---------------- */
  let openMenu = null;
  function menu(anchor, items, opts) {
    closeMenu();
    opts = opts || {};
    const html = items.map(function (it, i) {
      if (it.sep) return '<div class="menu-sep"></div>';
      return '<button class="menu-item ' + (it.danger ? 'text-danger' : '') + '" data-i="' + i + '">' +
        '<span class="icon-inline">' + Utils.icon(it.icon || 'chevron', 16) + '</span><span>' + it.label + '</span></button>';
    }).join('');
    const node = el('<div class="menu">' + html + '</div>');
    menuRoot.appendChild(node);
    const rect = anchor.getBoundingClientRect();
    const w = 200, h = node.offsetHeight;
    let x = opts.align === 'left' ? rect.left : rect.right - w;
    let y = rect.bottom + 6;
    if (y + h > window.innerHeight - 10) y = Math.max(10, rect.top - h - 6);
    x = Utils.clamp(x, 10, window.innerWidth - w - 10);
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node.style.minWidth = w + 'px';
    node.querySelectorAll('.menu-item').forEach(function (b) {
      b.addEventListener('click', function () {
        const it = items[Number(b.dataset.i)];
        closeMenu();
        if (it.onClick) it.onClick();
      });
    });
    setTimeout(function () {
      document.addEventListener('mousedown', onDoc, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('scroll', closeMenu, true);
    }, 10);
    function onDoc(e) { if (!node.contains(e.target)) closeMenu(); }
    function onKey(e) { if (e.key === 'Escape') closeMenu(); }
    function cleanup() {
      document.removeEventListener('mousedown', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', closeMenu, true);
    }
    openMenu = { node: node, cleanup: cleanup };
    return openMenu;
  }
  function closeMenu() {
    if (!openMenu) return;
    openMenu.cleanup();
    openMenu.node.remove();
    openMenu = null;
  }

  /* ---------------- global search ---------------- */
  const searchState = { open: false, items: [], active: 0 };
  function buildResults(q) {
    const groups = [];
    const ql = q.toLowerCase();
    const hit = function () {
      const args = Array.prototype.slice.call(arguments);
      return args.some(function (s) { return String(s || '').toLowerCase().indexOf(ql) >= 0; });
    };
    const tasks = Store.state.tasks.filter(function (t) { return hit(t.title, t.notes, t.category); })
      .sort(function (a, b) { return (b.date + '').localeCompare(a.date + ''); }).slice(0, 8)
      .map(function (t) {
        return {
          group: '任务', icon: (Utils.CAT_MAP[t.category] || {}).icon || 'check',
          color: (Utils.CAT_MAP[t.category] || {}).color, title: t.title,
          snippet: Utils.fmtDate(t.date, 'md') + (t.start ? ' ' + t.start + (t.end ? '–' + t.end : '') : '') + (t.done ? ' · 已完成' : '') + (t.notes ? ' · ' + t.notes : ''),
          meta: t.category,
          onPick: function () { App.openTask(t.id); }
        };
      });
    const exps = Store.state.experiments.filter(function (e) {
      return hit(e.title, e.objective, e.hypothesis, (e.tags || []).join(' '), e.protocol, e.results, e.conclusion);
    }).slice(0, 6).map(function (e) {
      return {
        group: '实验', icon: 'flask', color: 'var(--c-exp)', title: e.title,
        snippet: ((Utils.EXP_STATUS_MAP[e.status] || {}).label || '') + ' · ' + Utils.truncate(e.objective || e.hypothesis || '暂无描述', 70),
        meta: (e.tags || []).slice(0, 2).join(' '),
        onPick: function () { App.openExperiment(e.id); }
      };
    });
    const papers = Store.state.papers.filter(function (p) {
      return hit(p.title, p.authors, p.journal, (p.tags || []).join(' '), p.summary, p.keyPoints, p.questions, p.quotes, p.doi);
    }).slice(0, 6).map(function (p) {
      return {
        group: '文献', icon: 'book', color: 'var(--c-lit)', title: p.title,
        snippet: (p.authors ? Utils.truncate(p.authors, 36) + ' · ' : '') + (p.journal || '') + (p.year ? ' ' + p.year : ''),
        meta: (Utils.PAPER_STATUS_MAP[p.status] || {}).label || '',
        onPick: function () { App.openPaper(p.id); }
      };
    });
    const notes = Store.state.notes.filter(function (n) { return hit(n.content, n.title); }).slice(0, 5).map(function (n) {
      return {
        group: '速记', icon: 'bulb', color: 'var(--c-data)', title: n.title || Utils.truncate(n.content, 40),
        snippet: Utils.truncate(n.content, 70), meta: Utils.relTime(n.createdAt),
        onPick: function () { App.openNote(n.id); }
      };
    });
    if (tasks.length) groups.push({ name: '任务', items: tasks });
    if (exps.length) groups.push({ name: '实验', items: exps });
    if (papers.length) groups.push({ name: '文献', items: papers });
    if (notes.length) groups.push({ name: '速记', items: notes });
    return groups;
  }
  function renderSearch(panel, q) {
    const body = panel.querySelector('.search-results');
    if (!q) {
      const recent = Store.state.notes.slice(0, 3);
      body.innerHTML = '<div class="sr-group">最近速记</div>' + (recent.length ? recent.map(function (n) {
        return '<div class="sr-item" data-note="' + n.id + '"><div class="sr-icon">' + Utils.icon('bulb', 16) + '</div>' +
          '<div class="sr-main"><div class="sr-title">' + Utils.esc(n.title || Utils.truncate(n.content, 50)) + '</div>' +
          '<div class="sr-snippet">' + Utils.esc(Utils.truncate(n.content, 80)) + '</div></div>' +
          '<div class="sr-meta">' + Utils.relTime(n.createdAt) + '</div></div>';
      }).join('') : '<div class="sr-empty">输入关键词搜索任务、实验、文献与速记</div>');
      searchState.items = [];
      body.querySelectorAll('[data-note]').forEach(function (el2) {
        el2.addEventListener('click', function () { closeSearch(); App.openNote(el2.dataset.note); });
      });
      return;
    }
    const groups = buildResults(q);
    searchState.items = [];
    let html = '';
    groups.forEach(function (g) {
      html += '<div class="sr-group">' + g.name + '</div>';
      g.items.forEach(function (it) {
        searchState.items.push(it);
        const i = searchState.items.length - 1;
        html += '<div class="sr-item" data-i="' + i + '">' +
          '<div class="sr-icon" style="color:' + (it.color || 'var(--text-3)') + '">' + Utils.icon(it.icon, 16) + '</div>' +
          '<div class="sr-main"><div class="sr-title">' + Utils.highlight(it.title, q) + '</div>' +
          (it.snippet ? '<div class="sr-snippet">' + Utils.highlight(it.snippet, q) + '</div>' : '') + '</div>' +
          '<div class="sr-meta">' + Utils.esc(it.meta || '') + '</div></div>';
      });
    });
    body.innerHTML = html || '<div class="sr-empty">没有找到与「' + Utils.esc(q) + '」相关的内容</div>';
    body.querySelectorAll('.sr-item').forEach(function (node) {
      node.addEventListener('click', function () { pick(Number(node.dataset.i)); });
      node.addEventListener('mousemove', function () { setActive(Number(node.dataset.i)); });
    });
    searchState.active = 0;
    setActive(0);
  }
  function setActive(i) {
    const body = currentPanel && currentPanel.querySelector('.search-results');
    if (!body) return;
    searchState.active = i;
    body.querySelectorAll('.sr-item').forEach(function (n, k) { n.classList.toggle('active', k === i); });
    const node = body.querySelectorAll('.sr-item')[i];
    if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
  }
  function pick(i) {
    const it = searchState.items[i];
    closeSearch();
    if (it && it.onPick) setTimeout(it.onPick, 60);
  }
  let currentPanel = null;
  function openSearch() {
    if (searchState.open) return;
    searchState.open = true;
    const wrap = el(
      '<div class="search-overlay">' +
        '<div class="modal-backdrop"></div>' +
        '<div class="search-panel">' +
          '<div class="search-bar"><span class="icon-inline">' + Utils.icon('search', 18) + '</span>' +
          '<input placeholder="搜索任务 / 实验 / 文献 / 速记…" spellcheck="false">' +
          '<span class="kbd">Esc</span></div>' +
          '<div class="search-results"></div>' +
          '<div class="search-foot"><span><span class="kbd">↑</span> <span class="kbd">↓</span> 选择</span>' +
          '<span><span class="kbd">Enter</span> 打开</span><span><span class="kbd">Esc</span> 关闭</span></div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(wrap);
    currentPanel = wrap.querySelector('.search-panel');
    const input = wrap.querySelector('input');
    renderSearch(currentPanel, '');
    input.addEventListener('input', function () { renderSearch(currentPanel, input.value.trim()); });
    wrap.querySelector('.modal-backdrop').addEventListener('click', closeSearch);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(searchState.active + 1, searchState.items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(searchState.active - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(searchState.active); }
      else if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
    });
    setTimeout(function () { input.focus(); }, 50);
    wrap._close = closeSearch;
  }
  function closeSearch() {
    if (!searchState.open) return;
    const wrap = document.querySelector('.search-overlay');
    if (wrap) wrap.remove();
    searchState.open = false;
    currentPanel = null;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (searchState.open) { closeSearch(); return; }
      if (openMenu) { closeMenu(); return; }
      if (modals.length) closeTop();
    }
  });

  return {
    el: el, openModal: openModal, closeTop: closeTop, anyOpen: anyOpen,
    confirm: confirmDialog, prompt: promptDialog,
    toast: toast, menu: menu, closeMenu: closeMenu,
    openSearch: openSearch, closeSearch: closeSearch, searchIsOpen: function () { return searchState.open; }
  };
})();



