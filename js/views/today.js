/* ============================================================
   科研日课 · views/today.js
   今日：日程 / 快速添加 / 常规安排 / 番茄钟 / 实验与文献速览
   ============================================================ */
window.Views = window.Views || {};

(function () {
  function catPill(cat) {
    const c = Utils.CAT_MAP[cat] || Utils.CAT_MAP['其他'];
    return `<span class="pill pill-cat" style="--c:${c.color}"><i class="pill-dot"></i>${Utils.esc(cat)}</span>`;
  }
  function priPill(p) {
    const pr = Utils.PRIOS.find(function (x) { return x.id === p; }) || Utils.PRIOS[1];
    return `<span class="pill pill-pri" style="--c:${pr.color}">${pr.label}优先级</span>`;
  }
  function taskRowHTML(t) {
    const nowMin = Utils.nowMin();
    const isNow = !t.done && t.start && t.end && nowMin >= Utils.timeToMin(t.start) && nowMin <= Utils.timeToMin(t.end) && Utils.isToday(t.date);
    const overdue = !t.done && Utils.isPast(t.date);
    const exp = t.expId ? Store.expById(t.expId) : null;
    const paper = t.paperId ? Store.paperById(t.paperId) : null;
    return `<div class="task-row ${t.done ? 'done' : ''}" data-task="${t.id}" draggable="true">
      <span class="task-grip" title="拖动排序">${Utils.icon('grip', 15)}</span>
      <button class="task-check" data-action="toggle-task" data-id="${t.id}" title="${t.done ? '标记未完成' : '标记完成'}">${Utils.icon('check', 12)}</button>
      <div class="task-time">
        ${t.start ? `<b>${t.start}</b>${t.end ? `<span>${t.end}</span>` : ''}` : `<span class="flex">灵活</span>`}
      </div>
      <div class="task-body">
        <div class="task-title">${Utils.esc(t.title)}${overdue ? ' <span class="overdue-dot" title="已过期"></span>' : ''}${isNow ? ' <span class="now-badge">进行中</span>' : ''}</div>
        <div class="task-meta">
          ${catPill(t.category)}
          ${t.priority !== 2 ? priPill(t.priority) : ''}
          ${t.est ? `<span class="pill pill-ghost">${Utils.icon('clock', 11)} ${Utils.durShort(t.est)}</span>` : ''}
          ${exp ? `<span class="pill pill-ghost" title="关联实验">${Utils.icon('flask', 11)} ${Utils.esc(Utils.truncate(exp.title, 16))}</span>` : ''}
          ${paper ? `<span class="pill pill-ghost" title="关联文献">${Utils.icon('book', 11)} ${Utils.esc(Utils.truncate(paper.title, 16))}</span>` : ''}
        </div>
        ${t.notes ? `<div class="task-note">${Utils.esc(t.notes)}</div>` : ''}
      </div>
      <div class="task-actions">
        ${!t.done && !t.start ? `<button class="mini-btn" data-action="schedule-task" data-id="${t.id}" title="安排时间">${Utils.icon('clock', 15)}</button>` : ''}
        ${!t.done ? `<button class="mini-btn" data-action="focus-task" data-id="${t.id}" title="开始专注">${Utils.icon('play', 15)}</button>` : ''}
        ${!t.done ? `<button class="mini-btn" data-action="postpone-task" data-id="${t.id}" title="顺延到明天">${Utils.icon('arrowRight', 15)}</button>` : ''}
        <button class="mini-btn" data-action="edit-task" data-id="${t.id}" title="编辑">${Utils.icon('edit', 15)}</button>
        <button class="mini-btn danger-hover" data-action="delete-task" data-id="${t.id}" title="删除">${Utils.icon('trash', 15)}</button>
      </div>
    </div>`;
  }
  function routineRowHTML(r, date) {
    const done = Store.routineDone(date, r.id);
    return `<div class="routine-row ${done ? 'done' : ''}">
      <button class="task-check" data-action="toggle-routine" data-id="${r.id}" title="${done ? '取消打卡' : '完成打卡'}">${Utils.icon('check', 11)}</button>
      <div class="grow">
        <div class="routine-title">${Utils.esc(r.title)}</div>
      </div>
      <span class="routine-time">${r.start ? r.start + (r.end ? '–' + r.end : '') : '全天'}</span>
      <span class="pill pill-cat" style="--c:${(Utils.CAT_MAP[r.category] || Utils.CAT_MAP['其他']).color}">${Utils.esc(r.category)}</span>
      <button class="mini-btn" data-action="edit-routine" data-id="${r.id}" title="编辑">${Utils.icon('edit', 14)}</button>
      <button class="mini-btn danger-hover" data-action="delete-routine" data-id="${r.id}" title="删除">${Utils.icon('trash', 14)}</button>
    </div>`;
  }
  function expMiniHTML(e) {
    const st = Utils.EXP_STATUS_MAP[e.status] || {};
    const prog = Store.expProgress(e);
    return `<div class="kanban-card" data-open-exp="${e.id}" style="box-shadow:none;border-color:var(--border-2)">
      <div class="row between" style="gap:8px;align-items:flex-start">
        <div class="kanban-card-title">${Utils.esc(e.title)}</div>
        <span class="pill pill-cat" style="--c:${st.color};flex:none">${st.label}</span>
      </div>
      <div class="progress-line mt-10"><span class="num" style="width:32px">${prog}%</span><div class="bar-mini"><i style="width:${prog}%"></i></div></div>
      <div class="kanban-card-foot">
        <button class="mini-btn" data-action="exp-log" data-id="${e.id}" title="记录进展">${Utils.icon('edit', 14)}</button>
        <button class="mini-btn" data-action="exp-start-focus" data-id="${e.id}" title="设为专注对象">${Utils.icon('play', 14)}</button>
        <span class="grow"></span>
        <span class="text-xs">${(e.logs || []).length} 条记录</span>
      </div>
    </div>`;
  }
  function paperMiniHTML(p) {
    const st = Utils.PAPER_STATUS_MAP[p.status] || {};
    const mins = Store.paperMinutes(p.id);
    return `<div class="kanban-card" data-open-paper="${p.id}" style="box-shadow:none;border-color:var(--border-2)">
      <div class="kanban-card-title clamp-2">${Utils.esc(p.title)}</div>
      <div class="text-xs text-3 mt-6">${Utils.esc(Utils.truncate(p.authors || '未记录作者', 34))}${p.journal ? ' · ' + Utils.esc(p.journal) : ''}${p.year ? ' ' + p.year : ''}</div>
      <div class="row mt-10" style="gap:8px">
        <span class="pill" style="--c:${st.color};background:color-mix(in srgb,${st.color} 14%, transparent)">${st.label}</span>
        ${mins ? `<span class="text-xs text-3">已读 ${Utils.durShort(mins)}</span>` : ''}
      </div>
      <div class="kanban-card-foot">
        <button class="mini-btn" data-action="paper-log" data-id="${p.id}" data-min="15" title="+15 分钟">${Utils.icon('clock', 14)}<sub style="font-size:9px">15</sub></button>
        <button class="mini-btn" data-action="paper-log" data-id="${p.id}" data-min="30" title="+30 分钟">${Utils.icon('clock', 14)}<sub style="font-size:9px">30</sub></button>
        <button class="mini-btn" data-action="paper-read" data-id="${p.id}" title="标记已读">${Utils.icon('check', 14)}</button>
        <span class="grow"></span>
        <button class="mini-btn" data-action="open-paper" data-id="${p.id}" title="查看详情">${Utils.icon('right', 14)}</button>
      </div>
    </div>`;
  }

  function render(root) {
    const date = Utils.today();
    const st = Store.dayStats(date);
    const tasks = Store.tasksOn(date);
    const timed = tasks.filter(function (t) { return t.start && !t.done; });
    const flex = tasks.filter(function (t) { return !t.start && !t.done; });
    const done = tasks.filter(function (t) { return t.done; });
    const routines = Store.routinesFor(date);
    const doneOpen = App.ui.doneOpen !== false;
    const q = Utils.quoteOfDay();
    const goal = Store.state.settings.dailyFocusGoal || 180;
    const taskGoal = Store.state.settings.dailyTaskGoal || 5;
    const runningExps = Store.state.experiments.filter(function (e) { return e.status === 'running'; }).slice(0, 2);
    const plannedExps = Store.state.experiments.filter(function (e) { return e.status === 'planned'; }).slice(0, 1);
    const miniExps = runningExps.concat(plannedExps).slice(0, 3);
    const miniPapers = Store.state.papers.filter(function (p) { return p.status === 'reading'; })
      .concat(Store.state.papers.filter(function (p) { return p.status === 'todo'; })).slice(0, 3);
    const weekDates = Utils.weekDates(date);
    const weekStats = Store.series(weekDates);
    const weekDone = weekStats.reduce(function (a, s) { return a + s.done; }, 0);
    const weekFocus = weekStats.reduce(function (a, s) { return a + s.focusMin; }, 0);

    const heroRingSize = 108;
    const hero = `<section class="card hero">
      <div class="hero-main">
        <div class="hero-eyebrow">${Utils.icon('sun', 14)} ${Utils.fmtDate(date, 'full')} · 第 ${Utils.isoWeek(date).week} 周</div>
        <div class="hero-title">${Utils.greeting()}${Store.state.settings.name ? '，' + Utils.esc(Store.state.settings.name) : ''} 👋</div>
        <div class="hero-quote">「${Utils.esc(q[0])}」${q[1] ? ' —— ' + q[1] : ''}</div>
        <div class="hero-stats">
          <span class="stat-pill">${Utils.icon('checkCircle', 14)} 任务 <b>${st.done}</b>/${st.total}</span>
          <span class="stat-pill">${Utils.icon('clock', 14)} 专注 <b>${Utils.durShort(st.focusMin)}</b></span>
          <span class="stat-pill">${Utils.icon('book', 14)} 阅读 <b>${Utils.durShort(st.readingMin)}</b></span>
          <span class="stat-pill">${Utils.icon('flame', 14)} 连续 <b>${Store.streak()}</b> 天</span>
        </div>
      </div>
      <div class="hero-ring">${Charts.ring({ value: st.done, max: Math.max(st.total, taskGoal), size: heroRingSize, stroke: 9, center: Math.round((st.done / Math.max(st.total, taskGoal)) * 100) + '%', centerSize: 20, sub: '今日任务' })}</div>
    </section>`;

    const quickAdd = `<section class="card quickadd">
      <form class="quickadd-row" id="quickAddForm">
        <span class="icon-inline">${Utils.icon('plus', 18)}</span>
        <input class="quickadd-input" id="quickAddInput" placeholder="快速记录任务：时间 标题 #类别 !优先级 @时长 — 回车即可" autocomplete="off">
        <button class="btn btn-primary btn-sm" type="submit">添加</button>
      </form>
      <div class="quickadd-hints">
        <span class="qa-hint" data-demo="9:00-10:30 细胞传代 #实验 !高">9:00-10:30 细胞传代 #实验 !高</span>
        <span class="qa-hint" data-demo="14:00 精读文献 #文献 @60m">14:00 精读文献 #文献 @60m</span>
        <span class="qa-hint" data-demo="@明天 组会汇报 #组会 !高">@明天 组会汇报 #组会 !高</span>
        <span class="qa-hint" data-demo="整理数据分析图表 #数据 @90m">整理数据分析图表 #数据 @90m</span>
      </div>
    </section>`;

    const routineCard = `<section class="card">
      <div class="card-head">
        <div class="card-title">${Utils.icon('refresh', 16)} 常规安排</div>
        <div class="card-sub">每日 / 工作日自动出现</div>
        <div class="spacer"></div>
        <button class="btn btn-sm" data-action="add-routine">${Utils.icon('plus', 14)} 添加</button>
      </div>
      ${routines.length ? routines.map(function (r) { return routineRowHTML(r, date); }).join('')
        : `<div class="empty" style="padding:14px 0 10px"><div class="empty-text">还没有常规安排。把「每天读 30 分钟文献」这类固定动作加进来，坚持会更容易。</div>
           <div class="empty-actions"><button class="btn btn-sm btn-soft" data-action="add-routine">添加第一条常规安排</button></div></div>`}
      ${routines.length ? `<div class="text-xs text-3 mt-10">今日打卡 ${st.routineDone}/${st.routineTotal}</div>` : ''}
    </section>`;

    const tasksCard = `<section class="card">
      <div class="card-head">
        <div class="card-title">${Utils.icon('schedule', 16)} 今日安排</div>
        <div class="card-sub">${st.left > 0 ? '还剩 ' + st.left + ' 项' : (st.total ? '全部完成，太棒了' : '')}</div>
        <div class="spacer"></div>
        <button class="btn btn-sm" data-action="export-day">${Utils.icon('download', 14)} 导出日报</button>
        <button class="btn btn-sm btn-soft" data-action="new-task">${Utils.icon('plus', 14)} 新建任务</button>
      </div>
      ${timed.length ? '<div class="section-title">' + Utils.icon('clock', 13) + ' 时间安排</div>' + timed.map(taskRowHTML).join('') : ''}
      ${flex.length ? '<div class="section-title">' + Utils.icon('list', 13) + ' 灵活任务</div><div id="flexTaskList">' + flex.map(taskRowHTML).join('') + '</div>' : ''}
      ${!timed.length && !flex.length ? `<div class="empty">
        <div class="empty-title">今天还没有安排</div>
        <div class="empty-text">用上面的快速输入添加任务，或者从示例数据开始体验完整功能。</div>
        <div class="empty-actions">
          <button class="btn btn-primary btn-sm" data-action="new-task">${Utils.icon('plus', 14)} 新建任务</button>
          <button class="btn btn-sm" data-action="seed-demo">载入示例数据</button>
        </div></div>` : ''}
      ${done.length ? `<button class="collapse-head ${doneOpen ? 'open' : ''}" data-action="toggle-done">${Utils.icon('right', 13)} 已完成 ${done.length} 项</button><div class="${doneOpen ? '' : 'hide'}" id="doneList">${done.map(taskRowHTML).join('')}</div>` : ''}
    </section>`;

    const progressCard = `<section class="card">
      <div class="card-head"><div class="card-title">${Utils.icon('target', 16)} 今日进度</div>
        <div class="spacer"></div><span class="text-xs text-3">目标 ${taskGoal} 项 / ${Utils.durShort(goal)}</span></div>
      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-top"><span>任务完成</span>${Utils.icon('checkCircle', 14)}</div>
          <b>${st.done}<small>/${Math.max(st.total, taskGoal)}</small></b>
          <div class="bar-mini"><i style="width:${Math.min(100, (st.done / Math.max(st.total, taskGoal)) * 100)}%"></i></div>
        </div>
        <div class="stat-box">
          <div class="stat-top"><span>专注时长</span>${Utils.icon('clock', 14)}</div>
          <b>${Math.round(st.focusMin / 60 * 10) / 10}<small>h</small></b>
          <div class="bar-mini"><i style="width:${Math.min(100, (st.focusMin / goal) * 100)}%"></i></div>
        </div>
        <div class="stat-box">
          <div class="stat-top"><span>本周任务</span>${Utils.icon('trend', 14)}</div>
          <b>${weekDone}<small> 项</small></b>
          <div class="bar-mini"><i style="width:${Math.min(100, (weekDone / (Store.state.settings.weeklyTaskGoal || 25)) * 100)}%"></i></div>
        </div>
        <div class="stat-box">
          <div class="stat-top"><span>本周专注</span>${Utils.icon('zap', 14)}</div>
          <b>${Math.round(weekFocus / 60 * 10) / 10}<small>h</small></b>
          <div class="bar-mini"><i style="width:${Math.min(100, (weekFocus / (goal * 5)) * 100)}%"></i></div>
        </div>
      </div>
    </section>`;

    const expCard = `<section class="card">
      <div class="card-head"><div class="card-title">${Utils.icon('flask', 16)} 实验动态</div>
        <div class="spacer"></div>
        <button class="btn btn-sm btn-ghost" data-action="goto-experiments">全部 ${Store.state.experiments.length}</button></div>
      ${miniExps.length ? `<div class="stack-sm">${miniExps.map(expMiniHTML).join('')}</div>`
        : `<div class="empty" style="padding:12px 0"><div class="empty-text">暂无进行中的实验，去「实验计划」创建一条吧。</div></div>`}
      <button class="kanban-add mt-10" data-action="new-experiment">${Utils.icon('plus', 14)} 新建实验</button>
    </section>`;

    const paperCard = `<section class="card">
      <div class="card-head"><div class="card-title">${Utils.icon('book', 16)} 文献阅读</div>
        <div class="spacer"></div>
        <button class="btn btn-sm btn-ghost" data-action="goto-library">文献库 ${Store.state.papers.length}</button></div>
      ${miniPapers.length ? `<div class="stack-sm">${miniPapers.map(paperMiniHTML).join('')}</div>`
        : `<div class="empty" style="padding:12px 0"><div class="empty-text">文献库还是空的，添加第一篇吧。</div></div>`}
      <button class="kanban-add mt-10" data-action="new-paper">${Utils.icon('plus', 14)} 添加文献</button>
    </section>`;

    const notes = Store.state.notes.slice(0, 3);
    const notesCard = `<section class="card">
      <div class="card-head"><div class="card-title">${Utils.icon('bulb', 16)} 灵感速记</div>
        <div class="spacer"></div><button class="btn btn-sm btn-ghost" data-action="all-notes">全部 ${Store.state.notes.length}</button></div>
      <textarea class="textarea" id="noteInput" placeholder="随手记下实验想法、论文灵感、待查问题…（Ctrl+Enter 保存）" style="min-height:64px"></textarea>
      <div class="row mt-10">
        <input class="input grow" id="noteTitle" placeholder="标题（可选）" style="height:32px">
        <button class="btn btn-soft btn-sm" data-action="save-note">保存</button>
      </div>
      ${notes.length ? `<div class="stack-sm mt-14">${notes.map(function (n) {
        return `<div class="review-item"><span class="icon-inline" style="color:var(--c-data)">${Utils.icon('bulb', 14)}</span>
          <div class="grow"><div class="text-sm">${n.title ? '<b>' + Utils.esc(n.title) + '</b> ' : ''}${Utils.esc(Utils.truncate(n.content, 46))}</div>
          <div class="text-xs text-3">${Utils.relTime(n.createdAt)}</div></div>
          <button class="mini-btn" data-action="open-note" data-id="${n.id}" title="查看">${Utils.icon('right', 14)}</button>
          <button class="mini-btn danger-hover" data-action="delete-note" data-id="${n.id}" title="删除">${Utils.icon('trash', 14)}</button></div>`;
      }).join('')}</div>` : ''}
    </section>`;

    root.innerHTML = `<div class="today-grid">
      <div class="col-main stack">
        ${hero}
        ${quickAdd}
        ${routineCard}
        ${tasksCard}
      </div>
      <aside class="col-side stack">
        <div id="pomoCardHost"></div>
        ${progressCard}
        ${expCard}
        ${paperCard}
        ${notesCard}
      </aside>
    </div>`;
    bind(root, date);
  }
  function enableDnD(listEl) {
    if (!listEl) return;
    let dragEl = null;
    listEl.querySelectorAll('[data-task]').forEach(function (row) {
      row.addEventListener('dragstart', function (e) {
        dragEl = row; row.classList.add('dragging');
        try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', row.dataset.task); } catch (err) { }
      });
      row.addEventListener('dragend', function () {
        row.classList.remove('dragging');
        listEl.querySelectorAll('.drop-before,.drop-after').forEach(function (x) { x.classList.remove('drop-before', 'drop-after'); });
      });
      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (!dragEl || dragEl === row) return;
        const r = row.getBoundingClientRect();
        const after = (e.clientY - r.top) > r.height / 2;
        row.classList.toggle('drop-after', after);
        row.classList.toggle('drop-before', !after);
      });
      row.addEventListener('dragleave', function () { row.classList.remove('drop-before', 'drop-after'); });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!dragEl || dragEl === row) return;
        const after = row.classList.contains('drop-after');
        row.classList.remove('drop-before', 'drop-after');
        const ids = Array.prototype.map.call(listEl.querySelectorAll('[data-task]'), function (x) { return x.dataset.task; });
        const from = ids.indexOf(dragEl.dataset.task);
        if (from < 0) return;
        ids.splice(from, 1);
        let to = ids.indexOf(row.dataset.task);
        if (to < 0) return;
        if (after) to += 1;
        ids.splice(to, 0, dragEl.dataset.task);
        Store.reorderTasks(Utils.today(), ids);
      });
    });
  }

  function handleAction(action, btn, root, date) {
    const id = btn.dataset.id;
    switch (action) {
      case 'toggle-task': {
        const t = Store.toggleTask(id);
        if (t && t.done) {
          const undone = Store.dayStats(date).left;
          UI.toast('已完成「' + Utils.truncate(t.title, 16) + '」' + (undone === 0 ? ' · 今天全部搞定 🎉' : ''), {
            type: 'success', action: { label: '撤销', onClick: function () { Store.toggleTask(id); } }
          });
        }
        break;
      }
      case 'edit-task': App.openTaskEditor(id); break;
      case 'schedule-task': App.openTaskEditor(id, { focusTime: true }); break;
      case 'delete-task': {
        const t = Store.state.tasks.find(function (x) { return x.id === id; });
        if (!t) break;
        Store.deleteTask(id);
        UI.toast('已删除任务', { action: { label: '撤销', onClick: function () { Store.undo(); } } });
        break;
      }
      case 'postpone-task': {
        const old = Store.postponeTask(id, 1);
        if (old) UI.toast('已顺延到明天', { action: { label: '撤销', onClick: function () { Store.updateTask(id, { date: old }); } } });
        break;
      }
      case 'focus-task': {
        const t = Store.state.tasks.find(function (x) { return x.id === id; });
        if (!t) break;
        Pomodoro.state().taskId = id;
        Pomodoro.state().category = t.category;
        if (!Pomodoro.state().running) Pomodoro.start();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        UI.toast('开始专注：' + Utils.truncate(t.title, 20), { type: 'info' });
        break;
      }
      case 'toggle-routine': {
        const r = Store.state.routines.find(function (x) { return x.id === id; });
        Store.toggleRoutine(date, id);
        if (r && Store.routineDone(date, id)) UI.toast('打卡成功：' + Utils.truncate(r.title, 18), { type: 'success' });
        break;
      }
      case 'add-routine': App.routineEditor(); break;
      case 'edit-routine': App.routineEditor(id); break;
      case 'delete-routine': {
        Store.deleteRoutine(id);
        UI.toast('已删除常规安排', { action: { label: '撤销', onClick: function () { Store.undo(); } } });
        break;
      }
      case 'new-task': App.openTaskEditor(null, { date: date }); break;
      case 'export-day': {
        Utils.download('科研日报-' + date + '.md', Store.exportDayMarkdown(date), 'text/markdown');
        UI.toast('已导出今日科研日报', { type: 'success' });
        break;
      }
      case 'seed-demo': {
        UI.confirm({
          title: '载入示例数据？', message: '将添加一批示例任务、实验、文献与记录，方便你快速了解各个模块。不会删除你已有的内容。',
          confirmLabel: '载入示例', danger: false
        }).then(function (ok) {
          if (!ok) return;
          Store.seedDemo();
          UI.toast('示例数据已载入，可在设置中一键清空', { type: 'success', duration: 4000 });
        });
        break;
      }
      case 'toggle-done': {
        const list = root.querySelector('#doneList');
        if (!list) break;
        const open = !list.classList.contains('hide');
        list.classList.toggle('hide', open);
        btn.classList.toggle('open', !open);
        App.ui.doneOpen = !open;
        App.persistUI();
        break;
      }
      case 'goto-experiments': App.go('experiments'); break;
      case 'goto-library': App.go('library'); break;
      case 'new-experiment': App.openExperimentEditor(); break;
      case 'new-paper': App.openPaperEditor(); break;
      case 'exp-log': {
        const e = Store.expById(id);
        if (!e) break;
        UI.prompt({
          title: '记录实验进展', sub: Utils.esc(e.title), multiline: true, okLabel: '保存记录',
          placeholder: '今天做了什么？观察到什么现象？下一步计划？'
        }).then(function (text) {
          if (!text) return;
          Store.addExpLog(id, text);
          UI.toast('已记录进展', { type: 'success' });
        });
        break;
      }
      case 'exp-start-focus': {
        Pomodoro.state().category = '实验';
        Pomodoro.state().taskId = '';
        if (!Pomodoro.state().running) Pomodoro.start();
        UI.toast('已开始专注实验工作', { type: 'info' });
        break;
      }
      case 'paper-log': {
        const p = Store.paperById(id);
        if (!p) break;
        Store.logReading(id, Number(btn.dataset.min) || 15, '');
        UI.toast('已记录阅读 ' + (btn.dataset.min || 15) + ' 分钟 · ' + Utils.truncate(p.title, 16), { type: 'success' });
        break;
      }
      case 'paper-read': {
        Store.setPaperStatus(id, 'read');
        UI.toast('已标记为读完 🎉', { type: 'success' });
        break;
      }
      case 'open-paper': App.openPaper(id); break;
      case 'save-note': {
        const ta = root.querySelector('#noteInput');
        const titleInput = root.querySelector('#noteTitle');
        const text = ta ? ta.value.trim() : '';
        if (!text) { UI.toast('先写点内容吧', { type: 'info' }); break; }
        Store.addNote(text, titleInput ? titleInput.value.trim() : '');
        UI.toast('已保存速记', { type: 'success' });
        break;
      }
      case 'all-notes': App.openNotesList(); break;
      case 'open-note': App.openNote(id); break;
      case 'delete-note': {
        Store.deleteNote(id);
        UI.toast('已删除速记', { action: { label: '撤销', onClick: function () { Store.undo(); } } });
        break;
      }
      default: break;
    }
  }

  function bind(root, date) {
    const form = root.querySelector('#quickAddForm');
    const input = root.querySelector('#quickAddInput');
    if (form && input) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const raw = input.value.trim();
        if (!raw) return;
        const parsed = Utils.parseQuickAdd(raw);
        if (!parsed.title) { UI.toast('请输入任务内容', { type: 'info' }); return; }
        const t = Store.addTask(parsed);
        input.value = '';
        input.focus();
        const label = (t.date === date ? '' : Utils.fmtDate(t.date, 'md') + ' ') + (t.start ? t.start + '–' + (t.end || '') + ' ' : '') + Utils.truncate(t.title, 18);
        UI.toast('已添加：' + label, { type: 'success', action: { label: '撤销', onClick: function () { Store.deleteTask(t.id); } } });
      });
    }
    root.querySelectorAll('.qa-hint').forEach(function (h) {
      h.addEventListener('click', function () {
        if (input) { input.value = h.dataset.demo || ''; input.focus(); }
      });
    });
    const noteTa = root.querySelector('#noteInput');
    if (noteTa) {
      noteTa.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          const btn = root.querySelector('[data-action=save-note]');
          if (btn) btn.click();
        }
      });
    }
    root.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (btn) { e.preventDefault(); handleAction(btn.dataset.action, btn, root, date); return; }
      const expNode = e.target.closest('[data-open-exp]');
      if (expNode) { App.openExperiment(expNode.dataset.openExp); return; }
      const paperNode = e.target.closest('[data-open-paper]');
      if (paperNode) { App.openPaper(paperNode.dataset.openPaper); return; }
    });
    enableDnD(root.querySelector('#flexTaskList'));
    Pomodoro.render();
  }

  Views.today = {
    title: '今日',
    subtitle: function () { return Utils.fmtDate(Utils.today(), 'full') + ' · 今日安排与专注记录'; },
    render: render,
    mount: function () { Pomodoro.render(); }
  };
})();


