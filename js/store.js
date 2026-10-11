/* ============================================================
   科研日课 · store.js
   本地数据层：状态 / 增删改查 / 统计 / 备份导入导出
   ============================================================ */
window.Store = (function () {
  const KEY = 'research-daily-v1';
  const VERSION = 1;
  let state = null;
  let listeners = [];
  let saveTimer = null;
  let storageOK = true;
  let undoStack = [];

  function defaults() {
    return {
      version: VERSION,
      settings: {
        name: '', field: '',
        dailyFocusGoal: 180, dailyTaskGoal: 5, weeklyTaskGoal: 25,
        theme: 'auto', accent: 'indigo',
        pomodoro: { work: 25, short: 5, long: 15, longEvery: 4, sound: true, autoNext: false },
        lastBackupAt: null,
        createdAt: Date.now()
      },
      tasks: [], routines: [], routineLog: {},
      experiments: [], papers: [], notes: [], reviews: {}, sessions: [],
      goals: [],
      meta: { savedAt: 0 }
    };
  }

  function normalize(parsed) {
    const out = Object.assign(defaults(), parsed || {});
    out.settings = Object.assign(defaults().settings, (parsed || {}).settings || {});
    out.settings.pomodoro = Object.assign(defaults().settings.pomodoro, ((parsed || {}).settings || {}).pomodoro || {});
    ['tasks', 'routines', 'experiments', 'papers', 'notes', 'sessions', 'goals'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    if (typeof out.routineLog !== 'object' || !out.routineLog) out.routineLog = {};
    if (typeof out.reviews !== 'object' || !out.reviews) out.reviews = {};
    if (typeof out.meta !== 'object' || !out.meta) out.meta = { savedAt: 0 };
    out.goals.forEach(function (g) {
      if (!Array.isArray(g.milestones)) g.milestones = [];
      if (!Array.isArray(g.expIds)) g.expIds = [];
      if (!Array.isArray(g.paperIds)) g.paperIds = [];
    });
    out.version = VERSION;
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? normalize(JSON.parse(raw)) : defaults();
    } catch (e) {
      console.warn('读取本地数据失败，已重置为空白数据', e);
      state = defaults();
    }
  }

  function saveNow() {
    if (!state.meta) state.meta = { savedAt: 0 };
    state.meta.savedAt = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      storageOK = true;
    } catch (e) {
      storageOK = false;
      console.warn('保存失败', e);
    }
    scheduleRemotePush();
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 260);
  }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
  function emit() { save(); listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); }

  /* ---------------- 本地文件服务（可选） ----------------
     用「启动科研日课.bat」打开时，界面运行在 http://127.0.0.1:端口 上，
     数据会同时写入 data/科研日课数据.json，并自动生成每日快照备份。
     直接双击 index.html 时这段逻辑自动跳过，只使用浏览器本地存储。 */
  const remote = { available: false, adopted: false, dataFile: '', savedAt: 0, error: '', backups: 0 };
  let remoteTimer = null;
  let remoteInFlight = false;
  let remoteAgain = false;

  function isFileMode() { return !(location.protocol === 'http:' || location.protocol === 'https:'); }

  function pushRemote() {
    if (isFileMode()) return Promise.resolve(false);
    if (remoteInFlight) { remoteAgain = true; return Promise.resolve(false); }
    remoteInFlight = true;
    return fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      remote.available = true;
      remote.error = '';
      remote.savedAt = Date.now();
      if (data && data.dataFile) remote.dataFile = data.dataFile;
      if (data && typeof data.backupCount === 'number') remote.backups = data.backupCount;
      return true;
    }).catch(function (e) {
      remote.available = false;
      remote.error = String((e && e.message) || e);
      return false;
    }).then(function (ok) {
      remoteInFlight = false;
      if (remoteAgain) { remoteAgain = false; clearTimeout(remoteTimer); remoteTimer = setTimeout(pushRemote, 400); }
      return ok;
    });
  }

  function scheduleRemotePush() {
    if (isFileMode()) return;
    clearTimeout(remoteTimer);
    remoteTimer = setTimeout(pushRemote, 600);
  }

  function syncRemote() {
    if (isFileMode()) return Promise.resolve(remoteStatus());
    return fetch('/api/state', { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      remote.available = true;
      remote.error = '';
      remote.dataFile = (data && data.dataFile) || remote.dataFile;
      remote.backups = (data && data.backupCount) || 0;
      const remoteDoc = data && data.state;
      const localAt = (state.meta && state.meta.savedAt) || 0;
      const remoteAt = (remoteDoc && remoteDoc.meta && remoteDoc.meta.savedAt) || (data && data.savedAt) || 0;
      if (!remoteDoc) {
        return pushRemote().then(function () { return remoteStatus(); });
      }
      if (remoteAt > localAt + 3000) {
        try { localStorage.setItem(KEY + '.replaced.' + Date.now(), JSON.stringify(state)); } catch (e) { }
        state = normalize(remoteDoc);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { }
        remote.adopted = true;
        remote.savedAt = remoteAt;
        emit();
      } else if (localAt > remoteAt + 3000) {
        return pushRemote().then(function () { return remoteStatus(); });
      }
      return remoteStatus();
    }).catch(function (e) {
      remote.available = false;
      remote.error = String((e && e.message) || e);
      return remoteStatus();
    });
  }

  function remoteStatus() {
    return {
      mode: isFileMode() ? 'browser' : (remote.available ? 'file' : 'offline'),
      available: remote.available,
      adopted: remote.adopted,
      dataFile: remote.dataFile,
      savedAt: remote.savedAt,
      backups: remote.backups,
      error: remote.error
    };
  }

  function backupNow() {
    if (isFileMode()) return Promise.resolve(null);
    return fetch('/api/backup', { method: 'POST' }).then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  function revealData() {
    if (isFileMode()) return Promise.resolve(false);
    return fetch('/api/reveal', { method: 'POST' }).then(function (r) { return r.json(); })
      .then(function (d) { return !!(d && d.ok); }).catch(function () { return false; });
  }

  function pushUndo(label, fn) {
    undoStack.push({ label: label, fn: fn, ts: Date.now() });
    if (undoStack.length > 30) undoStack.shift();
  }
  function undo() {
    const item = undoStack.pop();
    if (!item) return null;
    item.fn();
    emit();
    return item.label;
  }
  function hasUndo() { return undoStack.length > 0; }

  /* ---------------- tasks ---------------- */
  function tasksOn(date) {
    return state.tasks.filter(function (t) { return t.date === date; }).sort(function (a, b) {
      const at = a.start || '99:99', bt = b.start || '99:99';
      if (at !== bt) return at < bt ? -1 : 1;
      return (a.order || 0) - (b.order || 0);
    });
  }
  function tasksBetween(start, end) {
    return state.tasks.filter(function (t) { return t.date >= start && t.date <= end; });
  }
  function addTask(o) {
    const t = Object.assign({
      id: Utils.uid(), title: '未命名任务', date: Utils.today(), start: '', end: '',
      category: '实验', priority: 2, est: 60, done: false, doneAt: null, notes: '',
      expId: '', paperId: '', order: Date.now() % 100000, createdAt: Date.now(), updatedAt: Date.now()
    }, o || {});
    state.tasks.push(t);
    emit();
    return t;
  }
  function updateTask(id, patch) {
    const t = state.tasks.find(function (x) { return x.id === id; });
    if (!t) return null;
    Object.assign(t, patch, { updatedAt: Date.now() });
    emit();
    return t;
  }
  function deleteTask(id) {
    const idx = state.tasks.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    const item = state.tasks[idx];
    state.tasks.splice(idx, 1);
    pushUndo('删除任务', function () { state.tasks.splice(idx, 0, item); });
    emit();
  }
  function toggleTask(id) {
    const t = state.tasks.find(function (x) { return x.id === id; });
    if (!t) return null;
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    t.updatedAt = Date.now();
    emit();
    return t;
  }
  function moveTask(id, date) {
    const t = state.tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    const old = t.date;
    t.date = date; t.updatedAt = Date.now();
    emit();
    return old;
  }
  function reorderTasks(date, orderedIds) {
    orderedIds.forEach(function (id, i) {
      const t = state.tasks.find(function (x) { return x.id === id; });
      if (t) t.order = i;
    });
    emit();
  }
  function postponeTask(id, days) {
    const t = state.tasks.find(function (x) { return x.id === id; });
    if (!t) return null;
    const old = t.date;
    t.date = Utils.addDays(t.date, days || 1);
    t.updatedAt = Date.now();
    emit();
    return old;
  }

  /* ---------------- routines ---------------- */
  function routinesFor(date) {
    const w = Utils.weekday(date);
    return state.routines.filter(function (r) {
      if (r.active === false) return false;
      if (r.repeat === 'weekdays') return w >= 1 && w <= 5;
      if (r.repeat === 'weekend') return w === 0 || w === 6;
      return true;
    }).sort(function (a, b) { return (a.start || '99:99') < (b.start || '99:99') ? -1 : 1; });
  }
  function routineDone(date, id) {
    const list = state.routineLog[date] || [];
    return list.indexOf(id) >= 0;
  }
  function toggleRoutine(date, id) {
    const list = state.routineLog[date] || [];
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    state.routineLog[date] = list;
    emit();
  }
  function addRoutine(o) {
    const r = Object.assign({
      id: Utils.uid(), title: '新的常规安排', category: '文献', start: '', end: '',
      repeat: 'daily', active: true, createdAt: Date.now()
    }, o || {});
    state.routines.push(r); emit(); return r;
  }
  function updateRoutine(id, patch) {
    const r = state.routines.find(function (x) { return x.id === id; });
    if (!r) return null; Object.assign(r, patch); emit(); return r;
  }
  function deleteRoutine(id) {
    const idx = state.routines.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    const item = state.routines[idx];
    state.routines.splice(idx, 1);
    pushUndo('删除常规安排', function () { state.routines.splice(idx, 0, item); });
    emit();
  }
  /* ---------------- experiments ---------------- */
  function addExperiment(o) {
    const e = Object.assign({
      id: Utils.uid(), title: '新实验', status: 'planned', tags: [],
      objective: '', hypothesis: '', materials: '', protocol: '',
      steps: [], results: '', conclusion: '',
      startDate: Utils.today(), endDate: '', paperIds: [], logs: [],
      createdAt: Date.now(), updatedAt: Date.now()
    }, o || {});
    state.experiments.unshift(e);
    emit();
    return e;
  }
  function updateExperiment(id, patch) {
    const e = state.experiments.find(function (x) { return x.id === id; });
    if (!e) return null;
    Object.assign(e, patch, { updatedAt: Date.now() });
    emit();
    return e;
  }
  function deleteExperiment(id) {
    const idx = state.experiments.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    const item = state.experiments[idx];
    state.experiments.splice(idx, 1);
    state.tasks.forEach(function (t) { if (t.expId === id) t.expId = ''; });
    pushUndo('删除实验', function () { state.experiments.splice(idx, 0, item); });
    emit();
  }
  function setExpStatus(id, status) { return updateExperiment(id, { status: status }); }
  function expById(id) { return state.experiments.find(function (x) { return x.id === id; }); }
  function addExpLog(id, text) {
    const e = expById(id);
    if (!e || !text) return null;
    const log = { id: Utils.uid(), ts: Date.now(), text: text };
    e.logs = e.logs || [];
    e.logs.unshift(log);
    e.updatedAt = Date.now();
    emit();
    return log;
  }
  function deleteExpLog(id, logId) {
    const e = expById(id);
    if (!e) return;
    e.logs = (e.logs || []).filter(function (l) { return l.id !== logId; });
    emit();
  }
  function addStep(expId, text) {
    const e = expById(expId);
    if (!e) return null;
    e.steps = e.steps || [];
    const s = { id: Utils.uid(), text: text, done: false };
    e.steps.push(s); emit(); return s;
  }
  function updateStep(expId, stepId, patch) {
    const e = expById(expId);
    if (!e) return;
    const s = (e.steps || []).find(function (x) { return x.id === stepId; });
    if (!s) return;
    Object.assign(s, patch); emit();
  }
  function deleteStep(expId, stepId) {
    const e = expById(expId);
    if (!e) return;
    e.steps = (e.steps || []).filter(function (s) { return s.id !== stepId; });
    emit();
  }
  function expProgress(e) {
    if (e.status === 'done') return 100;
    const steps = e.steps || [];
    if (!steps.length) return e.status === 'running' ? 45 : 0;
    return Math.round((steps.filter(function (s) { return s.done; }).length / steps.length) * 100);
  }

  /* ---------------- papers ---------------- */
  function addPaper(o) {
    const p = Object.assign({
      id: Utils.uid(), title: '未命名文献', authors: '', journal: '', year: '',
      volume: '', pages: '', doi: '', url: '', tags: [], status: 'todo', rating: 0,
      summary: '', keyPoints: '', questions: '', quotes: '', progress: 0,
      logs: [], expIds: [], addedAt: Date.now(), startedAt: null, readAt: null
    }, o || {});
    state.papers.unshift(p);
    emit();
    return p;
  }
  function updatePaper(id, patch) {
    const p = paperById(id);
    if (!p) return null;
    Object.assign(p, patch);
    emit();
    return p;
  }
  function deletePaper(id) {
    const idx = state.papers.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    const item = state.papers[idx];
    state.papers.splice(idx, 1);
    state.tasks.forEach(function (t) { if (t.paperId === id) t.paperId = ''; });
    pushUndo('删除文献', function () { state.papers.splice(idx, 0, item); });
    emit();
  }
  function paperById(id) { return state.papers.find(function (x) { return x.id === id; }); }
  function setPaperStatus(id, status) {
    const patch = { status: status };
    if (status === 'reading') patch.startedAt = Date.now();
    if (status === 'read') { patch.readAt = Date.now(); patch.progress = 100; }
    return updatePaper(id, patch);
  }
  function setRating(id, n) {
    const p = paperById(id);
    if (!p) return;
    p.rating = p.rating === n ? 0 : n;
    emit();
  }
  function logReading(paperId, minutes, note) {
    const p = paperById(paperId);
    if (!p) return;
    p.logs = p.logs || [];
    p.logs.unshift({ id: Utils.uid(), ts: Date.now(), minutes: minutes, note: note || '' });
    if (p.status === 'todo') { p.status = 'reading'; p.startedAt = p.startedAt || Date.now(); }
    addSession({ minutes: minutes, category: '文献', paperId: paperId, date: Utils.today() });
    emit();
  }
  function paperMinutes(id) {
    const p = paperById(id);
    if (!p) return 0;
    return (p.logs || []).reduce(function (a, l) { return a + (l.minutes || 0); }, 0);
  }
  function allTags(kind) {
    const set = {};
    const arr = kind === 'paper' ? state.papers : state.experiments;
    arr.forEach(function (x) { (x.tags || []).forEach(function (t) { set[t] = (set[t] || 0) + 1; }); });
    return Object.keys(set).sort(function (a, b) { return set[b] - set[a]; });
  }

  /* ---------------- notes ---------------- */
  function addNote(content, title) {
    const n = { id: Utils.uid(), title: title || '', content: content || '', tags: [], pinned: false, createdAt: Date.now() };
    state.notes.unshift(n);
    emit();
    return n;
  }
  function updateNote(id, patch) {
    const n = state.notes.find(function (x) { return x.id === id; });
    if (!n) return null;
    Object.assign(n, patch); emit(); return n;
  }
  function deleteNote(id) {
    const idx = state.notes.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return;
    const item = state.notes[idx];
    state.notes.splice(idx, 1);
    pushUndo('删除速记', function () { state.notes.splice(idx, 0, item); });
    emit();
  }

  /* ---------------- reviews ---------------- */
  function getReview(key) {
    return state.reviews[key] || { wins: '', problems: '', plans: '', updatedAt: null };
  }
  function setReview(key, patch) {
    const r = Object.assign(getReview(key), patch, { updatedAt: Date.now() });
    state.reviews[key] = r;
    emit();
    return r;
  }

  /* ---------------- sessions ---------------- */
  function addSession(o) {
    const s = Object.assign({ id: Utils.uid(), date: Utils.today(), minutes: 25, category: '实验', taskId: '', paperId: '', ts: Date.now() }, o || {});
    state.sessions.push(s);
    save();
    return s;
  }
  function sessionsOn(date) { return state.sessions.filter(function (s) { return s.date === date; }); }
  function sessionsBetween(a, b) { return state.sessions.filter(function (s) { return s.date >= a && s.date <= b; }); }
  /* ---------------- stats ---------------- */
  function dayStats(date) {
    const tasks = tasksOn(date);
    const done = tasks.filter(function (t) { return t.done; }).length;
    const sessions = sessionsOn(date);
    const focusMin = sessions.reduce(function (a, s) { return a + (s.minutes || 0); }, 0);
    const readingMin = sessions.filter(function (s) { return s.category === '文献'; }).reduce(function (a, s) { return a + s.minutes; }, 0);
    const routines = routinesFor(date);
    const rDone = routines.filter(function (r) { return routineDone(date, r.id); }).length;
    return {
      date: date, total: tasks.length, done: done, left: tasks.length - done,
      focusMin: focusMin, sessions: sessions.length, readingMin: readingMin,
      routineTotal: routines.length, routineDone: rDone,
      score: focusMin + done * 12 + rDone * 5
    };
  }
  function series(dates) { return dates.map(dayStats); }
  function dateRange(start, end) {
    const days = [];
    let d = start;
    while (d <= end) { days.push(d); d = Utils.addDays(d, 1); }
    return days;
  }
  function rangeStats(start, end) {
    const days = dateRange(start, end);
    const st = series(days);
    const sessions = sessionsBetween(start, end);
    const tasks = tasksBetween(start, end);
    const papersRead = state.papers.filter(function (p) {
      return p.readAt && Utils.toStr(new Date(p.readAt)) >= start && Utils.toStr(new Date(p.readAt)) <= end;
    }).length;
    const expLogs = state.experiments.reduce(function (a, e) {
      return a + (e.logs || []).filter(function (l) {
        const ds = Utils.toStr(new Date(l.ts));
        return ds >= start && ds <= end;
      }).length;
    }, 0);
    return {
      start: start, end: end, days: st,
      tasksDone: st.reduce(function (a, s) { return a + s.done; }, 0),
      tasksTotal: tasks.length,
      focusMin: sessions.reduce(function (a, s) { return a + (s.minutes || 0); }, 0),
      sessionCount: sessions.length,
      readingMin: sessions.filter(function (s) { return s.category === '文献'; }).reduce(function (a, s) { return a + s.minutes; }, 0),
      readingPapers: state.papers.filter(function (p) {
        return (p.logs || []).some(function (l) {
          const ds = Utils.toStr(new Date(l.ts));
          return ds >= start && ds <= end;
        });
      }).length,
      papersRead: papersRead, expLogs: expLogs,
      activeDays: st.filter(function (s) { return s.score > 0; }).length
    };
  }
  function categoryMinutes(start, end) {
    const map = {};
    sessionsBetween(start, end).forEach(function (s) {
      map[s.category] = (map[s.category] || 0) + (s.minutes || 0);
    });
    return Utils.CATS.map(function (c) {
      return { label: c.id, color: c.color, value: map[c.id] || 0 };
    }).filter(function (x) { return x.value > 0; });
  }
  function categoryTasks(start, end) {
    const map = {};
    tasksBetween(start, end).forEach(function (t) { map[t.category] = (map[t.category] || 0) + 1; });
    return Utils.CATS.map(function (c) {
      return { label: c.id, color: c.color, value: map[c.id] || 0 };
    }).filter(function (x) { return x.value > 0; });
  }
  function streak() {
    let n = 0;
    let d = Utils.today();
    if (dayStats(d).score <= 0) d = Utils.addDays(d, -1);
    while (dayStats(d).score > 0 && n < 999) {
      n++;
      d = Utils.addDays(d, -1);
    }
    return n;
  }
  function heatLevel(st) {
    const v = st.score;
    if (v <= 0) return 0;
    if (v < 40) return 1;
    if (v < 100) return 2;
    if (v < 200) return 3;
    return 4;
  }
  function heatWeeks(weeks) {
    const today = Utils.today();
    const lastMonday = Utils.startOfWeek(today);
    const out = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const monday = Utils.addDays(lastMonday, -7 * w);
      const col = [];
      for (let i = 0; i < 7; i++) {
        const d = Utils.addDays(monday, i);
        if (d > today) { col.push({ date: '', value: 0, level: 0, tip: '未到来' }); continue; }
        const st = dayStats(d);
        col.push({
          date: d, value: st.score, level: heatLevel(st),
          tip: st.done + ' 个任务 · 专注 ' + Utils.durShort(st.focusMin)
        });
      }
      out.push(col);
    }
    return out;
  }
  function expStats() {
    const map = {};
    Utils.EXP_STATUS.forEach(function (s) { map[s.id] = 0; });
    state.experiments.forEach(function (e) { map[e.status] = (map[e.status] || 0) + 1; });
    return map;
  }
  function paperStats() {
    const map = {};
    Utils.PAPER_STATUS.forEach(function (s) { map[s.id] = 0; });
    state.papers.forEach(function (p) { map[p.status] = (map[p.status] || 0) + 1; });
    return map;
  }

  /* ---------------- export / import ---------------- */
  function exportJSON() {
    state.settings.lastBackupAt = Date.now();
    saveNow();
    const stamp = Utils.today().replace(/-/g, '');
    Utils.download('科研日课-备份-' + stamp + '.json', JSON.stringify(state, null, 2), 'application/json');
  }
  function importJSON(text, mode) {
    let data;
    try { data = JSON.parse(String(text).replace(/^\ufeff/, '')); } catch (e) { throw new Error('JSON 解析失败：' + e.message); }
    if (!data || typeof data !== 'object') throw new Error('备份内容格式不正确');
    const keys = ['tasks', 'routines', 'experiments', 'papers', 'notes', 'sessions'];
    if (mode === 'replace') {
      state = Object.assign(defaults(), data);
      keys.forEach(function (k) { if (!Array.isArray(state[k])) state[k] = []; });
      if (typeof state.reviews !== 'object' || !state.reviews) state.reviews = {};
      if (typeof state.routineLog !== 'object' || !state.routineLog) state.routineLog = {};
    } else {
      const seen = {};
      keys.forEach(function (k) { seen[k] = {}; (state[k] || []).forEach(function (x) { seen[k][x.id] = true; }); });
      keys.forEach(function (k) {
        (data[k] || []).forEach(function (x) {
          if (!x || !x.id) return;
          if (seen[k][x.id]) x = Object.assign({}, x, { id: Utils.uid() });
          state[k].push(x);
        });
      });
      state.reviews = Object.assign({}, data.reviews || {}, state.reviews);
      state.routineLog = Object.assign({}, data.routineLog || {}, state.routineLog);
      state.settings = Object.assign(state.settings, data.settings || {});
    }
    saveNow(); emit();
  }
  function clearAll(keepSettings) {
    const settings = keepSettings ? state.settings : defaults().settings;
    state = defaults();
    state.settings = settings;
    saveNow(); emit();
  }
  function storageSize() {
    try { return new Blob([JSON.stringify(state)]).size; } catch (e) { return 0; }
  }
  function isStorageOK() { return storageOK; }
  /* ---------------- markdown exports ---------------- */
  function taskLine(t) {
    const box = t.done ? '- [x]' : '- [ ]';
    const time = t.start ? (t.start + (t.end ? '–' + t.end : '') + ' ') : '';
    const tags = ' `#' + t.category + '`' + (t.priority === 3 ? ' `!高`' : t.priority === 1 ? ' `!低`' : '');
    const note = t.notes ? '\n    - 备注：' + t.notes.replace(/\n/g, ' ') : '';
    const link = t.expId && expById(t.expId) ? '\n    - 关联实验：' + expById(t.expId).title : '';
    return box + ' ' + time + t.title + tags + note + link;
  }
  function exportDayMarkdown(date) {
    const tasks = tasksOn(date);
    const st = dayStats(date);
    let md = '# ' + Utils.fmtDate(date, 'full') + ' · 科研日报\n\n';
    md += '> 完成任务 ' + st.done + '/' + st.total + ' · 专注 ' + Utils.durText(st.focusMin) + ' · 阅读 ' + Utils.durText(st.readingMin) + '\n\n';
    const routines = routinesFor(date);
    if (routines.length) {
      md += '## 常规安排\n';
      routines.forEach(function (r) {
        md += '- [' + (routineDone(date, r.id) ? 'x' : ' ') + '] ' + (r.start ? r.start + ' ' : '') + r.title + '\n';
      });
      md += '\n';
    }
    md += '## 今日任务\n';
    if (!tasks.length) md += '_暂无任务_\n';
    tasks.forEach(function (t) { md += taskLine(t) + '\n'; });
    const sessions = sessionsOn(date);
    if (sessions.length) {
      md += '\n## 专注记录\n';
      sessions.forEach(function (s) {
        md += '- ' + Utils.dtText(s.ts) + ' · ' + s.category + ' · ' + Utils.durText(s.minutes) + '\n';
      });
    }
    const notes = state.notes.filter(function (n) { return Utils.toStr(new Date(n.createdAt)) === date; });
    if (notes.length) {
      md += '\n## 灵感速记\n';
      notes.forEach(function (n) { md += '- ' + (n.title ? '**' + n.title + '**：' : '') + n.content.replace(/\n/g, ' ') + '\n'; });
    }
    const logs = [];
    state.experiments.forEach(function (e) {
      (e.logs || []).forEach(function (l) {
        if (Utils.toStr(new Date(l.ts)) === date) logs.push('**' + e.title + '**：' + l.text.replace(/\n/g, ' '));
      });
    });
    if (logs.length) {
      md += '\n## 实验进展\n';
      logs.forEach(function (l) { md += '- ' + l + '\n'; });
    }
    return md;
  }
  function exportWeekMarkdown(date) {
    const start = Utils.startOfWeek(date), end = Utils.endOfWeek(date);
    const rs = rangeStats(start, end);
    let md = '# ' + Utils.fmtDate(start, 'md') + ' – ' + Utils.fmtDate(end, 'md') + ' · 科研周报\n\n';
    md += '## 本周概览\n';
    md += '- 完成任务：' + rs.tasksDone + ' / ' + rs.tasksTotal + '\n';
    md += '- 专注时长：' + Utils.durText(rs.focusMin) + '（' + rs.sessionCount + ' 个番茄）\n';
    md += '- 文献阅读：' + Utils.durText(rs.readingMin) + '，涉及 ' + rs.readingPapers + ' 篇，读完 ' + rs.papersRead + ' 篇\n';
    md += '- 实验记录：' + rs.expLogs + ' 条\n';
    md += '- 活跃天数：' + rs.activeDays + ' / 7\n\n';
    md += '## 每日明细\n';
    rs.days.forEach(function (d) {
      md += '\n### ' + Utils.fmtDate(d.date, 'md') + ' ' + Utils.weekdayName(d.date) + '\n';
      const tasks = tasksOn(d.date);
      if (!tasks.length) md += '_无任务_\n';
      tasks.forEach(function (t) { md += taskLine(t) + '\n'; });
    });
    const key = Utils.isoWeek(date).key;
    const rv = getReview(key);
    if (rv.wins || rv.problems || rv.plans) {
      md += '\n## 周复盘\n';
      if (rv.wins) md += '**本周进展与收获**\n\n' + rv.wins + '\n\n';
      if (rv.problems) md += '**遇到的问题**\n\n' + rv.problems + '\n\n';
      if (rv.plans) md += '**下周计划**\n\n' + rv.plans + '\n';
    }
    return md;
  }
  function exportAllMarkdown() {
    let md = '# 科研日课 · 全量导出\n\n> 导出时间：' + Utils.dtText(Date.now()) + '\n\n';
    md += '## 实验（' + state.experiments.length + '）\n\n';
    state.experiments.forEach(function (e, i) {
      md += '### ' + (i + 1) + '. ' + e.title + ' [' + ((Utils.EXP_STATUS_MAP[e.status] || {}).label || e.status) + ']\n';
      md += '- 时间：' + (e.startDate || '—') + ' ~ ' + (e.endDate || '进行中') + '\n';
      if (e.tags && e.tags.length) md += '- 标签：' + e.tags.join('、') + '\n';
      if (e.objective) md += '- 目标：' + e.objective.replace(/\n/g, ' ') + '\n';
      if (e.hypothesis) md += '- 假设：' + e.hypothesis.replace(/\n/g, ' ') + '\n';
      if (e.materials) md += '- 材料：' + e.materials.replace(/\n/g, ' ') + '\n';
      if (e.protocol) md += '- 方案：' + e.protocol.replace(/\n/g, ' ') + '\n';
      (e.steps || []).forEach(function (s) { md += '    - [' + (s.done ? 'x' : ' ') + '] ' + s.text + '\n'; });
      if (e.results) md += '- 结果：' + e.results.replace(/\n/g, ' ') + '\n';
      if (e.conclusion) md += '- 结论：' + e.conclusion.replace(/\n/g, ' ') + '\n';
      (e.logs || []).slice(0, 20).forEach(function (l) {
        md += '    - [' + Utils.dtText(l.ts) + '] ' + l.text.replace(/\n/g, ' ') + '\n';
      });
      md += '\n';
    });
    md += '## 文献（' + state.papers.length + '）\n\n';
    state.papers.forEach(function (p, i) {
      md += '### ' + (i + 1) + '. ' + p.title + ' [' + ((Utils.PAPER_STATUS_MAP[p.status] || {}).label || p.status) + ']\n';
      if (p.authors) md += '- 作者：' + p.authors + '\n';
      if (p.journal) md += '- 期刊：' + p.journal + (p.year ? ' · ' + p.year : '') + '\n';
      if (p.doi) md += '- DOI：' + p.doi + '\n';
      if (p.tags && p.tags.length) md += '- 标签：' + p.tags.join('、') + '\n';
      if (p.rating) md += '- 评分：' + '★'.repeat(p.rating) + '\n';
      if (p.summary) md += '- 摘要：' + p.summary.replace(/\n/g, ' ') + '\n';
      if (p.keyPoints) md += '- 关键发现：' + p.keyPoints.replace(/\n/g, ' ') + '\n';
      if (p.questions) md += '- 疑问：' + p.questions.replace(/\n/g, ' ') + '\n';
      md += '\n';
    });
    md += '## 速记（' + state.notes.length + '）\n\n';
    state.notes.forEach(function (n) {
      md += '- [' + Utils.dtText(n.createdAt) + '] ' + (n.title ? '**' + n.title + '**：' : '') + n.content.replace(/\n/g, ' ') + '\n';
    });
    md += '\n## 周复盘\n\n';
    Object.keys(state.reviews).sort().forEach(function (k) {
      const r = state.reviews[k];
      if (!r.wins && !r.problems && !r.plans) return;
      md += '### ' + k + '\n';
      if (r.wins) md += '**进展与收获**\n\n' + r.wins + '\n\n';
      if (r.problems) md += '**问题**\n\n' + r.problems + '\n\n';
      if (r.plans) md += '**计划**\n\n' + r.plans + '\n\n';
    });
    return md;
  }

  /* ---------------- goals 科研目标 ---------------- */
  function byMilestoneDate(a, b) { return (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99'); }

  function addGoal(g) {
    const goal = Object.assign({
      id: Utils.uid(), title: '', type: '论文', status: 'active',
      start: Utils.today(), due: '', desc: '',
      progress: 0, autoProgress: true,
      milestones: [], expIds: [], paperIds: [],
      createdAt: Date.now(), updatedAt: Date.now(), doneAt: null
    }, g || {});
    if (!goal.start) goal.start = Utils.today();
    state.goals.unshift(goal);
    emit();
    return goal;
  }

  function goalById(id) { return state.goals.find(function (g) { return g.id === id; }) || null; }

  function updateGoal(id, patch) {
    const g = goalById(id);
    if (!g) return null;
    const wasDone = g.status === 'done';
    Object.assign(g, patch || {});
    g.updatedAt = Date.now();
    if (g.status === 'done' && !wasDone) g.doneAt = Date.now();
    if (g.status !== 'done' && wasDone) g.doneAt = null;
    emit();
    return g;
  }

  function deleteGoal(id) {
    state.goals = state.goals.filter(function (g) { return g.id !== id; });
    emit();
  }

  function goalProgress(g) {
    if (g.autoProgress !== false && g.milestones && g.milestones.length) {
      const done = g.milestones.filter(function (m) { return m.done; }).length;
      return Math.round((done / g.milestones.length) * 100);
    }
    return Utils.clamp(Number(g.progress) || 0, 0, 100);
  }

  function addMilestone(goalId, m) {
    const g = goalById(goalId);
    if (!g) return null;
    const ms = Object.assign({ id: Utils.uid(), title: '', date: '', done: false }, m || {});
    g.milestones = g.milestones || [];
    g.milestones.push(ms);
    g.milestones.sort(byMilestoneDate);
    g.updatedAt = Date.now();
    emit();
    return ms;
  }

  function updateMilestone(goalId, mid, patch) {
    const g = goalById(goalId);
    if (!g) return null;
    const ms = (g.milestones || []).find(function (x) { return x.id === mid; });
    if (!ms) return null;
    Object.assign(ms, patch || {});
    g.milestones.sort(byMilestoneDate);
    g.updatedAt = Date.now();
    emit();
    return ms;
  }

  function deleteMilestone(goalId, mid) {
    const g = goalById(goalId);
    if (!g) return null;
    g.milestones = (g.milestones || []).filter(function (x) { return x.id !== mid; });
    g.updatedAt = Date.now();
    emit();
  }

  function goalStats() {
    const today = Utils.today();
    const list = state.goals;
    const active = list.filter(function (g) { return g.status === 'active'; });
    const milestones = list.reduce(function (arr, g) { return arr.concat(g.milestones || []); }, []);
    return {
      total: list.length,
      active: active.length,
      done: list.filter(function (g) { return g.status === 'done'; }).length,
      paused: list.filter(function (g) { return g.status === 'paused'; }).length,
      overdue: active.filter(function (g) { return g.due && g.due < today; }).length,
      dueSoon: active.filter(function (g) { return g.due && g.due >= today && Utils.diffDays(today, g.due) <= 30; }).length,
      avgProgress: active.length ? Math.round(active.reduce(function (s, g) { return s + goalProgress(g); }, 0) / active.length) : 0,
      milestoneDone: milestones.filter(function (m) { return m.done; }).length,
      milestoneTotal: milestones.length,
      nextMilestone: milestones.filter(function (m) { return !m.done && m.date; })
        .sort(byMilestoneDate).find(function (m) { return m.date >= today; }) || null
    };
  }

  /* ---------------- demo data ---------------- */
  function seedDemo() {
    const today = Utils.today();
    const y = Utils.addDays(today, -1), d2 = Utils.addDays(today, -2);
    addRoutine({ title: '每日文献精读 1 篇', category: '文献', start: '09:00', end: '09:40', repeat: 'daily' });
    addRoutine({ title: '整理实验记录与数据', category: '数据', start: '21:00', end: '21:30', repeat: 'daily' });
    addRoutine({ title: '组会汇报准备', category: '组会', start: '16:00', end: '17:00', repeat: 'weekdays' });
    const exp1 = addExperiment({
      title: 'LDH 纳米酶活性验证（批次 A）', status: 'running', tags: ['纳米酶', '催化'],
      objective: '验证批次 A 材料在不同 pH 下的类过氧化物酶活性差异。',
      hypothesis: 'pH 5.0 条件下活性最强，pH 7.4 显著下降。',
      materials: 'LDH 样品 A（2 mg/mL）、TMB（10 mM）、H2O2（100 mM）、乙酸缓冲液',
      protocol: '1. 配制不同 pH 缓冲液；2. 96 孔板加入样品与底物；3. 37℃ 孵育 10 min；4. 652 nm 读板。',
      steps: [
        { id: Utils.uid(), text: '配制 pH 3.0-8.0 系列缓冲液', done: true },
        { id: Utils.uid(), text: '样品超声分散 10 min', done: true },
        { id: Utils.uid(), text: '96 孔板加样，每组 3 复孔', done: false },
        { id: Utils.uid(), text: '酶标仪读数并导出数据', done: false }
      ],
      startDate: Utils.addDays(today, -5)
    });
    addExpLog(exp1.id, '完成缓冲液配制与样品分散，样品状态均一，无可见团聚。');
    addExpLog(exp1.id, '预实验初步显示 pH 5 组显色最快，与假设一致。');
    addExperiment({
      title: '小鼠肝组织 HE 染色切片', status: 'planned', tags: ['动物实验', '病理'],
      objective: '评估处理组肝组织形态学变化。',
      hypothesis: '高剂量组出现轻度肝细胞气球样变。',
      steps: [
        { id: Utils.uid(), text: '取材固定（4% 多聚甲醛）', done: false },
        { id: Utils.uid(), text: '脱水、包埋、切片', done: false }
      ],
      startDate: Utils.addDays(today, 2)
    });
    const p1 = addPaper({
      title: 'Nanozyme-based colorimetric biosensors: mechanisms and applications',
      authors: 'Zhang Y., Liu H., Chen W.', journal: 'Chemical Society Reviews', year: '2024',
      doi: '10.1039/D3CS00000X', tags: ['综述', '纳米酶'], status: 'reading', rating: 5, progress: 45,
      summary: '系统总结了纳米酶显色传感的催化机制（POD、OXD、CAT 类）以及在葡萄糖、H2O2 检测中的应用。',
      keyPoints: '1. 比色法灵敏度受限但操作简单，适合基层检测；\n2. 双酶级联策略可显著降低检测限；\n3. 底物亲和力（Km）是关键评价指标。',
      questions: 'TMB 体系在酸性条件下的稳定性数据是否充分？'
    });
    const p2 = addPaper({
      title: 'Single-cell transcriptomics of tumor microenvironment in liver cancer',
      authors: 'Wang L., Zhao Q.', journal: 'Nature Communications', year: '2023',
      tags: ['单细胞', '肿瘤微环境'], status: 'todo'
    });
    addPaper({
      title: 'Machine learning for protein structure prediction: from AlphaFold to next generation',
      authors: 'Chen X., Kumar R.', journal: 'Science', year: '2025',
      tags: ['机器学习', '结构生物学'], status: 'read', rating: 4, progress: 100, readAt: Date.now() - 172800000,
      summary: '综述了从 AlphaFold2 到多体复合物预测的演进路径。',
      keyPoints: '1. 多聚体接口预测误差仍是瓶颈；\n2. 实验验证数据的质量决定上限。'
    });
    logReading(p1.id, 35, '读完第 3 节，梳理了双酶级联的设计思路。');
    addTask({ title: '完成 96 孔板加样并读板', date: today, start: '09:30', end: '12:00', category: '实验', priority: 3, est: 150, expId: exp1.id, notes: '注意每组 3 复孔，避免气泡' });
    addTask({ title: '精读 Nanozyme 综述第 4 节', date: today, start: '14:00', end: '15:00', category: '文献', priority: 2, est: 60, paperId: p1.id });
    addTask({ title: '整理上周酶活数据，画柱状图', date: today, category: '数据', priority: 2, est: 90 });
    addTask({ title: '撰写论文方法部分草稿', date: today, category: '写作', priority: 1, est: 60 });
    addTask({ title: '组会汇报 PPT 初稿', date: Utils.addDays(today, 1), start: '10:00', end: '12:00', category: '组会', priority: 3, est: 120 });
    addTask({ title: '细胞传代', date: y, start: '15:00', end: '16:00', category: '实验', priority: 2, est: 60, done: true, doneAt: Date.now() - 86400000 });
    addTask({ title: '阅读 AlphaFold 综述', date: d2, category: '文献', priority: 2, est: 45, done: true, doneAt: Date.now() - 172800000 });
    addNote('用双酶级联（GOx + 纳米酶）替换单酶体系，可能把检测限降低一个数量级，下周试一下。', '实验想法');
    addNote('论文讨论部分可以围绕「酸性微环境对催化活性的影响」展开。');
    addGoal({
      title: '完成纳米酶传感论文投稿', type: '投稿', status: 'active',
      start: Utils.addDays(today, -21), due: Utils.addDays(today, 48),
      desc: '把 pH 系列与选择性实验结果整理成文，目标期刊 Chemical Communications。',
      milestones: [
        { id: Utils.uid(), title: '完成酶活正式实验', date: Utils.addDays(today, -3), done: true },
        { id: Utils.uid(), title: '补做干扰离子选择性实验', date: Utils.addDays(today, 6), done: false },
        { id: Utils.uid(), title: '完成正文初稿', date: Utils.addDays(today, 20), done: false },
        { id: Utils.uid(), title: '投稿并处理返修', date: Utils.addDays(today, 45), done: false }
      ],
      expIds: [exp1.id]
    });
    addGoal({
      title: '掌握单细胞数据分析流程', type: '学习', status: 'active',
      start: Utils.addDays(today, -12), due: Utils.addDays(today, 62),
      desc: '从 Seurat 基础流程到轨迹分析，最终能独立处理自己的样本数据。',
      milestones: [
        { id: Utils.uid(), title: '精读 5 篇单细胞方法文献', date: Utils.addDays(today, -2), done: true },
        { id: Utils.uid(), title: '复现公开数据集分析流程', date: Utils.addDays(today, 18), done: false },
        { id: Utils.uid(), title: '迁移到自己的样本数据', date: Utils.addDays(today, 45), done: false }
      ],
      paperIds: [p2.id]
    });
    addGoal({
      title: '完成文献综述第二章', type: '论文', status: 'done',
      start: Utils.addDays(today, -60), due: Utils.addDays(today, -8),
      desc: '综述第二章：纳米酶催化机制与调控策略。',
      milestones: [
        { id: Utils.uid(), title: '整理 30 篇核心文献', date: Utils.addDays(today, -45), done: true },
        { id: Utils.uid(), title: '完成章节初稿', date: Utils.addDays(today, -20), done: true },
        { id: Utils.uid(), title: '导师修改并定稿', date: Utils.addDays(today, -9), done: true }
      ]
    });
    addSession({ date: today, minutes: 25, category: '数据', ts: Date.now() - 3600000 });
    addSession({ date: today, minutes: 50, category: '文献', paperId: p1.id, ts: Date.now() - 7200000 });
    addSession({ date: y, minutes: 75, category: '实验' });
    addSession({ date: y, minutes: 25, category: '写作' });
    addSession({ date: d2, minutes: 50, category: '文献' });
    addSession({ date: Utils.addDays(today, -3), minutes: 100, category: '实验' });
    addSession({ date: Utils.addDays(today, -4), minutes: 60, category: '组会' });
    const lastWeek = Utils.addDays(Utils.startOfWeek(today), -3);
    setReview(Utils.isoWeek(lastWeek).key, {
      wins: '1. 完成 pH 系列预实验，结果符合预期；\n2. 读完 2 篇纳米酶相关综述，梳理出 3 个可尝试的改进方向。',
      problems: '1. 96 孔板加样时气泡影响读数稳定性；\n2. 晚间效率偏低，文献阅读常被拖延。',
      plans: '1. 完成酶活正式实验并统计；\n2. 完成方法部分初稿；\n3. 晚间 21:00 后只做数据整理与速记。'
    });
    saveNow();
    emit();
  }

  load();
  window.addEventListener('beforeunload', function () {
    saveNow();
    if (!isFileMode()) {
      try { navigator.sendBeacon('/api/state', new Blob([JSON.stringify(state)], { type: 'application/json' })); } catch (e) { }
    }
  });

  return {
    get state() { return state; },
    subscribe: subscribe, emit: emit, save: save, saveNow: saveNow,
    undo: undo, hasUndo: hasUndo,
    tasksOn: tasksOn, tasksBetween: tasksBetween, addTask: addTask, updateTask: updateTask,
    deleteTask: deleteTask, toggleTask: toggleTask, moveTask: moveTask, reorderTasks: reorderTasks, postponeTask: postponeTask,
    routinesFor: routinesFor, routineDone: routineDone, toggleRoutine: toggleRoutine,
    addRoutine: addRoutine, updateRoutine: updateRoutine, deleteRoutine: deleteRoutine,
    addExperiment: addExperiment, updateExperiment: updateExperiment, deleteExperiment: deleteExperiment,
    setExpStatus: setExpStatus, addExpLog: addExpLog, deleteExpLog: deleteExpLog, expById: expById,
    addStep: addStep, updateStep: updateStep, deleteStep: deleteStep, expProgress: expProgress,
    addPaper: addPaper, updatePaper: updatePaper, deletePaper: deletePaper, setPaperStatus: setPaperStatus,
    setRating: setRating, logReading: logReading, paperById: paperById, paperMinutes: paperMinutes, allTags: allTags,
    addNote: addNote, updateNote: updateNote, deleteNote: deleteNote,
    getReview: getReview, setReview: setReview,
    addSession: addSession, sessionsOn: sessionsOn, sessionsBetween: sessionsBetween,
    dayStats: dayStats, series: series, dateRange: dateRange, rangeStats: rangeStats,
    categoryMinutes: categoryMinutes, categoryTasks: categoryTasks, streak: streak,
    heatWeeks: heatWeeks, expStats: expStats, paperStats: paperStats,
    exportJSON: exportJSON, importJSON: importJSON, clearAll: clearAll,
    storageSize: storageSize, isStorageOK: isStorageOK,
    syncRemote: syncRemote, remoteStatus: remoteStatus, backupNow: backupNow, revealData: revealData,
    addGoal: addGoal, updateGoal: updateGoal, deleteGoal: deleteGoal, goalById: goalById,
    goalProgress: goalProgress, addMilestone: addMilestone, updateMilestone: updateMilestone,
    deleteMilestone: deleteMilestone, goalStats: goalStats,
    exportDayMarkdown: exportDayMarkdown, exportWeekMarkdown: exportWeekMarkdown, exportAllMarkdown: exportAllMarkdown,
    seedDemo: seedDemo
  };
})();


