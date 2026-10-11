/* ============================================================
   科研日课 · views/schedule.js
   日程安排：日期导航 / 周概览 / 时间轴（重叠自动分栏）
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const START_HOUR = 6, END_HOUR = 24, HOUR_H = 62;

  function lanesFor(tasks) {
    const lanes = [];
    const items = tasks.filter(function (t) { return t.start; }).map(function (t) {
      const s = Utils.timeToMin(t.start);
      const e = t.end ? Utils.timeToMin(t.end) : s + (t.est || 45);
      return { t: t, s: s, e: Math.max(e, s + 25) };
    }).sort(function (a, b) { return a.s - b.s || b.e - a.e; });
    items.forEach(function (it) {
      let idx = -1;
      for (let i = 0; i < lanes.length; i++) { if (lanes[i] <= it.s) { idx = i; break; } }
      if (idx < 0) { lanes.push(it.e); idx = lanes.length - 1; }
      else lanes[idx] = it.e;
      it.lane = idx;
    });
    const total = Math.max(1, lanes.length);
    items.forEach(function (it) { it.total = total; });
    return items;
  }

  function timelineHTML(date) {
    const tasks = Store.tasksOn(date);
    const items = lanesFor(tasks);
    const nowMin = Utils.nowMin();
    let hours = '';
    for (let h = START_HOUR; h < END_HOUR; h++) {
      hours += '<div class="tl-hour"><span>' + Utils.pad2(h) + ':00</span></div>';
    }
    let slots = '';
    for (let h = START_HOUR; h < END_HOUR; h++) {
      slots += '<div class="tl-slot" data-hour="' + h + '" title="点击在此创建任务"></div>';
    }
    let blocks = '';
    items.forEach(function (it) {
      const top = ((it.s - START_HOUR * 60) / 60) * HOUR_H;
      const height = Math.max(26, ((it.e - it.s) / 60) * HOUR_H - 4);
      const w = 100 / it.total;
      const c = (Utils.CAT_MAP[it.t.category] || Utils.CAT_MAP['其他']).color;
      blocks += '<div class="tl-block ' + (height > 52 ? 'tall' : '') + ' ' + (it.t.done ? 'done' : '') + '" ' +
        'data-task="' + it.t.id + '" ' +
        'style="top:' + Math.max(0, top) + 'px;height:' + height + 'px;left:calc(' + (it.lane * w) + '% + 2px);width:calc(' + w + '% - 6px);--c:' + c + '">' +
        '<div class="tl-block-time">' + it.t.start + (it.t.end ? '–' + it.t.end : '') + '</div>' +
        '<div class="tl-block-title">' + (it.t.done ? '✓ ' : '') + Utils.esc(it.t.title) + '</div>' +
        '</div>';
    });
    let nowLine = '';
    if (Utils.isToday(date) && nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60) {
      const top = ((nowMin - START_HOUR * 60) / 60) * HOUR_H;
      nowLine = '<div class="tl-now" style="top:' + top + 'px"><span class="tl-now-label">' + Utils.minToTime(nowMin) + '</span></div>';
    }
    return '<div class="timeline"><div class="tl-hours">' + hours + '</div>' +
      '<div class="tl-track">' + slots + '<div class="tl-slot-wrap">' + blocks + nowLine + '</div></div></div>';
  }

  function weekStripHTML(date) {
    const days = Utils.weekDates(date);
    return '<div class="week-strip">' + days.map(function (d) {
      const tasks = Store.tasksOn(d);
      const done = tasks.filter(function (t) { return t.done; }).length;
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      const chips = tasks.slice(0, 3).map(function (t) {
        const c = (Utils.CAT_MAP[t.category] || Utils.CAT_MAP['其他']).color;
        return '<span class="day-chip-chip" style="--c:' + c + '">' + (t.start ? t.start + ' ' : '') + Utils.esc(Utils.truncate(t.title, 12)) + '</span>';
      }).join('');
      return '<button class="day-chip ' + (d === date ? 'active' : '') + ' ' + (Utils.isToday(d) ? 'today' : '') + '" data-day="' + d + '">' +
        '<div class="day-chip-top"><span class="day-chip-dow">' + Utils.weekdayName(d) + (Utils.isToday(d) ? ' · 今天' : '') + '</span>' +
        '<span class="day-chip-date">' + Utils.fmtDate(d, 'short') + '</span></div>' +
        '<div class="day-chip-count">' + Utils.icon('checkCircle', 12) + ' ' + done + '/' + tasks.length + ' 项</div>' +
        '<div class="day-chip-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="day-chip-chips">' + chips + (tasks.length > 3 ? '<span class="day-chip-more">+' + (tasks.length - 3) + ' 项</span>' : '') + '</div>' +
        '</button>';
    }).join('') + '</div>';
  }

  function render(root, params) {
    const date = (params && params.date) || App.ui.scheduleDate || Utils.today();
    App.ui.scheduleDate = date;
    const tasks = Store.tasksOn(date);
    const st = Store.dayStats(date);
    const flex = tasks.filter(function (t) { return !t.start; });
    const routines = Store.routinesFor(date);
    const planned = tasks.reduce(function (a, t) {
      if (!t.start) return a;
      const e = t.end ? Utils.timeToMin(t.end) : Utils.timeToMin(t.start) + (t.est || 45);
      return a + (e - Utils.timeToMin(t.start));
    }, 0);

    root.innerHTML = `
      <div class="sched-head">
        <div class="date-nav">
          <button class="icon-btn plain" data-nav="-1" title="前一天">${Utils.icon('left', 17)}</button>
          <div class="date-nav-current" data-action="pick-date" title="选择日期">
            <b>${Utils.fmtDate(date, 'md')}</b><span>${Utils.weekdayName(date)}${Utils.isToday(date) ? ' · 今天' : ''}</span>
          </div>
          <button class="icon-btn plain" data-nav="1" title="后一天">${Utils.icon('right', 17)}</button>
        </div>
        <button class="btn btn-sm" data-action="today">今天</button>
        <div class="spacer grow"></div>
        <button class="btn btn-sm" data-action="copy-day">${Utils.icon('copy', 14)} 复制当天计划</button>
        <button class="btn btn-sm" data-action="export-day">${Utils.icon('download', 14)} 导出日报</button>
        <button class="btn btn-primary btn-sm" data-action="new-task">${Utils.icon('plus', 14)} 新建任务</button>
      </div>
      ${weekStripHTML(date)}
      <div class="sched-grid">
        <section class="card flush" style="padding:16px 18px 20px">
          <div class="card-head">
            <div class="card-title">${Utils.icon('clock', 16)} 时间轴</div>
            <div class="card-sub">点击空白处即可在该时段创建任务</div>
            <div class="spacer"></div>
            <span class="pill">已安排 ${Utils.durShort(planned)}</span>
          </div>
          ${timelineHTML(date)}
        </section>
        <aside class="stack">
          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('layout', 16)} 当日小结</div></div>
            <div class="stat-grid">
              <div class="stat-box"><div class="stat-top"><span>任务</span>${Utils.icon('checkCircle', 14)}</div><b>${st.done}<small>/${st.total}</small></b></div>
              <div class="stat-box"><div class="stat-top"><span>专注</span>${Utils.icon('clock', 14)}</div><b>${Utils.durShort(st.focusMin)}</b></div>
              <div class="stat-box"><div class="stat-top"><span>未完成</span>${Utils.icon('alert', 14)}</div><b>${st.left}</b></div>
              <div class="stat-box"><div class="stat-top"><span>常规打卡</span>${Utils.icon('refresh', 14)}</div><b>${st.routineDone}<small>/${st.routineTotal}</small></b></div>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('plus', 16)} 添加到这一天</div></div>
            <form class="quickadd-row" id="quickAddForm" style="gap:8px">
              <input class="input grow" id="quickAddInput" placeholder="如 14:00 读文献 #文献 @60m" autocomplete="off">
              <button class="btn btn-soft btn-sm" type="submit">添加</button>
            </form>
            <div class="field-hint mt-10">支持格式：时间 / #类别 / !优先级 / @时长 / @明天</div>
          </section>
          ${routines.length ? `<section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('refresh', 16)} 常规安排</div></div>
            ${routines.map(function (r) {
              const done = Store.routineDone(date, r.id);
              return `<div class="routine-row ${done ? 'done' : ''}">
                <button class="task-check" data-action="toggle-routine" data-id="${r.id}">${Utils.icon('check', 11)}</button>
                <div class="grow"><div class="routine-title">${Utils.esc(r.title)}</div></div>
                <span class="routine-time">${r.start || '全天'}</span></div>`;
            }).join('')}
          </section>` : ''}
          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('list', 16)} 未安排时间</div>
              <div class="spacer"></div><span class="text-xs text-3">拖动到时间轴可留空，点击安排具体时段</span></div>
            ${flex.length ? `<div class="stack-sm">${flex.map(function (t) {
              return `<div class="review-item" data-flex="${t.id}">
                <button class="task-check" data-action="toggle-task" data-id="${t.id}">${Utils.icon('check', 11)}</button>
                <div class="grow ${t.done ? 'muted' : ''}" style="${t.done ? 'text-decoration:line-through' : ''}">${Utils.esc(t.title)}
                  <span class="pill pill-cat" style="--c:${(Utils.CAT_MAP[t.category] || Utils.CAT_MAP['其他']).color};margin-left:6px">${t.category}</span></div>
                <button class="mini-btn" data-action="schedule-task" data-id="${t.id}" title="安排时间">${Utils.icon('clock', 14)}</button>
                <button class="mini-btn" data-action="edit-task" data-id="${t.id}" title="编辑">${Utils.icon('edit', 14)}</button>
              </div>`;
            }).join('')}</div>` : '<div class="empty" style="padding:12px 0"><div class="empty-text">所有任务都安排好了 👌</div></div>'}
          </section>
          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('download', 16)} 导出</div></div>
            <div class="stack-sm">
              <button class="btn btn-block btn-sm" data-action="export-week">${Utils.icon('download', 14)} 导出本周科研周报（Markdown）</button>
              <button class="btn btn-block btn-sm" data-action="goto-insights">${Utils.icon('insights', 14)} 查看数据统计与复盘</button>
            </div>
          </section>
        </aside>
      </div>`;
    bind(root, date);
  }

  function bind(root, date) {
    root.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () {
        App.go('schedule', { date: Utils.addDays(date, Number(b.dataset.nav)) });
      });
    });
    root.querySelectorAll('[data-day]').forEach(function (b) {
      b.addEventListener('click', function () { App.go('schedule', { date: b.dataset.day }); });
    });
    root.querySelectorAll('.tl-slot').forEach(function (slot) {
      slot.addEventListener('click', function (e) {
        if (e.target.closest('.tl-block')) return;
        const h = Number(slot.dataset.hour);
        App.openTaskEditor(null, { date: date, start: Utils.minToTime(h * 60), end: Utils.minToTime((h + 1) * 60) });
      });
    });
    root.querySelectorAll('.tl-block').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        App.openTaskEditor(b.dataset.task);
      });
    });
    const form = root.querySelector('#quickAddForm');
    const input = root.querySelector('#quickAddInput');
    if (form && input) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const raw = input.value.trim();
        if (!raw) return;
        const parsed = Utils.parseQuickAdd(raw);
        parsed.date = parsed.date === Utils.today() && !/@/.test(raw) ? date : parsed.date;
        if (!parsed.title) { UI.toast('请输入任务内容', { type: 'info' }); return; }
        const t = Store.addTask(parsed);
        input.value = '';
        input.focus();
        UI.toast('已添加：' + Utils.truncate(t.title, 20), { type: 'success', action: { label: '撤销', onClick: function () { Store.deleteTask(t.id); } } });
      });
    }
    root.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      const action = btn.dataset.action, id = btn.dataset.id;
      if (action === 'today') App.go('schedule', { date: Utils.today() });
      else if (action === 'new-task') App.openTaskEditor(null, { date: date });
      else if (action === 'toggle-task') Store.toggleTask(id);
      else if (action === 'edit-task') App.openTaskEditor(id);
      else if (action === 'schedule-task') App.openTaskEditor(id, { focusTime: true });
      else if (action === 'toggle-routine') Store.toggleRoutine(date, id);
      else if (action === 'export-day') {
        Utils.download('科研日报-' + date + '.md', Store.exportDayMarkdown(date), 'text/markdown');
        UI.toast('已导出日报', { type: 'success' });
      } else if (action === 'export-week') {
        Utils.download('科研周报-' + Utils.startOfWeek(date) + '.md', Store.exportWeekMarkdown(date), 'text/markdown');
        UI.toast('已导出周报', { type: 'success' });
      } else if (action === 'goto-insights') App.go('insights');
      else if (action === 'copy-day') {
        const tasks = Store.tasksOn(date);
        const lines = tasks.map(function (t) {
          return (t.start ? t.start + (t.end ? '–' + t.end : '') + ' ' : '') + t.title + ' #' + t.category;
        }).join('\n');
        Utils.copyText('【' + Utils.fmtDate(date, 'md') + ' 计划】\n' + (lines || '（暂无任务）')).then(function () {
          UI.toast('当天计划已复制到剪贴板', { type: 'success' });
        });
      } else if (action === 'pick-date') {
        UI.prompt({ title: '跳转到指定日期', label: '日期（YYYY-MM-DD）', value: date, okLabel: '跳转' }).then(function (d) {
          if (d && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) App.go('schedule', { date: d.trim() });
          else if (d) UI.toast('日期格式应为 2026-10-11', { type: 'error' });
        });
      }
    });
  }

  Views.schedule = {
    title: '日程安排',
    subtitle: function () { return '时间轴视图 · 点击空白时段快速创建任务'; },
    render: render
  };
})();

