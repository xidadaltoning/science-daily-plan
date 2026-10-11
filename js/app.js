/* ============================================================
   科研日课 · app.js
   应用外壳：路由 / 侧边栏 / 顶栏 / 快捷键 / 通用编辑弹窗
   ============================================================ */
window.App = (function () {
  const UIKEY = 'research-daily-ui-v1';
  const NAV = [
    { id: 'today', icon: 'today', label: '今日' },
    { id: 'schedule', icon: 'schedule', label: '日程安排' },
    { id: 'goals', icon: 'target', label: '科研目标' },
    { id: 'experiments', icon: 'flask', label: '实验计划' },
    { id: 'library', icon: 'book', label: '文献阅读' },
    { id: 'insights', icon: 'insights', label: '复盘统计' },
    { id: 'settings', icon: 'settings', label: '设置' }
  ];

  const App = {
    currentView: 'today',
    params: {},
    ui: { scheduleDate: Utils.today(), exp: null, lib: null, insights: null },
    booted: false
  };

  /* ---------------- ui state ---------------- */
  function loadUI() {
    try {
      const raw = JSON.parse(localStorage.getItem(UIKEY) || 'null');
      if (raw && typeof raw === 'object') {
        App.ui.scheduleDate = raw.scheduleDate || Utils.today();
        App.ui.exp = raw.exp || null;
        App.ui.lib = raw.lib || null;
        App.ui.insights = raw.insights || null;
        App.ui.goals = raw.goals || null;
        App.ui.doneOpen = raw.doneOpen !== false;
      }
    } catch (e) { }
  }
  App.persistUI = function () {
    try {
      localStorage.setItem(UIKEY, JSON.stringify({
        scheduleDate: App.ui.scheduleDate, exp: App.ui.exp, lib: App.ui.lib, insights: App.ui.insights,
        goals: App.ui.goals, doneOpen: App.ui.doneOpen
      }));
    } catch (e) { }
  };

  /* ---------------- theme ---------------- */
  App.applyTheme = function () {
    const s = Store.state.settings;
    let theme = s.theme || 'auto';
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = theme === 'auto' ? (dark ? 'dark' : 'light') : theme;
    document.documentElement.dataset.accent = s.accent || 'indigo';
    const btn = document.getElementById('btnTheme');
    if (btn) {
      const cur = document.documentElement.dataset.theme;
      btn.innerHTML = Utils.icon(cur === 'dark' ? 'sun' : 'moon', 16);
      btn.title = cur === 'dark' ? '切换到浅色' : '切换到深色';
    }
  };

  /* ---------------- routing ---------------- */
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    if (!h) return { view: 'today', arg: '' };
    const parts = h.split('/');
    return { view: parts[0] || 'today', arg: parts.slice(1).join('/') || '' };
  }
  App.go = function (view, params, opts) {
    opts = opts || {};
    const hash = '#/' + view + (params && params.date ? '/' + params.date : '');
    if (location.hash !== hash) {
      if (opts.replace) history.replaceState(null, '', hash);
      else location.hash = hash;
    }
    App.params = params || {};
    App.render();
  };

  function navBadges() {
    const today = Utils.today();
    const st = Store.dayStats(today);
    const runExps = Store.state.experiments.filter(function (e) { return e.status === 'running'; }).length;
    const reading = Store.state.papers.filter(function (p) { return p.status === 'reading' || p.status === 'todo'; }).length;
    const gs = Store.goalStats();
    return {
      today: st.left > 0 ? st.left : '',
      schedule: '',
      goals: gs.active || '',
      experiments: runExps || '',
      library: reading || '',
      insights: '',
      settings: ''
    };
  }

  function renderSidebar() {
    const nav = document.getElementById('nav');
    const badges = navBadges();
    nav.innerHTML = NAV.map(function (n) {
      return `<button class="nav-item ${App.currentView === n.id ? 'active' : ''}" data-nav="${n.id}">
        <span class="nav-icon">${Utils.icon(n.icon, 18)}</span>
        <span class="nav-label">${n.label}</span>
        ${badges[n.id] !== '' ? '<span class="nav-badge">' + badges[n.id] + '</span>' : ''}
      </button>`;
    }).join('');
    nav.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.nav === 'schedule') App.go('schedule', { date: App.ui.scheduleDate || Utils.today() });
        else App.go(b.dataset.nav);
        closeSidebar();
      });
    });
    const st = Store.dayStats(Utils.today());
    const goal = Store.state.settings.dailyFocusGoal || 180;
    const pct = Math.min(100, Math.round((st.focusMin / goal) * 100));
    document.getElementById('sideStreak').innerHTML = `
      <div class="streak">
        <span class="streak-flame">🔥</span>
        <div class="grow">
          <div class="streak-days">${Store.streak()} 天</div>
          <div class="streak-text">连续科研打卡</div>
        </div>
        <div style="text-align:right">
          <div class="streak-days num" style="font-size:15px">${Utils.durShort(st.focusMin)}</div>
          <div class="streak-text">今日专注</div>
        </div>
      </div>
      <div class="mini-goal">
        <div class="mini-goal-row"><span>今日专注目标 ${Utils.durShort(goal)}</span><span class="num">${pct}%</span></div>
        <div class="mini-goal-bar"><i style="width:${pct}%"></i></div>
      </div>`;
  }

  App.render = function (opts) {
    opts = opts || {};
    const stale = document.getElementById('view');
    const viewEl = stale.cloneNode(false);
    stale.replaceWith(viewEl);
    const route = parseHash();
    let view = route.view;
    if (!Views[view]) view = 'today';
    App.currentView = view;
    App.params = {};
    if (view === 'schedule') App.params.date = route.arg || App.ui.scheduleDate || Utils.today();
    if (view === 'library') App.params.status = route.arg;
    const def = Views[view];
    const scrollY = window.scrollY;
    document.getElementById('pageTitle').textContent = typeof def.title === 'function' ? def.title() : def.title;
    const subEl = document.getElementById('pageSubtitle');
    subEl.textContent = def.subtitle ? def.subtitle(App.params) : '';
    try {
      def.render(viewEl, App.params);
    } catch (e) {
      console.error(e);
      viewEl.innerHTML = '<div class="card"><div class="empty"><div class="empty-title">页面渲染出错了</div>' +
        '<div class="empty-text">' + Utils.esc(e.message) + '</div></div></div>';
    }
    if (def.mount) def.mount(viewEl);
    renderSidebar();
    if (view !== 'today') Pomodoro.render();
    else Pomodoro.updateDynamic();
    if (!opts.noScroll) window.scrollTo(0, opts.keepScroll ? scrollY : 0);
    if (opts.keepFocus) {
      const node = document.querySelector(opts.keepFocus);
      if (node) { node.focus(); if (node.setSelectionRange && node.value) node.setSelectionRange(node.value.length, node.value.length); }
    }
    Pomodoro.restoreTitle();
    Pomodoro.updateDynamic();
  };

  Store.subscribe(function () {
    App.render({ keepScroll: true });
  });

  /* ---------------- sidebar / topbar ---------------- */
  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('scrim').classList.add('show');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('scrim').classList.remove('show');
  }

  function wireShell() {
    document.getElementById('btnMenu').innerHTML = Utils.icon('menu', 18);
    document.getElementById('btnSearch').querySelector('.search-btn-inner').innerHTML =
      Utils.icon('search', 16) + '<span class="search-label">搜索任务 / 实验 / 文献…</span><span class="kbd">Ctrl K</span>';
    document.getElementById('btnQuickExport').innerHTML = Utils.icon('download', 16) + '<span class="hide-mobile">导出</span>';
    document.getElementById('btnNew').addEventListener('click', function (e) { newMenu(e.currentTarget); });
    document.getElementById('btnSearch').addEventListener('click', function () { UI.openSearch(); });
    document.getElementById('btnMenu').addEventListener('click', openSidebar);
    document.getElementById('scrim').addEventListener('click', closeSidebar);
    document.getElementById('btnHelp').innerHTML = Utils.icon('info', 16);
    document.getElementById('btnHelp').addEventListener('click', helpModal);
    document.getElementById('btnBackup').innerHTML = Utils.icon('download', 16);
    document.getElementById('btnBackup').addEventListener('click', function () {
      Store.exportJSON();
      UI.toast('已导出 JSON 备份', { type: 'success' });
      App.render({ keepScroll: true });
    });
    document.getElementById('btnTheme').addEventListener('click', function () {
      const cur = document.documentElement.dataset.theme;
      Store.state.settings.theme = cur === 'dark' ? 'light' : 'dark';
      Store.saveNow();
      App.applyTheme();
      if (App.currentView === 'settings') App.render({ keepScroll: true });
    });
    document.getElementById('btnQuickExport').addEventListener('click', function () {
      if (App.currentView === 'schedule') {
        const d = App.params.date || Utils.today();
        Utils.download('科研日报-' + d + '.md', Store.exportDayMarkdown(d), 'text/markdown');
      } else if (App.currentView === 'insights') {
        Utils.download('科研周报-' + Utils.startOfWeek(Utils.today()) + '.md', Store.exportWeekMarkdown(Utils.today()), 'text/markdown');
      } else {
        Utils.download('科研日报-' + Utils.today() + '.md', Store.exportDayMarkdown(Utils.today()), 'text/markdown');
      }
      UI.toast('已导出 Markdown 文件', { type: 'success' });
    });
    window.addEventListener('hashchange', function () { App.render(); });
  }

  function newMenu(anchor) {
    UI.menu(anchor, [
      { icon: 'checkCircle', label: '新建任务', onClick: function () { App.openTaskEditor(); } },
      { icon: 'flask', label: '新建实验', onClick: function () { App.openExperimentEditor(); } },
      { icon: 'book', label: '添加文献', onClick: function () { App.openPaperEditor(); } },
      { icon: 'upload', label: '导入 BibTeX 文献', onClick: function () { Views.library.openBibtex(); } },
      { icon: 'bulb', label: '写一条速记', onClick: function () {
        UI.prompt({ title: '写一条速记', multiline: true, size: 'slim', placeholder: '实验想法 / 灵感 / 待查问题…', okLabel: '保存' })
          .then(function (v) { if (v) { Store.addNote(v, ''); UI.toast('已保存速记', { type: 'success' }); } });
      } },
      { icon: 'refresh', label: '新建常规安排', onClick: function () { App.routineEditor(); } },
      { sep: true },
      { icon: 'clock', label: '开始 / 暂停番茄钟', onClick: function () { Pomodoro.toggle(); } },
      { icon: 'search', label: '全局搜索', onClick: function () { UI.openSearch(); } }
    ], { align: 'right' });
  }

  /* ---------------- shortcuts ---------------- */
  function isTyping(e) {
    const t = e.target;
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  }
  function wireKeys() {
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); UI.openSearch(); return; }
      if (UI.searchIsOpen() || UI.anyOpen()) return;
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (k === '/') { e.preventDefault(); UI.openSearch(); }
      else if (k === 'n') { e.preventDefault(); App.openTaskEditor(); }
      else if (k === 'p') { e.preventDefault(); Pomodoro.toggle(); }
      else if (k === 't') { e.preventDefault(); App.go('today'); }
      else if (k >= '1' && k <= '9' && NAV[Number(k) - 1]) {
        const idx = Number(k) - 1;
        if (NAV[idx]) {
          e.preventDefault();
          if (NAV[idx].id === 'schedule') App.go('schedule', { date: App.ui.scheduleDate || Utils.today() });
          else App.go(NAV[idx].id);
        }
      }
    });
  }
  /* ---------------- shared editors ---------------- */
  function catChips(selected, name) {
    return '<div class="chips" data-chips="' + name + '">' + Utils.CATS.map(function (c) {
      return `<button class="chip ${selected === c.id ? 'active' : ''}" data-cat="${c.id}"><i class="dot" style="--c:${c.color}"></i>${c.id}</button>`;
    }).join('') + '</div>';
  }

  App.openTaskEditor = function (id, preset) {
    const existing = id ? Store.state.tasks.find(function (x) { return x.id === id; }) : null;
    const t = existing ? Object.assign({}, existing) : Object.assign({
      id: null, title: '', date: Utils.today(), start: '', end: '', category: '实验',
      priority: 2, est: 60, notes: '', expId: '', paperId: ''
    }, preset || {});
    const isNew = !existing;
    const body = `
      <div class="field"><label>任务内容</label>
        <textarea class="textarea" id="tkTitle" style="min-height:52px" placeholder="要做什么？尽量具体，例如：完成 LDH 酶活正式实验并导出数据">${Utils.esc(t.title)}</textarea></div>
      <div class="form-grid mt-14">
        <div class="field"><label>日期</label>
          <input class="input" type="date" id="tkDate" value="${t.date}"></div>
        <div class="field"><label>预计时长（分钟）</label>
          <div class="row" style="gap:6px">
            <input class="input" type="number" min="5" step="5" id="tkEst" value="${t.est || 60}" style="width:88px">
            <button class="btn btn-sm" data-quick="30">30m</button>
            <button class="btn btn-sm" data-quick="60">1h</button>
            <button class="btn btn-sm" data-quick="120">2h</button>
          </div></div>
        <div class="field"><label>开始时间 <span class="opt">选填</span></label>
          <input class="input" type="time" id="tkStart" value="${t.start || ''}"></div>
        <div class="field"><label>结束时间 <span class="opt">选填</span></label>
          <input class="input" type="time" id="tkEnd" value="${t.end || ''}"></div>
        <div class="field full"><label>快捷时间</label>
          <div class="chips">
            <button class="chip" data-range="none">不设时间（灵活任务）</button>
            <button class="chip" data-range="09:00-11:00">上午 9:00-11:00</button>
            <button class="chip" data-range="14:00-16:00">下午 14:00-16:00</button>
            <button class="chip" data-range="19:00-21:00">晚上 19:00-21:00</button>
            <button class="chip" data-range="tomorrow">顺延到明天</button>
          </div></div>
        <div class="field full"><label>类别</label><div id="tkCatHost">${catChips(t.category, 'task')}</div></div>
        <div class="field full"><label>优先级</label>
          <div class="segmented" id="tkPriHost">
            ${Utils.PRIOS.slice().reverse().map(function (p) {
              return `<button class="segmented-item ${t.priority === p.id ? 'active' : ''}" data-pri="${p.id}" style="--c:${p.color}"><i class="dot"></i>${p.label}</button>`;
            }).join('')}
          </div></div>
        <div class="field full"><label>备注 <span class="opt">选填</span></label>
          <textarea class="textarea" id="tkNotes" style="min-height:60px" placeholder="关键参数、注意事项、参考文献…">${Utils.esc(t.notes)}</textarea></div>
        <div class="field"><label>关联实验 <span class="opt">选填</span></label>
          <div class="select-wrap"><select class="select" id="tkExp"><option value="">不关联</option>
            ${Store.state.experiments.map(function (e) {
              return `<option value="${e.id}" ${t.expId === e.id ? 'selected' : ''}>${Utils.esc(Utils.truncate(e.title, 28))}</option>`;
            }).join('')}</select></div></div>
        <div class="field"><label>关联文献 <span class="opt">选填</span></label>
          <div class="select-wrap"><select class="select" id="tkPaper"><option value="">不关联</option>
            ${Store.state.papers.map(function (p) {
              return `<option value="${p.id}" ${t.paperId === p.id ? 'selected' : ''}>${Utils.esc(Utils.truncate(p.title, 28))}</option>`;
            }).join('')}</select></div></div>
      </div>`;
    const h = UI.openModal({
      size: 'wide',
      icon: 'checkCircle',
      title: isNew ? '新建任务' : '编辑任务',
      sub: isNew ? '写清楚「做什么 + 做到什么程度」，执行时更省力' : ('创建于 ' + Utils.relTime(t.createdAt)),
      body: body,
      footer: `${isNew ? '' : '<button class="btn btn-danger" data-act="del">' + Utils.icon('trash', 15) + ' 删除</button>'}
        <div class="spacer"></div>
        <button class="btn" data-act="cancel">取消</button>
        <button class="btn btn-primary" data-act="save">${isNew ? '添加任务' : '保存'}</button>`,
      onMount: function (h) {
        const q = function (sel) { return h.wrap.querySelector(sel); };
        q('#tkCatHost').addEventListener('click', function (e) {
          const b = e.target.closest('[data-cat]');
          if (!b) return;
          t.category = b.dataset.cat;
          q('#tkCatHost').querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('active', x === b); });
        });
        q('#tkPriHost').addEventListener('click', function (e) {
          const b = e.target.closest('[data-pri]');
          if (!b) return;
          t.priority = Number(b.dataset.pri);
          q('#tkPriHost').querySelectorAll('.segmented-item').forEach(function (x) { x.classList.toggle('active', x === b); });
        });
        h.wrap.querySelectorAll('[data-quick]').forEach(function (b) {
          b.addEventListener('click', function () { q('#tkEst').value = b.dataset.quick; });
        });
        h.wrap.querySelectorAll('[data-range]').forEach(function (b) {
          b.addEventListener('click', function () {
            const v = b.dataset.range;
            if (v === 'none') { q('#tkStart').value = ''; q('#tkEnd').value = ''; }
            else if (v === 'tomorrow') { q('#tkDate').value = Utils.addDays(q('#tkDate').value || Utils.today(), 1); }
            else {
              const p = v.split('-');
              q('#tkStart').value = p[0]; q('#tkEnd').value = p[1];
              const mins = Utils.timeToMin(p[1]) - Utils.timeToMin(p[0]);
              if (mins > 0) q('#tkEst').value = mins;
            }
          });
        });
        if (preset && preset.focusTime) {
          const node = q('#tkStart');
          if (node) node.focus();
        }
        q('[data-act=cancel]').addEventListener('click', function () { h.close(); });
        const delBtn = q('[data-act=del]');
        if (delBtn) {
          delBtn.addEventListener('click', function () {
            Store.deleteTask(t.id);
            h.close();
            UI.toast('已删除任务', { action: { label: '撤销', onClick: function () { Store.undo(); } } });
          });
        }
        q('[data-act=save]').addEventListener('click', function () {
          const data = {
            title: q('#tkTitle').value.trim() || '未命名任务',
            date: q('#tkDate').value || Utils.today(),
            start: q('#tkStart').value || '',
            end: q('#tkEnd').value || '',
            est: Math.max(5, Number(q('#tkEst').value) || 60),
            category: t.category,
            priority: t.priority,
            notes: q('#tkNotes').value.trim(),
            expId: q('#tkExp').value,
            paperId: q('#tkPaper').value
          };
          if (data.start && data.end && Utils.timeToMin(data.end) <= Utils.timeToMin(data.start)) data.end = '';
          if (data.start && data.end) data.est = Utils.timeToMin(data.end) - Utils.timeToMin(data.start);
          if (isNew) {
            Store.addTask(data);
            UI.toast('任务已添加', { type: 'success' });
          } else {
            Store.updateTask(t.id, data);
            UI.toast('任务已更新', { type: 'success' });
          }
          h.close();
          if (data.date !== Utils.today() && App.currentView === 'today') {
            UI.toast('该任务在 ' + Utils.fmtDate(data.date, 'md') + '，可在「日程安排」查看', { type: 'info', duration: 3500 });
          }
        });
      }
    });
    return h;
  };

  App.routineEditor = function (id) {
    const existing = id ? Store.state.routines.find(function (x) { return x.id === id; }) : null;
    const r = existing ? Object.assign({}, existing) : { id: null, title: '', category: '文献', start: '', end: '', repeat: 'daily', active: true };
    const isNew = !existing;
    const h = UI.openModal({
      size: 'slim',
      icon: 'refresh',
      title: isNew ? '新建常规安排' : '编辑常规安排',
      sub: '常规安排会按设定周期每天出现在今日列表中',
      body: `
        <div class="field"><label>内容</label>
          <input class="input" id="rtTitle" value="${Utils.esc(r.title)}" placeholder="例如：每日文献精读 1 篇"></div>
        <div class="field mt-10"><label>类别</label><div id="rtCatHost">${catChips(r.category, 'routine')}</div></div>
        <div class="form-grid mt-14">
          <div class="field"><label>开始时间 <span class="opt">选填</span></label>
            <input class="input" type="time" id="rtStart" value="${r.start || ''}"></div>
          <div class="field"><label>结束时间 <span class="opt">选填</span></label>
            <input class="input" type="time" id="rtEnd" value="${r.end || ''}"></div>
          <div class="field full"><label>重复</label>
            <div class="segmented" id="rtRepeatHost">
              <button class="segmented-item ${r.repeat === 'daily' ? 'active' : ''}" data-rep="daily">每天</button>
              <button class="segmented-item ${r.repeat === 'weekdays' ? 'active' : ''}" data-rep="weekdays">工作日</button>
              <button class="segmented-item ${r.repeat === 'weekend' ? 'active' : ''}" data-rep="weekend">周末</button>
            </div></div>
        </div>`,
      footer: `${isNew ? '' : '<button class="btn btn-danger" data-act="del">' + Utils.icon('trash', 15) + ' 删除</button>'}
        <div class="spacer"></div><button class="btn" data-act="cancel">取消</button>
        <button class="btn btn-primary" data-act="save">${isNew ? '添加' : '保存'}</button>`,
      onMount: function (h) {
        const q = function (sel) { return h.wrap.querySelector(sel); };
        q('#rtCatHost').addEventListener('click', function (e) {
          const b = e.target.closest('[data-cat]');
          if (!b) return;
          r.category = b.dataset.cat;
          q('#rtCatHost').querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('active', x === b); });
        });
        q('#rtRepeatHost').addEventListener('click', function (e) {
          const b = e.target.closest('[data-rep]');
          if (!b) return;
          r.repeat = b.dataset.rep;
          q('#rtRepeatHost').querySelectorAll('.segmented-item').forEach(function (x) { x.classList.toggle('active', x === b); });
        });
        q('[data-act=cancel]').addEventListener('click', function () { h.close(); });
        const delBtn = q('[data-act=del]');
        if (delBtn) delBtn.addEventListener('click', function () {
          Store.deleteRoutine(r.id); h.close();
          UI.toast('已删除常规安排', { action: { label: '撤销', onClick: function () { Store.undo(); } } });
        });
        q('[data-act=save]').addEventListener('click', function () {
          const data = {
            title: q('#rtTitle').value.trim() || '新的常规安排',
            category: r.category, repeat: r.repeat,
            start: q('#rtStart').value || '', end: q('#rtEnd').value || ''
          };
          if (isNew) Store.addRoutine(data); else Store.updateRoutine(r.id, data);
          UI.toast(isNew ? '已添加常规安排' : '已更新', { type: 'success' });
          h.close();
        });
      }
    });
    return h;
  };

  App.openNote = function (id) {
    const n = Store.state.notes.find(function (x) { return x.id === id; });
    if (!n) return;
    const h = UI.openModal({
      size: 'slim', icon: 'bulb', title: '速记详情', sub: '创建于 ' + Utils.dtText(n.createdAt),
      body: `<div class="field"><label>标题</label><input class="input" id="ntTitle" value="${Utils.esc(n.title)}" placeholder="选填"></div>
        <div class="field mt-10"><label>内容</label>
        <textarea class="textarea" id="ntContent" style="min-height:150px">${Utils.esc(n.content)}</textarea></div>`,
      footer: '<button class="btn btn-danger" data-act="del">' + Utils.icon('trash', 15) + ' 删除</button><div class="spacer"></div>' +
        '<button class="btn" data-act="cancel">取消</button><button class="btn btn-primary" data-act="save">保存</button>',
      onMount: function (h) {
        const q = function (sel) { return h.wrap.querySelector(sel); };
        q('[data-act=cancel]').addEventListener('click', function () { h.close(); });
        q('[data-act=del]').addEventListener('click', function () {
          Store.deleteNote(n.id); h.close();
          UI.toast('已删除速记', { action: { label: '撤销', onClick: function () { Store.undo(); } } });
        });
        q('[data-act=save]').addEventListener('click', function () {
          Store.updateNote(n.id, { title: q('#ntTitle').value.trim(), content: q('#ntContent').value.trim() });
          UI.toast('已保存', { type: 'success' });
          h.close();
        });
      }
    });
    return h;
  };

  App.openNotesList = function () {
    const notes = Store.state.notes;
    const h = UI.openModal({
      size: 'wide', icon: 'bulb', title: '全部速记', sub: '共 ' + notes.length + ' 条 · 点击可编辑',
      body: notes.length ? `<div class="stack-sm" style="max-height:52vh;overflow:auto">${notes.map(function (n) {
        return `<div class="review-item" data-note-row="${n.id}" style="cursor:pointer;align-items:flex-start">
          <span class="icon-inline" style="color:var(--c-data);margin-top:3px">${Utils.icon('bulb', 15)}</span>
          <div class="grow">
            ${n.title ? '<div class="bold text-sm">' + Utils.esc(n.title) + '</div>' : ''}
            <div class="text-sm" style="white-space:pre-wrap">${Utils.esc(n.content)}</div>
            <div class="text-xs text-3 mt-6">${Utils.dtText(n.createdAt)}</div>
          </div>
          <button class="mini-btn danger-hover" data-note-del="${n.id}" title="删除">${Utils.icon('trash', 14)}</button>
        </div>`;
      }).join('')}</div>` : '<div class="empty"><div class="empty-text">还没有速记，在「今日」页面右下角可以随手记录。</div></div>',
      footer: '<div class="spacer"></div><button class="btn btn-primary" data-act="close">完成</button>',
      onMount: function (h) {
        h.wrap.querySelector('[data-act=close]').addEventListener('click', function () { h.close(); });
        h.wrap.querySelectorAll('[data-note-del]').forEach(function (b) {
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            Store.deleteNote(b.dataset.noteDel);
            b.closest('[data-note-row]').remove();
            UI.toast('已删除速记', { action: { label: '撤销', onClick: function () { Store.undo(); } } });
          });
        });
        h.wrap.querySelectorAll('[data-note-row]').forEach(function (row) {
          row.addEventListener('click', function () {
            h.close();
            setTimeout(function () { App.openNote(row.dataset.noteRow); }, 100);
          });
        });
      }
    });
    return h;
  };

  function helpModal() {
    UI.openModal({
      size: 'slim', icon: 'info', title: '使用帮助',
      body: `<div class="about-box">
        <p><b>1. 快速记录</b>：在「今日」的输入框里用自然写法记录，例如 <code>9:00-10:30 跑 WB #实验 !高</code>，回车即可。</p>
        <p class="mt-10"><b>2. 专注计时</b>：点任务右侧 ▶ 直接把该任务设为专注对象；番茄钟在切换页面后仍会在右下角继续计时。</p>
        <p class="mt-10"><b>3. 实验管理</b>：在看板上拖动卡片即可改变状态；每个实验都可以记录步骤、进展与结论，形成完整实验档案。</p>
        <p class="mt-10"><b>4. 文献阅读</b>：支持粘贴 BibTeX 批量导入；点「+15m」自动累计阅读时长并计入今日统计。</p>
        <p class="mt-10"><b>5. 复盘</b>：每周五在「复盘统计」写三条复盘，点「生成周报」可一键导出 Markdown 周报。</p>
        <p class="mt-10"><b>6. 数据安全</b>：数据存在浏览器本地，请定期在「设置」中导出 JSON 备份。</p>
      </div>`,
      footer: '<div class="spacer"></div><button class="btn btn-primary" data-act="ok">知道了</button>',
      onMount: function (h) {
        h.wrap.querySelector('[data-act=ok]').addEventListener('click', function () { h.close(); });
      }
    });
  }

  /* ---------------- cross-view openers ---------------- */
  App.openTask = function (id) { App.openTaskEditor(id); };
  App.openExperiment = function (id) { Views.experiments.openDetail(id); };
  App.openPaper = function (id) { Views.library.openDetail(id); };
  App.openExperimentEditor = function (preset) { Views.experiments.openNew(preset || {}); };
  App.openPaperEditor = function (preset) { Views.library.openNew(preset || {}); };

  /* ---------------- init ---------------- */
  function checkRollover() {
    let last = Utils.today();
    setInterval(function () {
      const now = Utils.today();
      if (now !== last) {
        last = now;
        App.ui.scheduleDate = now;
        App.render();
        UI.toast('新的一天开始了，来规划今天的科研安排吧 ☀️', { type: 'info', duration: 6000 });
      }
    }, 30000);
  }

  function init() {
    loadUI();
    App.applyTheme();
    wireShell();
    wireKeys();
    checkRollover();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { App.applyTheme(); });
    if (!location.hash) {
      history.replaceState(null, '', '#/today');
    }
    if (App.ui.exp && !App.ui.exp.view) App.ui.exp.view = 'board';
    App.render({ noScroll: true });
    Store.syncRemote().then(function (info) {
      if (!info || info.mode === 'browser') return;
      if (info.mode === 'file') {
        if (info.adopted) UI.toast('已从数据文件载入最新数据', { type: 'info', duration: 4000 });
        else UI.toast('数据已保存到本机文件（data 文件夹）', { type: 'success', duration: 3200 });
      } else if (info.mode === 'offline') {
        UI.toast('本地数据服务未响应，数据暂存在浏览器中', { type: 'error', duration: 7000 });
      }
    });
    const empty = !Store.state.tasks.length && !Store.state.experiments.length &&
      !Store.state.papers.length && !Store.state.notes.length && !Store.state.goals.length;
    if (empty) {
      setTimeout(function () {
        UI.toast('欢迎使用科研日课 👋 数据保存在本地，随时可在设置中备份', { type: 'info', duration: 6000 });
      }, 700);
    }
    if (!Store.isStorageOK()) {
      setTimeout(function () { UI.toast('本地存储不可用，请及时导出备份', { type: 'error', duration: 8000 }); }, 900);
    }
    App.booted = true;
  }

  App.init = init;
  App.help = helpModal;

  return App;
})();

document.addEventListener('DOMContentLoaded', function () {
  App.init();
});




