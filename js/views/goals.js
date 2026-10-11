/* ============================================================
   科研日课 · views/goals.js
   科研目标：中期规划 · 里程碑 · 甘特时间轴 · 关联实验与文献
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const STATUS_RANK = { active: 0, paused: 1, done: 2, archived: 3 };

  const TEMPLATES = [
    { id: 'paper', label: '投稿一篇论文', type: '投稿', months: 4,
      desc: '把实验结果整理成一篇可投稿的论文。',
      steps: ['确定论文框架与目标期刊', '补齐关键实验数据', '完成正文初稿', '投稿并处理返修'] },
    { id: 'method', label: '掌握一项新技术', type: '学习', months: 3,
      desc: '从读懂到跑通，最终能用到自己的课题上。',
      steps: ['精读 5 篇代表性文献', '复现公开数据集', '迁移到自己的数据', '整理成方法笔记'] },
    { id: 'thesis', label: '学位论文阶段任务', type: '答辩', months: 6,
      desc: '按章节推进学位论文，避免最后集中赶工。',
      steps: ['确定章节结构', '完成主体章节初稿', '导师修改与完善', '查重、送审与答辩准备'] }
  ];

  function ui() {
    return App.ui.goals || (App.ui.goals = { view: 'cards', status: 'active', type: '', q: '' });
  }

  function typeOf(g) { return Utils.GOAL_TYPE_MAP[g.type] || Utils.GOAL_TYPE_MAP['其他']; }
  function statusOf(g) { return Utils.GOAL_STATUS_MAP[g.status] || Utils.GOAL_STATUS_MAP['active']; }

  function filtered() {
    const s = ui();
    const q = (s.q || '').toLowerCase();
    let list = Store.state.goals.slice();
    if (s.status !== 'all') list = list.filter(function (g) { return g.status === s.status; });
    if (s.type) list = list.filter(function (g) { return g.type === s.type; });
    if (q) {
      list = list.filter(function (g) {
        const hay = [g.title, g.desc, g.type, (g.milestones || []).map(function (m) { return m.title; }).join(' ')]
          .join(' ').toLowerCase();
        return hay.indexOf(q) >= 0;
      });
    }
    list.sort(function (a, b) {
      const r = (STATUS_RANK[a.status] || 0) - (STATUS_RANK[b.status] || 0);
      if (r) return r;
      const ad = a.due || '9999-99-99';
      const bd = b.due || '9999-99-99';
      if (ad !== bd) return ad.localeCompare(bd);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }

  function dueInfo(g) {
    const today = Utils.today();
    if (!g.due) return { text: '未设截止日期', cls: '' };
    if (g.status === 'done') return { text: '已完成 · 截止 ' + Utils.fmtDate(g.due, 'md'), cls: '' };
    const d = Utils.diffDays(today, g.due);
    if (d < 0) return { text: '已逾期 ' + Math.abs(d) + ' 天', cls: 'is-danger' };
    if (d === 0) return { text: '今天到期', cls: 'is-warn' };
    if (d <= 14) return { text: '还有 ' + d + ' 天', cls: 'is-warn' };
    return { text: '还有 ' + d + ' 天', cls: '' };
  }

  function nextMilestone(g) {
    const today = Utils.today();
    const open = (g.milestones || []).filter(function (m) { return !m.done; });
    if (!open.length) return null;
    const upcoming = open.filter(function (m) { return m.date && m.date >= today; });
    const pool = upcoming.length ? upcoming : open;
    pool.sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); });
    return pool[0];
  }

  function linkText(g) {
    const parts = [];
    if ((g.expIds || []).length) parts.push('实验 ' + g.expIds.length);
    if ((g.paperIds || []).length) parts.push('文献 ' + g.paperIds.length);
    return parts.length ? parts.join(' · ') : '未关联实验 / 文献';
  }

  function kpi(icon, label, value, note) {
    return `<div class="kpi">
      <div class="kpi-top"><span class="kpi-icon">${Utils.icon(icon, 15)}</span>${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${note}</div>
    </div>`;
  }

  function cardHTML(g) {
    const type = typeOf(g);
    const st = statusOf(g);
    const pct = Store.goalProgress(g);
    const due = dueInfo(g);
    const ms = nextMilestone(g);
    const totalMs = (g.milestones || []).length;
    const doneMs = (g.milestones || []).filter(function (m) { return m.done; }).length;
    return `<article class="goal-card ${g.status === 'done' ? 'is-done' : ''}" data-goal="${g.id}" style="--gc:${type.color}">
      <div class="goal-head">
        <span class="pill pill-cat"><span class="icon-inline">${Utils.icon(type.icon, 12)}</span>${Utils.esc(g.type)}</span>
        <span class="pill pill-ghost goal-status" style="color:${st.color}"><i class="pill-dot"></i>${st.label}</span>
        <div class="grow"></div>
        <button class="mini-btn" data-act="goal-menu" data-id="${g.id}" title="更多操作">${Utils.icon('grip', 15)}</button>
      </div>
      <h3 class="goal-title">${Utils.esc(g.title || '未命名目标')}</h3>
      ${g.desc ? '<p class="goal-desc clamp-2">' + Utils.esc(g.desc) + '</p>' : ''}
      <div class="goal-progress">
        <div class="goal-bar"><i style="width:${pct}%"></i></div>
        <span class="num">${pct}%</span>
      </div>
      <div class="goal-meta">
        <span class="gm"><span class="icon-inline">${Utils.icon('schedule', 13)}</span>${Utils.fmtDate(g.start, 'md')} → ${g.due ? Utils.fmtDate(g.due, 'md') : '未定'}</span>
        <span class="gm ${due.cls}"><span class="icon-inline">${Utils.icon('clock', 13)}</span>${due.text}</span>
      </div>
      ${totalMs ? `<div class="goal-next">
        <span class="icon-inline">${Utils.icon('checkCircle', 13)}</span>
        <span class="text-3">里程碑 ${doneMs}/${totalMs}</span>
        <span class="grow"></span>
        ${ms ? '<span class="goal-ms-next truncate" title="' + Utils.esc(ms.title) + '">' + Utils.esc(ms.title) + (ms.date ? ' · ' + Utils.fmtDate(ms.date, 'md') : '') + '</span>'
             : '<span class="text-xs text-3">里程碑已全部完成</span>'}
      </div>` : ''}
      <div class="goal-foot">
        <span class="text-xs text-3">${linkText(g)}</span>
        <div class="grow"></div>
        <button class="btn btn-sm btn-ghost" data-act="goal-task" data-id="${g.id}">${Utils.icon('plus', 13)} 今日任务</button>
        <button class="btn btn-sm btn-soft" data-act="goal-edit" data-id="${g.id}">${Utils.icon('edit', 13)} 编辑</button>
      </div>
    </article>`;
  }

  function timelineRange(list) {
    const today = Utils.today();
    let from = today;
    let to = Utils.addDays(today, 60);
    list.forEach(function (g) {
      if (g.start && g.start < from) from = g.start;
      const end = g.due || g.start;
      if (end && end > to) to = end;
    });
    const s = Utils.parseDate(from);
    s.setDate(1);
    const e = Utils.parseDate(to);
    e.setMonth(e.getMonth() + 1);
    e.setDate(0);
    const fromStr = Utils.toStr(s);
    const toStr = Utils.toStr(e);
    if (Utils.diffDays(fromStr, toStr) > 730) return { from: Utils.addDays(fromStr, 0), to: Utils.addDays(fromStr, 730) };
    return { from: fromStr, to: toStr };
  }

  function monthCells(range, totalDays) {
    const cells = [];
    const end = Utils.parseDate(range.to);
    let cur = Utils.parseDate(range.from);
    while (cur <= end) {
      const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
      const last = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const s = first < Utils.parseDate(range.from) ? Utils.parseDate(range.from) : first;
      const e = last > end ? end : last;
      cells.push({
        label: (cur.getMonth() === 0 ? cur.getFullYear() + '年' : '') + (cur.getMonth() + 1) + '月',
        days: Utils.diffDays(Utils.toStr(s), Utils.toStr(e)) + 1
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return cells.map(function (m) { m.pct = (m.days / totalDays) * 100; return m; });
  }

  function timelineHTML(list) {
    const range = timelineRange(Store.state.goals);
    const totalDays = Utils.diffDays(range.from, range.to) + 1;
    const months = monthCells(range, totalDays);
    const nowLeft = Utils.clamp((Utils.diffDays(range.from, Utils.today()) / totalDays) * 100, 0, 100);
    const cols = months.map(function (m) { return '<div class="gantt-col" style="width:' + m.pct + '%"></div>'; }).join('');
    const head = months.map(function (m) { return '<div class="gantt-month" style="width:' + m.pct + '%">' + m.label + '</div>'; }).join('');
    const rows = list.map(function (g) {
      const type = typeOf(g);
      const pct = Store.goalProgress(g);
      const start = g.start && g.start > range.from ? g.start : range.from;
      const endRaw = g.due && g.due > start ? g.due : start;
      const end = endRaw > range.to ? range.to : endRaw;
      const left = Utils.clamp((Utils.diffDays(range.from, start) / totalDays) * 100, 0, 100);
      const width = Math.max(2.2, ((Utils.diffDays(start, end) + 1) / totalDays) * 100);
      const ms = (g.milestones || []).filter(function (m) {
        return m.date && m.date >= range.from && m.date <= range.to;
      }).map(function (m) {
        const l = Utils.clamp((Utils.diffDays(range.from, m.date) / totalDays) * 100, 0, 100);
        return '<i class="gantt-ms ' + (m.done ? 'done' : '') + '" style="left:' + l + '%" title="' +
          Utils.esc(m.title || '里程碑') + (m.date ? ' · ' + Utils.fmtDate(m.date, 'md') : '') + (m.done ? ' · 已完成' : '') + '"></i>';
      }).join('');
      return `<div class="gantt-row">
        <div class="gantt-label" data-goal="${g.id}" title="${Utils.esc(g.title || '未命名目标')}">
          <span class="gantt-dot" style="background:${type.color}"></span>
          <span class="truncate">${Utils.esc(g.title || '未命名目标')}</span>
        </div>
        <div class="gantt-track">
          <div class="gantt-cols">${cols}</div>
          <button class="gantt-bar" data-act="goal-edit" data-id="${g.id}"
            style="left:${left}%;width:${width}%;--gc:${type.color}"
            title="${Utils.esc(g.title || '')} · ${Utils.fmtDate(g.start, 'md')} → ${g.due ? Utils.fmtDate(g.due, 'md') : '未定'} · 进度 ${pct}%">
            <span class="gantt-bar-fill" style="width:${pct}%"></span>
          </button>
          ${ms}
          <i class="gantt-now" style="left:${nowLeft}%"></i>
        </div>
      </div>`;
    }).join('');
    return `<section class="card">
      <div class="card-head">
        <div class="card-title">${Utils.icon('trend', 16)} 目标时间轴</div>
        <div class="card-sub">${Utils.fmtDate(range.from, 'md')} – ${Utils.fmtDate(range.to, 'md')}</div>
        <div class="spacer"></div>
        <span class="text-xs text-3">竖线 = 今天 · 菱形 = 里程碑 · 点击色条可编辑</span>
      </div>
      <div class="gantt">
        <div class="gantt-row gantt-head-row">
          <div class="gantt-label"></div>
          <div class="gantt-track gantt-head">${head}</div>
        </div>
        ${rows}
      </div>
    </section>`;
  }

  function templatesHTML() {
    return `<div class="divider"></div>
      <div class="section-title">${Utils.icon('sparkles', 15)} 从模板快速开始</div>
      <div class="goal-templates">
        ${TEMPLATES.map(function (t) {
          return `<button class="goal-tmpl" data-act="tmpl" data-tmpl="${t.id}">
            <span class="gt-icon">${Utils.icon(Utils.GOAL_TYPE_MAP[t.type].icon, 16)}</span>
            <span class="gt-body">
              <span class="gt-title">${t.label}</span>
              <span class="gt-desc">${t.desc}</span>
              <span class="gt-steps">${t.steps.length} 个里程碑 · 约 ${t.months} 个月</span>
            </span>
          </button>`;
        }).join('')}
      </div>`;
  }

  function emptyHTML() {
    const noGoals = !Store.state.goals.length;
    return `<section class="card">
      <div class="empty">
        <div class="empty-art">${Utils.icon('target', 34)}</div>
        <div class="empty-title">${noGoals ? '还没有科研目标' : '没有符合筛选条件的目标'}</div>
        <div class="empty-text">把「投出一篇论文」「掌握单细胞分析」「完成毕业答辩」这类中期目标记下来，拆成里程碑，就能一眼看到整体节奏。</div>
        <div class="empty-actions">
          <button class="btn btn-primary" data-act="goal-new">${Utils.icon('plus', 16)} 新建目标</button>
          ${noGoals ? '<button class="btn btn-soft" data-act="tmpl" data-tmpl="paper">' + Utils.icon('sparkles', 15) + ' 用模板创建</button>' : ''}
        </div>
      </div>
      ${noGoals ? templatesHTML() : ''}
    </section>`;
  }

  function render(root) {
    const s = ui();
    const gs = Store.goalStats();
    const list = filtered();
    const typeCount = {};
    Store.state.goals.forEach(function (g) { typeCount[g.type] = (typeCount[g.type] || 0) + 1; });
    const statusTabs = [{ id: 'active', label: '推进中' }, { id: 'done', label: '已完成' }, { id: 'paused', label: '已暂停' }, { id: 'all', label: '全部' }];

    root.innerHTML = `
      <div class="kpi-grid goals-kpi">
        ${kpi('target', '推进中目标', gs.active + '<small>个</small>', gs.dueSoon ? '其中 ' + gs.dueSoon + ' 个 30 天内到期' : '暂无临期目标')}
        ${kpi('alert', '需要关注', gs.overdue + '<small>个</small>', gs.overdue ? '已超过截止日期' : '没有逾期目标')}
        ${kpi('checkCircle', '已完成', gs.done + '<small>个</small>', '累计创建 ' + gs.total + ' 个目标')}
        ${kpi('award', '里程碑完成', gs.milestoneDone + '<small>/ ' + gs.milestoneTotal + '</small>',
          gs.nextMilestone ? '下一项：' + Utils.truncate(gs.nextMilestone.title, 12) : '暂无待推进里程碑')}
        ${kpi('trend', '平均进度', gs.avgProgress + '<small>%</small>', '进行中目标的完成度')}
      </div>

      <div class="lib-toolbar">
        <div class="range-tabs">
          ${statusTabs.map(function (t) {
            return '<button class="range-tab ' + (s.status === t.id ? 'active' : '') + '" data-status="' + t.id + '">' + t.label + '</button>';
          }).join('')}
        </div>
        <div class="grow"></div>
        <div class="select-wrap" style="width:132px">
          <select class="select" id="goalType">
            <option value="">全部类型</option>
            ${Utils.GOAL_TYPES.map(function (t) {
              return '<option value="' + t.id + '" ' + (s.type === t.id ? 'selected' : '') + '>' + t.id + '（' + (typeCount[t.id] || 0) + '）</option>';
            }).join('')}
          </select>
        </div>
        <div class="segmented" style="width:auto">
          <button class="segmented-item ${s.view === 'cards' ? 'active' : ''}" data-view="cards">${Utils.icon('grid', 14)} 卡片</button>
          <button class="segmented-item ${s.view === 'timeline' ? 'active' : ''}" data-view="timeline">${Utils.icon('trend', 14)} 时间轴</button>
        </div>
        <div style="width:180px"><input class="input" id="goalSearch" placeholder="搜索目标 / 里程碑…" value="${Utils.esc(s.q || '')}"></div>
        <button class="btn btn-primary btn-sm" data-act="goal-new">${Utils.icon('plus', 14)} 新建目标</button>
      </div>

      ${Store.state.goals.length === 0 ? emptyHTML()
        : (list.length === 0 ? emptyHTML()
          : (s.view === 'timeline' ? timelineHTML(list) : '<div class="goal-grid">' + list.map(cardHTML).join('') + '</div>'))}
    `;
    bind(root);
  }

  function bind(root) {
    root.addEventListener('click', function (e) {
      const statusBtn = e.target.closest('[data-status]');
      if (statusBtn) { ui().status = statusBtn.dataset.status; App.persistUI(); App.render({ keepScroll: true }); return; }
      const viewBtn = e.target.closest('[data-view]');
      if (viewBtn) { ui().view = viewBtn.dataset.view; App.persistUI(); App.render({ keepScroll: true }); return; }
      const actEl = e.target.closest('[data-act]');
      if (actEl) {
        const act = actEl.dataset.act;
        const id = actEl.dataset.id;
        if (act === 'goal-new') { openEditor(null); return; }
        if (act === 'goal-edit') { openEditor(id); return; }
        if (act === 'goal-menu') { goalMenu(actEl, id); return; }
        if (act === 'goal-task') { addTodayTask(id); return; }
        if (act === 'tmpl') { createFromTemplate(actEl.dataset.tmpl); return; }
      }
      const card = e.target.closest('[data-goal]');
      if (card && !e.target.closest('button')) openEditor(card.dataset.goal);
    });
    const search = root.querySelector('#goalSearch');
    if (search) {
      search.addEventListener('input', Utils.debounce(function () {
        ui().q = search.value.trim();
        App.render({ keepScroll: true, keepFocus: '#goalSearch' });
      }, 240));
    }
    const typeSel = root.querySelector('#goalType');
    if (typeSel) typeSel.addEventListener('change', function () { ui().type = typeSel.value; App.render({ keepScroll: true }); });
  }

  function addTodayTask(id) {
    const g = Store.goalById(id);
    if (!g) return;
    const cat = g.type === '学习' ? '文献' : (g.type === '实验' ? '实验' : (g.type === '论文' || g.type === '投稿' ? '写作' : '其他'));
    App.openTaskEditor(null, { title: g.title, date: Utils.today(), category: cat, expId: (g.expIds || [])[0] || '' });
  }

  function createFromTemplate(tid) {
    const t = TEMPLATES.find(function (x) { return x.id === tid; });
    if (!t) return;
    const today = Utils.today();
    const total = t.months * 30;
    const milestones = t.steps.map(function (text, i) {
      return { id: Utils.uid(), title: text, date: Utils.addDays(today, Math.round(total * (i + 1) / t.steps.length)), done: false };
    });
    Store.addGoal({ title: t.label, type: t.type, desc: t.desc, start: today, due: Utils.addDays(today, total), milestones: milestones });
    ui().status = 'all';
    UI.toast('已按模板创建目标，可以继续调整', { type: 'success' });
  }

  function goalMenu(anchor, id) {
    const g = Store.goalById(id);
    if (!g) return;
    UI.menu(anchor, [
      { icon: 'edit', label: '编辑目标', onClick: function () { openEditor(id); } },
      { icon: 'checkCircle', label: g.status === 'done' ? '重新标记为推进中' : '标记为已完成', onClick: function () {
          Store.updateGoal(id, { status: g.status === 'done' ? 'active' : 'done' });
          UI.toast(g.status === 'done' ? '已恢复为推进中' : '恭喜，目标已完成 🎉', { type: 'success' });
        } },
      { icon: 'pause', label: g.status === 'paused' ? '恢复推进' : '暂停推进', onClick: function () {
          Store.updateGoal(id, { status: g.status === 'paused' ? 'active' : 'paused' });
        } },
      { icon: 'copy', label: '复制这个目标', onClick: function () {
          const copy = JSON.parse(JSON.stringify(g));
          copy.id = null;
          copy.title = g.title + '（副本）';
          copy.status = 'active';
          copy.milestones = (copy.milestones || []).map(function (m) { m.done = false; m.id = Utils.uid(); return m; });
          Store.addGoal(copy);
          UI.toast('已复制目标', { type: 'success' });
        } },
      { sep: true },
      { icon: 'trash', label: '删除目标', danger: true, onClick: function () {
          UI.confirm({ title: '删除该目标？', message: '「' + (g.title || '未命名目标') + '」及其里程碑记录都会被删除，任务与文献不受影响。', confirmLabel: '删除' })
            .then(function (ok) { if (ok) { Store.deleteGoal(id); UI.toast('目标已删除', { type: 'success' }); } });
        } }
    ]);
  }

  function openEditor(id, preset) {
    const existing = id ? Store.goalById(id) : null;
    const draft = existing ? JSON.parse(JSON.stringify(existing)) : Object.assign({
      id: null, title: '', type: '论文', status: 'active',
      start: Utils.today(), due: Utils.addDays(Utils.today(), 90), desc: '',
      progress: 0, autoProgress: true, milestones: [], expIds: [], paperIds: []
    }, preset || {});
    if (!Array.isArray(draft.milestones)) draft.milestones = [];
    if (!Array.isArray(draft.expIds)) draft.expIds = [];
    if (!Array.isArray(draft.paperIds)) draft.paperIds = [];
    const isNew = !existing;

    const expChips = Store.state.experiments.length
      ? Store.state.experiments.map(function (x) {
          return '<button class="chip ' + (draft.expIds.indexOf(x.id) >= 0 ? 'active' : '') + '" data-link="exp" data-lid="' + x.id + '">' +
            '<i class="dot" style="--c:' + (Utils.EXP_STATUS_MAP[x.status] || {}).color + '"></i>' + Utils.esc(Utils.truncate(x.title, 16)) + '</button>';
        }).join('')
      : '';
    const paperChips = Store.state.papers.length
      ? Store.state.papers.map(function (x) {
          return '<button class="chip ' + (draft.paperIds.indexOf(x.id) >= 0 ? 'active' : '') + '" data-link="paper" data-lid="' + x.id + '">' +
            '<i class="dot" style="--c:' + (Utils.PAPER_STATUS_MAP[x.status] || {}).color + '"></i>' + Utils.esc(Utils.truncate(x.title, 20)) + '</button>';
        }).join('')
      : '';

    const body = `
      <div class="field"><label>目标名称</label>
        <input class="input" id="gTitle" placeholder="例如：完成纳米酶论文投稿" value="${Utils.esc(draft.title || '')}"></div>
      <div class="form-grid mt-14">
        <div class="field full"><label>目标类型</label>
          <div class="chips" id="gType">
            ${Utils.GOAL_TYPES.map(function (t) {
              return '<button class="chip ' + (draft.type === t.id ? 'active' : '') + '" data-gtype="' + t.id + '"><i class="dot" style="--c:' + t.color + '"></i>' + t.id + '</button>';
            }).join('')}
          </div></div>
        <div class="field"><label>开始日期</label><input class="input" type="date" id="gStart" value="${draft.start || Utils.today()}"></div>
        <div class="field"><label>截止日期 <span class="opt">选填</span></label><input class="input" type="date" id="gDue" value="${draft.due || ''}"></div>
        <div class="field full"><label>推进状态</label>
          <div class="segmented" id="gStatus">
            ${Utils.GOAL_STATUS.map(function (st) {
              return '<button class="segmented-item ' + (draft.status === st.id ? 'active' : '') + '" data-gstatus="' + st.id + '">' + st.label + '</button>';
            }).join('')}
          </div></div>
        <div class="field full"><label>目标说明 <span class="opt">选填</span></label>
          <textarea class="textarea" id="gDesc" placeholder="为什么做这个目标？完成的判定标准是什么？">${Utils.esc(draft.desc || '')}</textarea></div>
      </div>

      <div class="form-section">
        <div class="section-title">${Utils.icon('checkCircle', 15)} 里程碑
          <span class="text-xs text-3" id="gMsCount">${draft.milestones.length} 个</span></div>
        <div class="steps-editor" id="gMsList"></div>
        <div class="row mt-10 wrap" style="gap:8px">
          <input class="input grow" id="gMsInput" placeholder="添加里程碑，例如：完成正文初稿">
          <input class="input" type="date" id="gMsDate" style="width:152px">
          <button class="btn btn-sm" data-act="ms-add">${Utils.icon('plus', 14)} 添加</button>
        </div>
      </div>

      <div class="form-section">
        <div class="section-title">${Utils.icon('link', 15)} 关联实验 / 文献 <span class="opt">选填</span></div>
        <div class="link-picker">
          <div class="lp-group"><div class="lp-title">实验</div>
            <div class="chips" id="gExps">${expChips || '<span class="text-xs text-3">还没有实验记录</span>'}</div></div>
          <div class="lp-group"><div class="lp-title">文献</div>
            <div class="chips" id="gPapers">${paperChips || '<span class="text-xs text-3">还没有文献记录</span>'}</div></div>
        </div>
      </div>

      <div class="form-section">
        <div class="row between wrap" style="gap:10px">
          <div>
            <div class="set-name">完成度</div>
            <div class="set-desc" id="gProgHint">${draft.autoProgress !== false && draft.milestones.length ? '按里程碑自动计算' : '手动设置'}</div>
          </div>
          <div class="row" style="gap:10px">
            <label class="switch" title="按里程碑自动计算进度">
              <input type="checkbox" id="gAuto" ${draft.autoProgress !== false ? 'checked' : ''}><span class="track"></span><span class="thumb"></span>
            </label>
            <input class="input" type="number" id="gProgress" min="0" max="100" step="5"
              value="${Store.goalProgress(draft)}" style="width:84px" ${draft.autoProgress !== false && draft.milestones.length ? 'disabled' : ''}>
            <span class="text-sm text-3">%</span>
          </div>
        </div>
      </div>
    `;

    const footer = `
      ${isNew ? '' : '<button class="btn btn-danger" data-act="delete">' + Utils.icon('trash', 14) + ' 删除目标</button>'}
      <div class="grow"></div>
      <button class="btn" data-act="cancel">取消</button>
      <button class="btn btn-primary" data-act="save">${Utils.icon('check', 14)} ${isNew ? '创建目标' : '保存修改'}</button>`;

    const h = UI.openModal({
      size: 'wide', icon: 'target',
      title: isNew ? '新建科研目标' : '编辑目标',
      sub: isNew ? '把中期目标拆成几个关键里程碑，推进更有节奏' : (draft.type + ' · ' + statusOf(draft).label),
      body: body, footer: footer,
      onMount: function (handle) { mountEditor(handle, draft, id, isNew); }
    });
    return h;
  }

  function mountEditor(h, draft, id, isNew) {
    const wrap = h.wrap;

    function msRows() {
      const host = wrap.querySelector('#gMsList');
      if (!draft.milestones.length) {
        host.innerHTML = '<div class="field-hint">还没有里程碑，把它拆成 3-5 个关键节点更容易推进。</div>';
      } else {
        host.innerHTML = draft.milestones.map(function (m) {
          return `<div class="step-row ${m.done ? 'done' : ''}" data-ms="${m.id}">
            <button class="step-check" data-act="ms-toggle" data-ms="${m.id}" title="标记完成">${Utils.icon('check', 11)}</button>
            <input class="input ms-title" data-ms="${m.id}" placeholder="里程碑内容" value="${Utils.esc(m.title || '')}">
            <input class="input ms-date" type="date" data-ms="${m.id}" value="${m.date || ''}">
            <button class="mini-btn danger-hover" data-act="ms-del" data-ms="${m.id}" title="删除">${Utils.icon('trash', 13)}</button>
          </div>`;
        }).join('');
      }
      const count = wrap.querySelector('#gMsCount');
      if (count) count.textContent = draft.milestones.length + ' 个';
    }

    function syncProgressUI() {
      const auto = wrap.querySelector('#gAuto').checked;
      const field = wrap.querySelector('#gProgress');
      const hint = wrap.querySelector('#gProgHint');
      const autoActive = auto && draft.milestones.length > 0;
      field.disabled = autoActive;
      if (autoActive) field.value = Store.goalProgress(Object.assign({}, draft, { autoProgress: true }));
      hint.textContent = autoActive ? '按里程碑自动计算' : '手动设置';
    }

    function collectMilestones() {
      return draft.milestones.filter(function (m) { return (m.title || '').trim(); });
    }

    function save() {
      const title = wrap.querySelector('#gTitle').value.trim();
      if (!title) { UI.toast('请先填写目标名称', { type: 'error' }); return; }
      const status = draft.status;
      const payload = {
        title: title,
        type: draft.type,
        status: status,
        start: wrap.querySelector('#gStart').value || Utils.today(),
        due: wrap.querySelector('#gDue').value || '',
        desc: wrap.querySelector('#gDesc').value.trim(),
        autoProgress: wrap.querySelector('#gAuto').checked,
        progress: status === 'done' ? 100 : Utils.clamp(Number(wrap.querySelector('#gProgress').value) || 0, 0, 100),
        milestones: collectMilestones(),
        expIds: draft.expIds.slice(),
        paperIds: draft.paperIds.slice()
      };
      if (isNew) {
        Store.addGoal(payload);
        UI.toast('目标已创建', { type: 'success' });
      } else {
        Store.updateGoal(id, payload);
        UI.toast('目标已更新', { type: 'success' });
      }
      h.close();
    }

    wrap.addEventListener('click', function (e) {
      const typeBtn = e.target.closest('[data-gtype]');
      if (typeBtn) {
        draft.type = typeBtn.dataset.gtype;
        wrap.querySelectorAll('[data-gtype]').forEach(function (b) { b.classList.toggle('active', b === typeBtn); });
        return;
      }
      const statusBtn = e.target.closest('[data-gstatus]');
      if (statusBtn) {
        draft.status = statusBtn.dataset.gstatus;
        wrap.querySelectorAll('[data-gstatus]').forEach(function (b) { b.classList.toggle('active', b === statusBtn); });
        return;
      }
      const linkBtn = e.target.closest('[data-link]');
      if (linkBtn) {
        const key = linkBtn.dataset.link === 'exp' ? 'expIds' : 'paperIds';
        const lid = linkBtn.dataset.lid;
        const idx = draft[key].indexOf(lid);
        if (idx >= 0) draft[key].splice(idx, 1); else draft[key].push(lid);
        linkBtn.classList.toggle('active', idx < 0);
        return;
      }
      const actEl = e.target.closest('[data-act]');
      if (!actEl) return;
      const act = actEl.dataset.act;
      if (act === 'ms-add') {
        const input = wrap.querySelector('#gMsInput');
        const dateInput = wrap.querySelector('#gMsDate');
        const text = input.value.trim();
        if (!text) { input.focus(); return; }
        draft.milestones.push({ id: Utils.uid(), title: text, date: dateInput.value || '', done: false });
        draft.milestones.sort(function (a, b) { return (a.date || '9999').localeCompare(b.date || '9999'); });
        input.value = '';
        dateInput.value = '';
        msRows();
        syncProgressUI();
        input.focus();
        return;
      }
      if (act === 'ms-toggle') {
        const m = draft.milestones.find(function (x) { return x.id === actEl.dataset.ms; });
        if (m) { m.done = !m.done; msRows(); syncProgressUI(); }
        return;
      }
      if (act === 'ms-del') {
        draft.milestones = draft.milestones.filter(function (x) { return x.id !== actEl.dataset.ms; });
        msRows(); syncProgressUI();
        return;
      }
      if (act === 'save') { save(); return; }
      if (act === 'cancel') { h.close(); return; }
      if (act === 'delete') {
        UI.confirm({ title: '删除该目标？', message: '「' + (draft.title || '未命名目标') + '」及其里程碑都会被删除。', confirmLabel: '删除' })
          .then(function (ok) { if (ok) { Store.deleteGoal(id); UI.toast('目标已删除', { type: 'success' }); h.close(); } });
      }
    });

    wrap.addEventListener('input', function (e) {
      const msId = e.target.dataset ? e.target.dataset.ms : null;
      if (msId && e.target.classList.contains('ms-title')) {
        const m = draft.milestones.find(function (x) { return x.id === msId; });
        if (m) { m.title = e.target.value; syncProgressUI(); }
      } else if (msId && e.target.classList.contains('ms-date')) {
        const m = draft.milestones.find(function (x) { return x.id === msId; });
        if (m) m.date = e.target.value;
      }
    });

    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.id === 'gMsInput') { e.preventDefault(); wrap.querySelector('[data-act="ms-add"]').click(); }
    });

    wrap.querySelector('#gAuto').addEventListener('change', syncProgressUI);
    msRows();
    syncProgressUI();
  }

  Views.goals = {
    title: '科研目标',
    subtitle: function () { return '中期目标 · 里程碑 · 时间轴推进'; },
    render: render
  };
})();
