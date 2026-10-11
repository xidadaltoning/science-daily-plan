/* ============================================================
   科研日课 · pomodoro.js
   番茄钟：跨页面常驻、刷新可恢复、完成自动记录专注时长
   ============================================================ */
window.Pomodoro = (function () {
  const KEY = 'research-daily-pomodoro-v1';
  const MODES = {
    work: { label: '专注', field: 'work' },
    short: { label: '短休息', field: 'short' },
    long: { label: '长休息', field: 'long' }
  };
  let st = { mode: 'work', running: false, endTs: 0, remaining: 0, total: 0, cycles: 0, taskId: '', category: '实验' };
  let timer = null;
  let floatEl = null;
  let lastTitle = '';

  function settings() { return Store.state.settings.pomodoro; }
  function modeMinutes(m) { return Math.max(1, Number(settings()[MODES[m || st.mode].field]) || 25); }

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
    if (saved && typeof saved === 'object') {
      st = Object.assign(st, saved);
      if (st.running && st.endTs) {
        const remain = (st.endTs - Date.now()) / 1000;
        if (remain <= 0) {
          const minutes = st.total || modeMinutes(st.mode);
          if (st.mode === 'work') recordWork(minutes);
          st.running = false;
          st.mode = nextMode();
          st.total = modeMinutes(st.mode) * 60;
          st.remaining = st.total;
          st.endTs = 0;
          saveState();
        } else {
          st.remaining = remain;
        }
      }
    } else {
      st.total = modeMinutes('work') * 60;
      st.remaining = st.total;
    }
    if (st.running) startTick();
  }
  function saveState() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { }
  }
  function recordWork(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    let category = st.category || '实验';
    const task = st.taskId ? Store.state.tasks.find(function (t) { return t.id === st.taskId; }) : null;
    if (task) category = task.category;
    Store.addSession({ minutes: minutes, category: category, taskId: st.taskId || '', date: Utils.today() });
    st.cycles = (st.cycles || 0) + 1;
    saveState();
  }

  function nextMode() {
    const cfg = settings();
    if (st.mode !== 'work') return 'work';
    const every = Math.max(1, Number(cfg.longEvery) || 4);
    return ((st.cycles || 0) % every === 0 && (st.cycles || 0) > 0) ? 'long' : 'short';
  }

  function start() {
    if (st.running) return;
    const total = st.remaining > 0 ? st.remaining : modeMinutes() * 60;
    st.total = st.total || modeMinutes() * 60;
    st.running = true;
    st.endTs = Date.now() + total * 1000;
    st.remaining = total;
    startTick();
    saveState();
    render();
  }
  function pause() {
    if (!st.running) return;
    st.remaining = Math.max(0, (st.endTs - Date.now()) / 1000);
    st.running = false;
    st.endTs = 0;
    stopTick();
    saveState();
    render();
  }
  function toggle() { st.running ? pause() : start(); }
  function reset() {
    stopTick();
    st.running = false;
    st.endTs = 0;
    st.total = modeMinutes() * 60;
    st.remaining = st.total;
    saveState();
    render();
  }
  function skip() {
    stopTick();
    st.running = false;
    st.endTs = 0;
    if (st.mode === 'work' && (st.total - st.remaining) > 60) recordWork(st.total - st.remaining);
    st.mode = nextMode();
    st.total = modeMinutes() * 60;
    st.remaining = st.total;
    saveState();
    render();
  }
  function setMode(mode) {
    stopTick();
    st.mode = mode;
    st.running = false;
    st.endTs = 0;
    st.total = modeMinutes(mode) * 60;
    st.remaining = st.total;
    saveState();
    render();
  }
  function complete() {
    stopTick();
    st.running = false;
    st.endTs = 0;
    const cfg = settings();
    const finishedMode = st.mode;
    const wasWork = finishedMode === 'work';
    if (wasWork) recordWork(st.total);
    if (cfg.sound) Utils.beep('done');
    st.mode = nextMode();
    st.total = modeMinutes(st.mode) * 60;
    st.remaining = st.total;
    const nextLabel = MODES[st.mode].label;
    if (wasWork) {
      UI.toast('专注完成 · 已记录 ' + Utils.durText(Math.round(st.total / 60)) + ' 专注时长 · 接下来：' + nextLabel, { type: 'success', duration: 5000 });
    } else {
      UI.toast(finishedMode === 'long' ? '长休息结束 · 开始新的专注' : '休息结束 · 继续加油', { type: 'info' });
    }
    saveState();
    render();
    if (cfg.autoNext) setTimeout(function () { start(); }, 1200);
  }

  function startTick() {
    stopTick();
    timer = setInterval(function () {
      if (!st.running) return;
      st.remaining = Math.max(0, (st.endTs - Date.now()) / 1000);
      if (st.remaining <= 0.4) { complete(); return; }
      updateDynamic();
    }, 250);
    updateDynamic();
  }
  function stopTick() { if (timer) { clearInterval(timer); timer = null; } }

  function timeText() {
    const total = Math.max(0, Math.ceil(st.remaining || 0));
    const m = Math.floor(total / 60), s = total % 60;
    return Utils.pad2(m) + ':' + Utils.pad2(s);
  }
  function progress() {
    const total = st.total || 1;
    return 1 - Utils.clamp((st.remaining || 0) / total, 0, 1);
  }

  /* ---------- view: card in today page ---------- */
  function cardHTML() {
    const cfg = settings();
    const mode = st.mode;
    const tasks = Store.tasksOn(Utils.today()).filter(function (t) { return !t.done; });
    const stats = Store.dayStats(Utils.today());
    const goal = Store.state.settings.dailyFocusGoal || 180;
    const workSessions = Store.sessionsOn(Utils.today()).filter(function (s) { return s.minutes >= 5; }).length;
    const size = 168, stroke = 12;
    return '<section class="card pomo ' + (st.running ? 'pomo-running' : '') + '" id="pomoCard">' +
      '<div class="card-head">' +
        '<div class="card-title"><span class="icon-inline">' + Utils.icon('clock', 17) + '</span>专注计时</div>' +
        '<div class="spacer"></div>' +
        '<span class="pill" id="pomoStateLabel">' + (st.running ? '进行中' : (st.remaining < (st.total || 1) ? '已暂停' : '待开始')) + '</span>' +
      '</div>' +
      '<div class="pomo-modes">' +
        ['work', 'short', 'long'].map(function (m) {
          return '<button class="pomo-mode ' + (mode === m ? 'active' : '') + '" data-pomo-mode="' + m + '">' + MODES[m].label + '</button>';
        }).join('') +
      '</div>' +
      '<div class="pomo-center">' +
        '<div id="pomoRing">' + Charts.ring({ value: progress(), max: 1, size: size, stroke: stroke, color: 'var(--accent)' }) + '</div>' +
        '<div class="pomo-time"><b id="pomoTime">' + timeText() + '</b><span id="pomoModeLabel">' + MODES[mode].label + ' · ' + modeMinutes(mode) + ' 分钟</span></div>' +
      '</div>' +
      '<div class="pomo-controls">' +
        '<button class="btn ' + (st.running ? '' : 'btn-primary') + '" data-pomo="toggle" style="min-width:112px">' +
          '<span class="btn-icon">' + Utils.icon(st.running ? 'pause' : 'play', 15) + '</span><span>' + (st.running ? '暂停' : (st.remaining < (st.total || 1) ? '继续' : (mode === 'work' ? '开始专注' : '开始休息'))) + '</span>' +
        '</button>' +
        '<button class="btn" data-pomo="reset" title="重置">' + Utils.icon('reset', 15) + '</button>' +
        '<button class="btn" data-pomo="skip" title="跳过当前阶段">' + Utils.icon('skip', 15) + '</button>' +
      '</div>' +
      '<div class="pomo-link">' +
        '<span class="text-xs text-3" style="width:34px">关联</span>' +
        '<div class="select-wrap grow"><select class="select" id="pomoTaskSelect">' +
          '<option value="">自由专注</option>' +
          tasks.map(function (t) {
            return '<option value="' + t.id + '"' + (st.taskId === t.id ? ' selected' : '') + '>' + Utils.esc(Utils.truncate(t.title, 26)) + '</option>';
          }).join('') +
        '</select></div>' +
      '</div>' +
      '<div class="pomo-link" style="margin-top:9px;padding-top:0;border-top:0">' +
        '<span class="text-xs text-3" style="width:34px">类别</span>' +
        '<div class="select-wrap grow"><select class="select" id="pomoCatSelect">' +
          Utils.CATS.map(function (c) {
            return '<option value="' + c.id + '"' + (st.category === c.id ? ' selected' : '') + '>' + c.id + '</option>';
          }).join('') +
        '</select></div>' +
      '</div>' +
      '<div class="pomo-stats">' +
        '<div class="pomo-stat"><b class="num">' + workSessions + '</b><span>今日番茄</span></div>' +
        '<div class="pomo-stat"><b class="num">' + Utils.durShort(stats.focusMin) + '</b><span>专注时长</span></div>' +
        '<div class="pomo-stat"><b class="num">' + Math.min(100, Math.round((stats.focusMin / goal) * 100)) + '%</b><span>目标' + Utils.durShort(goal) + '</span></div>' +
      '</div>' +
    '</section>';
  }

  function mount(container) {
    if (!container) return;
    container.querySelectorAll('[data-pomo-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.dataset.pomoMode); });
    });
    container.querySelectorAll('[data-pomo]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        const a = b.dataset.pomo;
        if (a === 'toggle') toggle();
        else if (a === 'reset') reset();
        else if (a === 'skip') skip();
      });
    });
    const sel = container.querySelector('#pomoTaskSelect');
    if (sel) sel.addEventListener('change', function () { st.taskId = sel.value; saveState(); });
    const cat = container.querySelector('#pomoCatSelect');
    if (cat) cat.addEventListener('change', function () { st.category = cat.value; saveState(); });
  }

  /* ---------- floating widget ---------- */
  function floatHTML() {
    return '<div class="pf-dot"></div>' +
      '<div class="pf-main"><b id="pfTime">' + timeText() + '</b><span id="pfLabel">' + MODES[st.mode].label + '</span></div>' +
      '<button class="pf-btn" data-pf="toggle" title="开始 / 暂停">' + Utils.icon(st.running ? 'pause' : 'play', 15) + '</button>' +
      '<button class="pf-btn" data-pf="reset" title="重置">' + Utils.icon('reset', 15) + '</button>';
  }
  function ensureFloat() {
    if (!floatEl) {
      floatEl = document.createElement('div');
      floatEl.className = 'pomo-float';
      floatEl.id = 'pomoFloat';
      document.body.appendChild(floatEl);
      floatEl.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-pf]');
        if (btn) {
          e.stopPropagation();
          if (btn.dataset.pf === 'toggle') toggle();
          else if (btn.dataset.pf === 'reset') reset();
          return;
        }
        if (App.currentView !== 'today') App.go('today');
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    return floatEl;
  }
  function updateFloat() {
    const active = st.running || (st.remaining > 0 && st.remaining < (st.total || 1) - 1);
    if (!active) {
      if (floatEl) floatEl.classList.remove('show');
      return;
    }
    const node = ensureFloat();
    floatEl.classList.add('show');
    const onTop = App.currentView === 'today' && window.scrollY < 220;
    floatEl.classList.toggle('dim', onTop);
    const t = node.querySelector('#pfTime'), l = node.querySelector('#pfLabel');
    if (t) t.textContent = timeText();
    if (l) l.textContent = MODES[st.mode].label + (st.running ? '中' : ' · 已暂停');
    const toggler = node.querySelector('[data-pf=toggle]');
    if (toggler) toggler.innerHTML = Utils.icon(st.running ? 'pause' : 'play', 15);
  }

  /* ---------- DOM updates ---------- */
  function updateDynamic() {
    const time = document.getElementById('pomoTime');
    if (time) time.textContent = timeText();
    const ring = document.getElementById('pomoRing');
    if (ring) {
      const size = 168, stroke = 12;
      ring.innerHTML = Charts.ring({ value: progress(), max: 1, size: size, stroke: stroke, color: 'var(--accent)' });
    }
    updateFloat();
    updateTitle();
  }
  function updateTitle() {
    let t = '科研日课 · Research Daily';
    if (st.running || (st.remaining > 0 && st.remaining < (st.total || 1) - 1)) {
      t = timeText() + ' · ' + MODES[st.mode].label + ' · 科研日课';
    }
    if (t !== lastTitle) { document.title = t; lastTitle = t; }
  }
  function render() {
    const host = document.getElementById('pomoCardHost');
    if (host) {
      host.innerHTML = cardHTML();
      mount(host);
    }
    updateDynamic();
    updateFloat();
  }
  function state() { return st; }
  function restoreTitle() { document.title = '科研日课 · Research Daily'; lastTitle = ''; }

  load();
  return {
    cardHTML: cardHTML, mount: mount, render: render, updateDynamic: updateDynamic,
    start: start, pause: pause, toggle: toggle, reset: reset, skip: skip, setMode: setMode,
    state: state, restoreTitle: restoreTitle
  };
})();



