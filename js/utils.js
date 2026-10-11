/* ============================================================
   科研日课 · utils.js
   基础工具：图标 / 日期 / 字符串 / 文件 / 提示音 / 领域常量
   ============================================================ */
window.Utils = (function () {
  const ICONS = {
    today: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    schedule: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 15 11.5 17.5 16 13"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6.5L5.2 18A2 2 0 0 0 7 21h10a2 2 0 0 0 1.8-3L14 9.5V3"/><line x1="7.5" y1="15" x2="16.5" y2="15"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    insights: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/><line x1="3" y1="22" x2="21" y2="22"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    right: '<polyline points="9 18 15 12 9 6"/>',
    left: '<polyline points="15 18 9 12 15 6"/>',
    down: '<polyline points="6 9 12 15 18 9"/>',
    up: '<polyline points="18 15 12 9 6 15"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/>',
    skip: '<polyline points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
    reset: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    grip: '<circle cx="9" cy="6" r="1.5" style="fill:currentColor;stroke:none"/><circle cx="15" cy="6" r="1.5" style="fill:currentColor;stroke:none"/><circle cx="9" cy="12" r="1.5" style="fill:currentColor;stroke:none"/><circle cx="15" cy="12" r="1.5" style="fill:currentColor;stroke:none"/><circle cx="9" cy="18" r="1.5" style="fill:currentColor;stroke:none"/><circle cx="15" cy="18" r="1.5" style="fill:currentColor;stroke:none"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>',
    sparkles: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>'
  };

  function icon(name, size, extraClass) {
    const body = ICONS[name] || ICONS.info;
    const s = size || 18;
    return '<svg class="icon ' + (extraClass || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      body + '</svg>';
  }

  const CATS = [
    { id: '实验', color: 'var(--c-exp)', icon: 'flask' },
    { id: '文献', color: 'var(--c-lit)', icon: 'book' },
    { id: '写作', color: 'var(--c-write)', icon: 'edit' },
    { id: '数据', color: 'var(--c-data)', icon: 'insights' },
    { id: '组会', color: 'var(--c-meet)', icon: 'bell' },
    { id: '课程', color: 'var(--c-course)', icon: 'book' },
    { id: '事务', color: 'var(--c-misc)', icon: 'folder' },
    { id: '其他', color: 'var(--c-other)', icon: 'tag' }
  ];
  const CAT_MAP = {};
  CATS.forEach(function (c) { CAT_MAP[c.id] = c; });
  const CAT_ALIAS = {
    '实验': '实验', '实验室': '实验', 'exp': '实验', 'bench': '实验',
    '文献': '文献', '阅读': '文献', '读文献': '文献', 'lit': '文献', 'paper': '文献',
    '写作': '写作', '论文': '写作', '写论文': '写作', 'write': '写作',
    '数据': '数据', '分析': '数据', '数据分析': '数据', 'data': '数据',
    '组会': '组会', '会议': '组会', 'meeting': '组会',
    '课程': '课程', '上课': '课程', 'class': '课程',
    '事务': '事务', '杂务': '事务', 'admin': '事务',
    '其他': '其他', 'other': '其他'
  };
  const PRIOS = [
    { id: 3, label: '高', color: 'var(--c-pri-high)' },
    { id: 2, label: '中', color: 'var(--c-pri-mid)' },
    { id: 1, label: '低', color: 'var(--c-pri-low)' }
  ];
  const EXP_STATUS = [
    { id: 'planned', label: '计划中', color: 'var(--text-3)' },
    { id: 'running', label: '进行中', color: 'var(--c-exp)' },
    { id: 'done', label: '已完成', color: 'var(--ok)' },
    { id: 'paused', label: '已暂停', color: 'var(--c-data)' },
    { id: 'failed', label: '已终止', color: 'var(--danger)' }
  ];
  const EXP_STATUS_MAP = {};
  EXP_STATUS.forEach(function (s) { EXP_STATUS_MAP[s.id] = s; });
  const PAPER_STATUS = [
    { id: 'todo', label: '待读', color: 'var(--text-3)' },
    { id: 'reading', label: '在读', color: 'var(--c-lit)' },
    { id: 'read', label: '已读', color: 'var(--ok)' }
  ];
  const PAPER_STATUS_MAP = {};
  PAPER_STATUS.forEach(function (s) { PAPER_STATUS_MAP[s.id] = s; });

  const GOAL_TYPES = [
    { id: '论文', color: 'var(--c-write)', icon: 'edit' },
    { id: '投稿', color: 'var(--c-exp)', icon: 'upload' },
    { id: '实验', color: 'var(--c-exp)', icon: 'flask' },
    { id: '学习', color: 'var(--c-lit)', icon: 'book' },
    { id: '项目', color: 'var(--c-meet)', icon: 'target' },
    { id: '答辩', color: 'var(--c-course)', icon: 'award' },
    { id: '其他', color: 'var(--c-misc)', icon: 'tag' }
  ];
  const GOAL_TYPE_MAP = {};
  GOAL_TYPES.forEach(function (t) { GOAL_TYPE_MAP[t.id] = t; });
  const GOAL_STATUS = [
    { id: 'active', label: '推进中', color: 'var(--c-exp)' },
    { id: 'done', label: '已完成', color: 'var(--ok)' },
    { id: 'paused', label: '已暂停', color: 'var(--c-data)' },
    { id: 'archived', label: '已归档', color: 'var(--text-3)' }
  ];
  const GOAL_STATUS_MAP = {};
  GOAL_STATUS.forEach(function (s) { GOAL_STATUS_MAP[s.id] = s; });

  const QUOTES = [
    ['不积跬步，无以至千里。', '荀子'],
    ['大胆假设，小心求证。', '胡适'],
    ['提出一个问题往往比解决一个问题更重要。', '爱因斯坦'],
    ['我并没有失败，只是发现了一万种行不通的方法。', '爱迪生'],
    ['读文献的意义，是站在巨人的肩膀上。', '牛顿'],
    ['记录，是为了让明天的自己少走弯路。', ''],
    ['实验失败不是终点，而是数据。', ''],
    ['把大问题切成小任务，今天只推进一格。', ''],
    ['写作是思考的延续。', ''],
    ['重复实验，是靠近真相的方式。', ''],
    ['耐心，是科研最重要的实验设备。', ''],
    ['今日事今日毕，数据不会自己变干净。', ''],
    ['休息也是科研的一部分。', ''],
    ['每一条曲线背后，都是无数次重复。', '']
  ];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlight(text, q) {
    const safe = esc(text);
    if (!q) return safe;
    try { return safe.replace(new RegExp('(' + escRe(esc(q)) + ')', 'gi'), '<mark>$1</mark>'); }
    catch (e) { return safe; }
  }

  function toDate(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function toStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function today() { return toStr(new Date()); }
  function parseDate(s) {
    if (!s) return new Date();
    const p = String(s).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function addDays(s, n) {
    const d = parseDate(s); d.setDate(d.getDate() + n); return toStr(d);
  }
  function diffDays(a, b) {
    return Math.round((parseDate(b) - parseDate(a)) / 86400000);
  }
  function weekday(s) { return parseDate(s).getDay(); }
  function isToday(s) { return s === today(); }
  function isPast(s) { return s < today(); }
  function isFuture(s) { return s > today(); }
  const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const WD_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
  function fmtDate(s, style) {
    const d = parseDate(s);
    switch (style) {
      case 'full': return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WD[d.getDay()];
      case 'md': return (d.getMonth() + 1) + '月' + d.getDate() + '日';
      case 'week': return WD[d.getDay()];
      case 'ymd': return s;
      case 'short': return (d.getMonth() + 1) + '/' + d.getDate();
      case 'y': return d.getFullYear() + '年';
      default: return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }
  }
  function weekdayName(s) { return WD[parseDate(s).getDay()]; }
  function startOfWeek(s) {
    const d = parseDate(s);
    const off = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - off);
    return toStr(d);
  }
  function endOfWeek(s) { return addDays(startOfWeek(s), 6); }
  function weekDates(s) {
    const start = startOfWeek(s), out = [];
    for (let i = 0; i < 7; i++) out.push(addDays(start, i));
    return out;
  }
  function monthLabel(s) { const d = parseDate(s); return (d.getMonth() + 1) + '月'; }
  function isoWeek(s) {
    const d = parseDate(s);
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    const firstThu = new Date(t.getFullYear(), 0, 4);
    firstThu.setDate(firstThu.getDate() + 3 - ((firstThu.getDay() + 6) % 7));
    const week = 1 + Math.round((t - firstThu) / 604800000);
    return { year: t.getFullYear(), week: week, key: t.getFullYear() + '-W' + pad2(week) };
  }
  function timeToMin(t) {
    if (!t) return null;
    const p = String(t).split(':');
    return Number(p[0]) * 60 + Number(p[1] || 0);
  }
  function minToTime(m) {
    m = ((Math.round(m) % 1440) + 1440) % 1440;
    return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
  }
  function durText(min) {
    if (min == null) return '';
    if (min < 60) return min + ' 分钟';
    const h = Math.floor(min / 60), m = min % 60;
    return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
  }
  function durShort(min) {
    if (!min) return '0m';
    if (min < 60) return min + 'm';
    const h = Math.floor(min / 60), m = min % 60;
    return h + 'h' + (m ? m + 'm' : '');
  }
  function hourMinText(m) { return minToTime(m); }
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return '夜深了';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    if (h < 23) return '晚上好';
    return '夜深了';
  }
  function quoteOfDay() {
    const d = parseDate(today());
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return QUOTES[day % QUOTES.length];
  }
  function relTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 172800000) return '昨天';
    const d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function dtText(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function debounce(fn, ms) {
    let t = null;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 220);
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function download(filename, content, mime) {
    const wantBom = /markdown|text\/plain/.test(mime || '') && !/\.json$/i.test(filename);
    const blob = new Blob([(wantBom ? '\ufeff' : '') + content], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(ta);
  }
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsText(file, 'utf-8');
    });
  }
  let audioCtx = null;
  function beep(kind) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = kind === 'tick' ? [880] : kind === 'done' ? [784, 988, 1319] : [660, 880];
      const now = audioCtx.currentTime;
      notes.forEach(function (freq, i) {
        const t = now + i * 0.16;
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t); o.stop(t + 0.26);
      });
    } catch (e) { }
  }
  function parseQuickAdd(text) {
    let t = ' ' + String(text || '').trim() + ' ';
    const out = { title: '', date: today(), start: '', end: '', category: '实验', priority: 2, est: 60, repeat: '' };
    const range = t.match(/(\d{1,2})[:：](\d{2})\s*(?:-|~|—|–|到|至)\s*(\d{1,2})[:：](\d{2})/);
    if (range) {
      out.start = pad2(Number(range[1])) + ':' + range[2];
      out.end = pad2(Number(range[3])) + ':' + range[4];
      out.est = Math.max(15, timeToMin(out.end) - timeToMin(out.start));
      t = t.replace(range[0], ' ');
    } else {
      const single = t.match(/(?:^|\s)(\d{1,2})[:：](\d{2})(?=\s|$)/);
      if (single) {
        out.start = pad2(Number(single[1])) + ':' + single[2];
        t = t.replace(single[0], ' ');
      }
    }
    const dm = t.match(/@(\d{4}-\d{1,2}-\d{1,2})/);
    if (dm) { out.date = dm[1].replace(/(\d+)-(\d+)-(\d+)/, function (m, y, mo, d) { return y + '-' + pad2(mo) + '-' + pad2(d); }); t = t.replace(dm[0], ' '); }
    else {
      const dm2 = t.match(/@(\d{1,2})\/(\d{1,2})/);
      if (dm2) { out.date = new Date().getFullYear() + '-' + pad2(dm2[1]) + '-' + pad2(dm2[2]); t = t.replace(dm2[0], ' '); }
    }
    if (/@明天|\+1\b/.test(t)) { out.date = addDays(today(), 1); t = t.replace(/@明天|\+1\b/g, ' '); }
    else if (/@后天/.test(t)) { out.date = addDays(today(), 2); t = t.replace(/@后天/g, ' '); }
    else if (/@今天/.test(t)) { out.date = today(); t = t.replace(/@今天/g, ' '); }
    const dur = t.match(/@(\d+(?:\.\d+)?)\s*(?:m|min|分钟|分)/i);
    if (dur) { out.est = Math.round(Number(dur[1])); t = t.replace(dur[0], ' '); }
    else {
      const dur2 = t.match(/@(\d+(?:\.\d+)?)\s*(?:h|小时)/i);
      if (dur2) { out.est = Math.round(Number(dur2[1]) * 60); t = t.replace(dur2[0], ' '); }
      else {
        const dur3 = t.match(/~(\d+(?:\.\d+)?)\s*(?:h|小时)/i);
        if (dur3) { out.est = Math.round(Number(dur3[1]) * 60); t = t.replace(dur3[0], ' '); }
      }
    }
    const tags = t.match(/#([^\s#]+)/g);
    if (tags) {
      tags.forEach(function (raw) {
        const name = raw.slice(1);
        const key = name.toLowerCase();
        if (CAT_ALIAS[name] || CAT_ALIAS[key]) out.category = CAT_ALIAS[name] || CAT_ALIAS[key];
      });
      t = t.replace(/#[^\s#]+/g, ' ');
    }
    const prio = t.match(/!(高|中|低|1|2|3|!)/);
    if (prio) {
      const v = prio[1];
      out.priority = (v === '高' || v === '1' || v === '!') ? 3 : (v === '中' || v === '2') ? 2 : 1;
      t = t.replace(prio[0], ' ');
    }
    t = t.replace(/\s+/g, ' ').trim();
    out.title = t;
    if (!out.end && out.start) {
      const base = timeToMin(out.start) + Math.max(15, out.est || 60);
      if (out.est) out.end = minToTime(base);
    }
    return out;
  }
  function parseTags(str) {
    return String(str || '').split(/[,，;；\s]+/).map(function (s) { return s.replace(/^#/, '').trim(); }).filter(Boolean);
  }
  function parseBibtex(text) {
    const out = [];
    const re = /@(\w+)\s*\{([^,]*),([\s\S]*?)\n\s*\}\s*(?=@|$)/g;
    let m;
    while ((m = re.exec(text))) {
      const body = m[3];
      const fields = {};
      const fre = /(\w+)\s*=\s*[{"]([\s\S]*?)[}"]\s*,?/g;
      let f;
      while ((f = fre.exec(body))) fields[f[1].toLowerCase()] = f[2].replace(/\s+/g, ' ').trim();
      const authors = (fields.author || '').split(/\s+and\s+/).map(function (a) {
        const p = a.split(',').map(function (x) { return x.trim(); });
        return p.length > 1 ? (p[1] + ' ' + p[0]) : a.trim();
      }).filter(Boolean);
      out.push({
        title: (fields.title || m[2] || '未命名文献').replace(/[{}]/g, ''),
        authors: authors.join(', '),
        journal: fields.journal || fields.booktitle || '',
        year: fields.year || (fields.date || '').slice(0, 4),
        volume: fields.volume || '',
        pages: fields.pages || '',
        doi: (fields.doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//, ''),
        url: fields.url || '',
        summary: (fields.abstract || '').replace(/[{}]/g, ''),
        tags: parseTags((fields.keywords || '').replace(/[;，]/g, ','))
      });
    }
    return out;
  }
  function nowMin() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
  function isWorkday(s) { const w = weekday(s); return w >= 1 && w <= 5; }

  return {
    ICONS: ICONS, icon: icon,
    CATS: CATS, CAT_MAP: CAT_MAP, PRIOS: PRIOS,
    EXP_STATUS: EXP_STATUS, EXP_STATUS_MAP: EXP_STATUS_MAP,
    PAPER_STATUS: PAPER_STATUS, PAPER_STATUS_MAP: PAPER_STATUS_MAP,
    GOAL_TYPES: GOAL_TYPES, GOAL_TYPE_MAP: GOAL_TYPE_MAP,
    GOAL_STATUS: GOAL_STATUS, GOAL_STATUS_MAP: GOAL_STATUS_MAP,
    QUOTES: QUOTES,
    uid: uid, esc: esc, highlight: highlight, escRe: escRe,
    toStr: toStr, toDate: toDate, today: today, parseDate: parseDate,
    addDays: addDays, diffDays: diffDays, weekday: weekday,
    isToday: isToday, isPast: isPast, isFuture: isFuture, isWorkday: isWorkday,
    fmtDate: fmtDate, weekdayName: weekdayName, WD: WD, WD_SHORT: WD_SHORT,
    startOfWeek: startOfWeek, endOfWeek: endOfWeek, weekDates: weekDates,
    monthLabel: monthLabel, isoWeek: isoWeek,
    timeToMin: timeToMin, minToTime: minToTime, hourMinText: hourMinText,
    durText: durText, durShort: durShort, nowMin: nowMin,
    greeting: greeting, quoteOfDay: quoteOfDay, relTime: relTime, dtText: dtText,
    debounce: debounce, clamp: clamp, truncate: truncate,
    download: download, copyText: copyText, readFile: readFile, beep: beep,
    parseQuickAdd: parseQuickAdd, parseTags: parseTags, parseBibtex: parseBibtex,
    pad2: pad2
  };
})();


