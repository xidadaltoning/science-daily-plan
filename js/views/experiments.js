/* ============================================================
   科研日课 · views/experiments.js
   实验计划：看板 / 列表 / 详情（方案 · 步骤 · 记录 · 关联）
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const COLS = [
    { id: 'planned', label: '计划中', statuses: ['planned'], color: 'var(--text-3)' },
    { id: 'running', label: '进行中', statuses: ['running'], color: 'var(--c-exp)' },
    { id: 'done', label: '已完成', statuses: ['done'], color: 'var(--ok)' },
    { id: 'archived', label: '已暂停 / 终止', statuses: ['paused', 'failed'], color: 'var(--warn)' }
  ];

  function state() {
    return App.ui.exp || (App.ui.exp = { q: '', status: 'all', tag: '', view: 'board', sort: 'updated' });
  }

  function filtered() {
    const s = state();
    const q = s.q.toLowerCase();
    let list = Store.state.experiments.slice();
    if (s.status !== 'all') {
      if (s.status === 'archived') list = list.filter(function (e) { return e.status === 'paused' || e.status === 'failed'; });
      else list = list.filter(function (e) { return e.status === s.status; });
    }
    if (s.tag) list = list.filter(function (e) { return (e.tags || []).indexOf(s.tag) >= 0; });
    if (q) list = list.filter(function (e) {
      return [e.title, e.objective, e.hypothesis, e.protocol, e.results, e.conclusion, (e.tags || []).join(' ')]
        .join(' ').toLowerCase().indexOf(q) >= 0;
    });
    if (s.sort === 'title') list.sort(function (a, b) { return a.title.localeCompare(b.title, 'zh'); });
    else if (s.sort === 'created') list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    else list.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    return list;
  }

  function cardHTML(e) {
    const st = Utils.EXP_STATUS_MAP[e.status] || {};
    const prog = Store.expProgress(e);
    const steps = e.steps || [];
    const days = e.startDate ? Utils.diffDays(e.startDate, Utils.today()) : 0;
    const lastLog = (e.logs || [])[0];
    return `<div class="kanban-card" data-exp="${e.id}" draggable="true">
      <div class="row between" style="gap:8px;align-items:flex-start">
        <div class="kanban-card-title">${Utils.esc(e.title)}</div>
        <span class="pill" style="--c:${st.color};background:color-mix(in srgb,${st.color} 14%, transparent);color:${st.color};flex:none">${st.label}</span>
      </div>
      ${e.objective ? `<div class="text-xs text-3 mt-6 clamp-2">${Utils.esc(e.objective)}</div>` : ''}
      ${(e.tags || []).length ? `<div class="paper-tags mt-10">${e.tags.map(function (t) { return '<span class="pill pill-ghost">#' + Utils.esc(t) + '</span>'; }).join('')}</div>` : ''}
      <div class="progress-line mt-10">
        <span class="num" style="width:30px">${prog}%</span>
        <div class="bar-mini"><i style="width:${prog}%"></i></div>
      </div>
      <div class="kanban-card-foot">
        ${Utils.icon('clock', 12)} ${e.startDate ? Utils.fmtDate(e.startDate, 'md') : '未设时间'}${e.status === 'running' && days > 0 ? ' · 已进行 ' + days + ' 天' : ''}
        <span class="grow"></span>
        ${steps.length ? `<span title="步骤完成">${Utils.icon('check', 12)} ${steps.filter(function (x) { return x.done; }).length}/${steps.length}</span>` : ''}
        ${(e.logs || []).length ? `<span title="进展记录">${Utils.icon('edit', 12)} ${e.logs.length}</span>` : ''}
      </div>
      ${lastLog ? `<div class="text-xs text-3 mt-6 truncate">最近：${Utils.esc(Utils.truncate(lastLog.text, 30))}</div>` : ''}
    </div>`;
  }

  function boardHTML() {
    const list = filtered();
    return '<div class="kanban">' + COLS.map(function (col) {
      const items = list.filter(function (e) { return col.statuses.indexOf(e.status) >= 0; });
      return `<div class="kanban-col" data-col="${col.id}">
        <div class="kanban-col-head">
          <span class="col-dot" style="--c:${col.color}"></span>
          <h4>${col.label}</h4>
          <span class="kanban-count">${items.length}</span>
        </div>
        <div class="kanban-body" data-drop="${col.id}">
          ${items.map(cardHTML).join('')}
          <button class="kanban-add" data-action="new-exp-status" data-status="${col.statuses[0]}">${Utils.icon('plus', 13)} 新建</button>
        </div>
      </div>`;
    }).join('') + '</div>';
  }

  function tableHTML() {
    const list = filtered();
    if (!list.length) return '<div class="empty"><div class="empty-title">没有符合条件的实验</div><div class="empty-text">调整筛选条件，或新建一条实验计划。</div></div>';
    return `<div class="card" style="padding:6px 8px">
      <table class="lib-table">
        <thead><tr>
          <th data-sort="title">实验名称</th><th data-sort="status">状态</th><th>标签</th>
          <th data-sort="updated">开始日期</th><th>进度</th><th>最近更新</th>
        </tr></thead>
        <tbody>${list.map(function (e) {
          const st = Utils.EXP_STATUS_MAP[e.status] || {};
          const prog = Store.expProgress(e);
          return `<tr data-exp="${e.id}" style="cursor:pointer">
            <td><div class="bold">${Utils.esc(e.title)}</div>
              ${e.objective ? `<div class="text-xs text-3 clamp-2">${Utils.esc(e.objective)}</div>` : ''}</td>
            <td><span class="pill" style="background:color-mix(in srgb,${st.color} 14%, transparent);color:${st.color}">${st.label}</span></td>
            <td>${(e.tags || []).map(function (t) { return '<span class="pill pill-ghost">#' + Utils.esc(t) + '</span>'; }).join(' ') || '<span class="text-3">—</span>'}</td>
            <td class="num">${e.startDate || '—'}</td>
            <td><div class="progress-line" style="min-width:90px"><div class="bar-mini"><i style="width:${prog}%"></i></div><span class="num">${prog}%</span></div></td>
            <td class="text-3">${Utils.relTime(e.updatedAt)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  }

  function render(root) {
    const s = state();
    const tags = Store.allTags('exp');
    const stats = Store.expStats();
    const total = Store.state.experiments.length;
    root.innerHTML = `
      <div class="lib-toolbar">
        <div class="chips">
          <button class="chip ${s.status === 'all' ? 'active' : ''}" data-status="all">全部 <span class="chip-count">${total}</span></button>
          ${Utils.EXP_STATUS.map(function (st) {
            const c = stats[st.id] || 0;
            if (!c && st.id !== 'running') return '';
            return `<button class="chip ${s.status === st.id ? 'active' : ''}" data-status="${st.id}"><i class="dot" style="--c:${st.color}"></i>${st.label} <span class="chip-count">${c}</span></button>`;
          }).join('')}
        </div>
        <div class="grow"></div>
        <div class="select-wrap" style="width:150px">
          <select class="select" id="expTagFilter">
            <option value="">全部标签</option>
            ${tags.map(function (t) { return `<option value="${Utils.esc(t)}" ${s.tag === t ? 'selected' : ''}>#${Utils.esc(t)}</option>`; }).join('')}
          </select>
        </div>
        <div class="select-wrap" style="width:130px">
          <select class="select" id="expSort">
            <option value="updated" ${s.sort === 'updated' ? 'selected' : ''}>按更新时间</option>
            <option value="created" ${s.sort === 'created' ? 'selected' : ''}>按创建时间</option>
            <option value="title" ${s.sort === 'title' ? 'selected' : ''}>按名称</option>
          </select>
        </div>
        <div class="segmented" style="width:auto">
          <button class="segmented-item ${s.view === 'board' ? 'active' : ''}" data-view="board">${Utils.icon('grid', 14)} 看板</button>
          <button class="segmented-item ${s.view === 'list' ? 'active' : ''}" data-view="list">${Utils.icon('list', 14)} 列表</button>
        </div>
        <div class="search-box" style="width:190px">
          <input class="input" id="expSearch" placeholder="搜索实验…" value="${Utils.esc(s.q)}">
        </div>
        <button class="btn btn-primary btn-sm" data-action="new-exp">${Utils.icon('plus', 14)} 新建实验</button>
      </div>
      ${s.view === 'board' ? boardHTML() : tableHTML()}`;
    bind(root);
  }

  function bind(root) {
    const s = state();
    root.querySelectorAll('[data-status]').forEach(function (b) {
      b.addEventListener('click', function () { s.status = b.dataset.status; App.render(); });
    });
    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        s.view = b.dataset.view;
        App.persistUI();
        App.render();
      });
    });
    const tagSel = root.querySelector('#expTagFilter');
    if (tagSel) tagSel.addEventListener('change', function () { s.tag = tagSel.value; App.render(); });
    const sortSel = root.querySelector('#expSort');
    if (sortSel) sortSel.addEventListener('change', function () { s.sort = sortSel.value; App.render(); });
    const search = root.querySelector('#expSearch');
    if (search) {
      search.value = s.q;
      search.addEventListener('input', Utils.debounce(function () {
        s.q = search.value.trim();
        App.render({ keepFocus: '#expSearch' });
      }, 260));
    }
    root.querySelectorAll('[data-exp]').forEach(function (node) {
      node.addEventListener('click', function (e) {
        if (e.target.closest('.kanban-add')) return;
        openDetail(node.dataset.exp);
      });
    });
    root.querySelectorAll('[data-action]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (b.dataset.action === 'new-exp') App.openExperimentEditor({ status: b.dataset.status || 'planned' });
        else if (b.dataset.action === 'new-exp-status') App.openExperimentEditor({ status: b.dataset.status });
      });
    });
    root.querySelectorAll('[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () { s.sort = th.dataset.sort === 'title' ? 'title' : 'updated'; App.render(); });
    });
    enableBoardDnD(root);
  }

  function enableBoardDnD(root) {
    let dragId = null;
    root.querySelectorAll('[data-exp][draggable]').forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        dragId = card.dataset.exp;
        card.classList.add('dragging');
        try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (err) { }
      });
      card.addEventListener('dragend', function () { card.classList.remove('dragging'); });
    });
    root.querySelectorAll('[data-drop]').forEach(function (zone) {
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.closest('.kanban-col').classList.add('drop-target'); });
      zone.addEventListener('dragleave', function (e) {
        if (!zone.contains(e.relatedTarget)) zone.closest('.kanban-col').classList.remove('drop-target');
      });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.closest('.kanban-col').classList.remove('drop-target');
        if (!dragId) return;
        const col = zone.dataset.drop;
        const e0 = Store.expById(dragId);
        if (!e0) return;
        if (col === 'archived') { if (e0.status !== 'paused' && e0.status !== 'failed') Store.setExpStatus(dragId, 'paused'); }
        else if (e0.status !== col) Store.setExpStatus(dragId, col);
        dragId = null;
      });
    });
  }
  function statusSegmented(e, isNew) {
    return '<div class="segmented" id="expStatusSeg">' + Utils.EXP_STATUS.map(function (st) {
      return `<button class="segmented-item ${e.status === st.id ? 'active' : ''}" data-st="${st.id}" style="--c:${st.color}">
        <i class="dot"></i>${st.label}</button>`;
    }).join('') + '</div>';
  }

  function stepsHTML(e) {
    const steps = e.steps || [];
    return `<div class="steps-editor" id="stepsEditor">
      ${steps.map(function (s) {
        return `<div class="step-row ${s.done ? 'done' : ''}" data-step="${s.id}">
          <button class="step-check" data-step-toggle="${s.id}">${Utils.icon('check', 11)}</button>
          <span class="step-text">${Utils.esc(s.text)}</span>
          <button class="mini-btn" data-step-rename="${s.id}" title="修改">${Utils.icon('edit', 13)}</button>
          <button class="mini-btn danger-hover" data-step-del="${s.id}" title="删除">${Utils.icon('trash', 13)}</button>
        </div>`;
      }).join('')}
      ${steps.length ? '' : '<div class="field-hint">还没有步骤，把实验拆成可勾选的小步骤，推进更清晰。</div>'}
    </div>
    <div class="row mt-10" style="gap:8px">
      <input class="input grow" id="stepInput" placeholder="添加步骤，回车确认">
      <button class="btn btn-sm" id="stepAdd">添加</button>
    </div>`;
  }

  function logsHTML(e) {
    const logs = e.logs || [];
    return `<div class="log-list" id="logList">
      ${logs.length ? logs.map(function (l) {
        return `<div class="log-item" data-log="${l.id}">
          <div class="log-rail"><div class="log-dot"></div><div class="log-line"></div></div>
          <div class="log-body">
            <div class="log-time">${Utils.dtText(l.ts)} <span class="grow"></span>
              <button class="mini-btn danger-hover" data-log-del="${l.id}" title="删除记录">${Utils.icon('trash', 12)}</button></div>
            <div class="log-text">${Utils.esc(l.text)}</div>
          </div>
        </div>`;
      }).join('') : '<div class="field-hint">还没有记录。每次做完实验花 1 分钟记下结果与下一步，几个月后会感谢自己。</div>'}
    </div>
    <div class="field mt-10">
      <textarea class="textarea" id="logInput" style="min-height:64px" placeholder="记录今天的进展 / 现象 / 异常 / 下一步（Ctrl+Enter 添加）"></textarea>
      <div class="row"><div class="grow"></div><button class="btn btn-soft btn-sm" id="logAdd">添加记录</button></div>
    </div>`;
  }

  function paperLinksHTML(e) {
    const papers = Store.state.papers;
    if (!papers.length) return '<div class="field-hint">文献库为空，可先在「文献阅读」中添加文献。</div>';
    return '<div class="chips">' + papers.map(function (p) {
      const on = (e.paperIds || []).indexOf(p.id) >= 0;
      return `<button class="chip ${on ? 'active' : ''}" data-link-paper="${p.id}" title="${Utils.esc(p.title)}">${Utils.icon('book', 13)} ${Utils.esc(Utils.truncate(p.title, 22))}</button>`;
    }).join('') + '</div>';
  }

  function openDetail(id) {
    const e = Store.expById(id);
    if (!e) return;
    editModal(e, false);
  }

  function openNew(preset) {
    const draft = Object.assign({
      id: null, title: '', status: 'planned', tags: [],
      objective: '', hypothesis: '', materials: '', protocol: '',
      steps: [], results: '', conclusion: '',
      startDate: Utils.today(), endDate: '', paperIds: [], logs: []
    }, preset || {});
    editModal(draft, true);
  }

  function editModal(exp, isNew) {
    const draft = isNew ? exp : Object.assign({}, exp);
    if (!isNew) {
      draft.steps = (exp.steps || []).slice();
      draft.logs = (exp.logs || []).slice();
      draft.paperIds = (exp.paperIds || []).slice();
      draft.tags = (exp.tags || []).slice();
    }
    const st = Utils.EXP_STATUS_MAP[draft.status] || {};
    const prog = Store.expProgress(draft);
    const body = `
      <div class="form-grid">
        <div class="field full">
          <label>实验名称</label>
          <input class="input" id="expTitle" value="${Utils.esc(draft.title)}" placeholder="例如：LDH 纳米酶活性验证（批次 A）">
        </div>
        <div class="field full">
          <label>状态与进度 <span class="opt">（看板拖动也可修改状态）</span></label>
          <div id="expStatusHost">${statusSegmented(draft, isNew)}</div>
          <div class="progress-line mt-10">
            <span class="num" id="expProgText" style="width:36px">${prog}%</span>
            <div class="bar-mini"><i id="expProgBar" style="width:${prog}%"></i></div>
            <span class="text-xs text-3" id="expStepText">${(draft.steps || []).length ? (draft.steps.filter(function (s) { return s.done; }).length + '/' + draft.steps.length + ' 步骤') : '无步骤'}</span>
          </div>
        </div>
        <div class="field">
          <label>开始日期</label>
          <input class="input" type="date" id="expStart" value="${draft.startDate || ''}">
        </div>
        <div class="field">
          <label>结束日期 <span class="opt">选填</span></label>
          <input class="input" type="date" id="expEnd" value="${draft.endDate || ''}">
        </div>
        <div class="field full">
          <label>标签 <span class="opt">用逗号分隔</span></label>
          <input class="input" id="expTags" value="${Utils.esc((draft.tags || []).join(', '))}" placeholder="纳米酶, 催化动力学">
        </div>
      </div>

      <div class="form-section">
        <h4>研究设计</h4>
        <div class="field"><label>实验目标</label>
          <textarea class="textarea" id="expObjective" placeholder="这项工作要回答什么问题？">${Utils.esc(draft.objective)}</textarea></div>
        <div class="field mt-10"><label>研究假设</label>
          <textarea class="textarea" id="expHypothesis" style="min-height:60px" placeholder="预期结果是什么？">${Utils.esc(draft.hypothesis)}</textarea></div>
        <div class="field mt-10"><label>材料与试剂</label>
          <textarea class="textarea" id="expMaterials" style="min-height:60px" placeholder="样品、浓度、缓冲液、仪器…">${Utils.esc(draft.materials)}</textarea></div>
        <div class="field mt-10"><label>实验方案 / 流程</label>
          <textarea class="textarea" id="expProtocol" style="min-height:80px" placeholder="分步写清楚，方便复现与写方法部分">${Utils.esc(draft.protocol)}</textarea></div>
      </div>

      <div class="form-section">
        <h4>实验步骤</h4>
        <div id="stepsHost">${stepsHTML(draft)}</div>
      </div>

      <div class="form-section">
        <h4>结果与结论</h4>
        <div class="field"><label>结果记录</label>
          <textarea class="textarea" id="expResults" placeholder="原始观察、数据、图表说明…">${Utils.esc(draft.results)}</textarea></div>
        <div class="field mt-10"><label>结论与反思</label>
          <textarea class="textarea" id="expConclusion" style="min-height:60px" placeholder="支持 / 否定假设？下一步怎么走？">${Utils.esc(draft.conclusion)}</textarea></div>
      </div>

      <div class="form-section">
        <h4>进展记录</h4>
        <div id="logsHost">${logsHTML(draft)}</div>
      </div>

      <div class="form-section">
        <h4>关联文献</h4>
        <div id="linksHost">${paperLinksHTML(draft)}</div>
      </div>`;

    const h = UI.openModal({
      size: 'xwide',
      icon: 'flask',
      title: isNew ? '新建实验计划' : Utils.esc(draft.title || '实验详情'),
      sub: isNew ? '先写下目标与假设，之后随时补充结果与记录' : '更新于 ' + Utils.relTime(draft.updatedAt || Date.now()),
      body: body,
      footer: `${isNew ? '' : '<button class="btn btn-danger" data-act="del">' + Utils.icon('trash', 15) + ' 删除实验</button>'}
        <div class="spacer"></div>
        <button class="btn" data-act="cancel">取消</button>
        <button class="btn btn-primary" data-act="save">${isNew ? '创建实验' : '保存修改'}</button>`,
      onMount: function (h) { bindEditor(h, draft, isNew); }
    });
    return h;
  }

  function refreshProgress(h, draft) {
    const steps = draft.steps || [];
    const prog = Store.expProgress(draft);
    const bar = h.wrap.querySelector('#expProgBar');
    const txt = h.wrap.querySelector('#expProgText');
    const stx = h.wrap.querySelector('#expStepText');
    if (bar) bar.style.width = prog + '%';
    if (txt) txt.textContent = prog + '%';
    if (stx) stx.textContent = steps.length ? (steps.filter(function (s) { return s.done; }).length + '/' + steps.length + ' 步骤') : '无步骤';
  }

  function bindEditor(h, draft, isNew) {
    const q = function (sel) { return h.wrap.querySelector(sel); };
    const statusHost = q('#expStatusHost');
    if (statusHost) {
      statusHost.addEventListener('click', function (ev) {
        const b = ev.target.closest('[data-st]');
        if (!b) return;
        draft.status = b.dataset.st;
        statusHost.querySelectorAll('.segmented-item').forEach(function (x) { x.classList.toggle('active', x === b); });
        if (!isNew) Store.updateExperiment(draft.id, { status: draft.status });
      });
    }
    const stepsHost = q('#stepsHost');
    function bindSteps() {
      stepsHost.querySelectorAll('[data-step-toggle]').forEach(function (b) {
        b.addEventListener('click', function () {
          const s = draft.steps.find(function (x) { return x.id === b.dataset.stepToggle; });
          if (!s) return;
          s.done = !s.done;
          b.closest('.step-row').classList.toggle('done', s.done);
          if (!isNew) Store.updateStep(draft.id, s.id, { done: s.done });
          refreshProgress(h, draft);
        });
      });
      stepsHost.querySelectorAll('[data-step-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          const sid = b.dataset.stepDel;
          draft.steps = draft.steps.filter(function (x) { return x.id !== sid; });
          if (!isNew) Store.deleteStep(draft.id, sid);
          b.closest('.step-row').remove();
          refreshProgress(h, draft);
        });
      });
      stepsHost.querySelectorAll('[data-step-rename]').forEach(function (b) {
        b.addEventListener('click', function () {
          const s = draft.steps.find(function (x) { return x.id === b.dataset.stepRename; });
          if (!s) return;
          UI.prompt({ title: '修改步骤', value: s.text, okLabel: '保存' }).then(function (v) {
            if (!v) return;
            s.text = v;
            if (!isNew) Store.updateStep(draft.id, s.id, { text: v });
            const row = b.closest('.step-row');
            row.querySelector('.step-text').textContent = v;
          });
        });
      });
      const addBtn = stepsHost.querySelector('#stepAdd');
      const addInput = stepsHost.querySelector('#stepInput');
      function addStep() {
        const v = addInput.value.trim();
        if (!v) return;
        const s = { id: Utils.uid(), text: v, done: false };
        draft.steps.push(s);
        if (!isNew) Store.addStep(draft.id, v);
        addInput.value = '';
        const list = stepsHost.querySelector('#stepsEditor');
        const hint = list.querySelector('.field-hint');
        if (hint) hint.remove();
        const row = UI.el(`<div class="step-row" data-step="${s.id}">
          <button class="step-check" data-step-toggle="${s.id}">${Utils.icon('check', 11)}</button>
          <span class="step-text">${Utils.esc(s.text)}</span>
          <button class="mini-btn" data-step-rename="${s.id}" title="修改">${Utils.icon('edit', 13)}</button>
          <button class="mini-btn danger-hover" data-step-del="${s.id}" title="删除">${Utils.icon('trash', 13)}</button>
        </div>`);
        list.appendChild(row);
        bindSteps();
        refreshProgress(h, draft);
        addInput.focus();
      }
      if (addBtn) addBtn.addEventListener('click', addStep);
      if (addInput) addInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addStep(); } });
    }
    bindSteps();

    const logsHost = q('#logsHost');
    function bindLogs() {
      logsHost.querySelectorAll('[data-log-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          const lid = b.dataset.logDel;
          draft.logs = draft.logs.filter(function (x) { return x.id !== lid; });
          if (!isNew) Store.deleteExpLog(draft.id, lid);
          b.closest('.log-item').remove();
        });
      });
      const addBtn = logsHost.querySelector('#logAdd');
      const input = logsHost.querySelector('#logInput');
      function addLog() {
        const v = input.value.trim();
        if (!v) return;
        const log = { id: Utils.uid(), ts: Date.now(), text: v };
        draft.logs.unshift(log);
        if (!isNew) Store.addExpLog(draft.id, v);
        input.value = '';
        const list = logsHost.querySelector('#logList');
        const hint = list.querySelector('.field-hint');
        if (hint) hint.remove();
        const node = UI.el(`<div class="log-item" data-log="${log.id}">
          <div class="log-rail"><div class="log-dot"></div><div class="log-line"></div></div>
          <div class="log-body"><div class="log-time">${Utils.dtText(log.ts)} <span class="grow"></span></div>
          <div class="log-text">${Utils.esc(log.text)}</div></div></div>`);
        list.insertBefore(node, list.firstChild);
        bindLogs();
        UI.toast('已添加进展记录', { type: 'success' });
      }
      if (addBtn) addBtn.addEventListener('click', addLog);
      if (input) input.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); addLog(); }
      });
    }
    bindLogs();

    const linksHost = q('#linksHost');
    if (linksHost) {
      linksHost.addEventListener('click', function (ev) {
        const b = ev.target.closest('[data-link-paper]');
        if (!b) return;
        const pid = b.dataset.linkPaper;
        const i = draft.paperIds.indexOf(pid);
        if (i >= 0) draft.paperIds.splice(i, 1); else draft.paperIds.push(pid);
        b.classList.toggle('active', i < 0);
        if (!isNew) Store.updateExperiment(draft.id, { paperIds: draft.paperIds.slice() });
      });
    }

    const collect = function () {
      return {
        title: q('#expTitle').value.trim() || '未命名实验',
        status: draft.status,
        startDate: q('#expStart').value,
        endDate: q('#expEnd').value,
        tags: Utils.parseTags(q('#expTags').value),
        objective: q('#expObjective').value.trim(),
        hypothesis: q('#expHypothesis').value.trim(),
        materials: q('#expMaterials').value.trim(),
        protocol: q('#expProtocol').value.trim(),
        results: q('#expResults').value.trim(),
        conclusion: q('#expConclusion').value.trim(),
        steps: draft.steps,
        paperIds: draft.paperIds
      };
    };
    q('[data-act=cancel]').addEventListener('click', function () { h.close(); });
    q('[data-act=save]').addEventListener('click', function () {
      const data = collect();
      if (isNew) {
        const created = Store.addExperiment(data);
        UI.toast('实验已创建', { type: 'success' });
        h.close();
        setTimeout(function () { openDetail(created.id); }, 120);
      } else {
        Store.updateExperiment(draft.id, data);
        UI.toast('已保存实验详情', { type: 'success' });
        h.close();
      }
    });
    const delBtn = q('[data-act=del]');
    if (delBtn) {
      delBtn.addEventListener('click', function () {
        UI.confirm({
          title: '删除实验？', message: '「' + Utils.esc(draft.title) + '」及其步骤、进展记录都将被删除。', confirmLabel: '删除'
        }).then(function (ok) {
          if (!ok) return;
          Store.deleteExperiment(draft.id);
          h.close();
          UI.toast('已删除实验', { action: { label: '撤销', onClick: function () { Store.undo(); } } });
        });
      });
    }
  }

  Views.experiments = {
    title: '实验计划',
    subtitle: function () { return '从假设到结论，把每个实验的前因后果留住'; },
    render: function (root) { render(root); },
    openDetail: openDetail,
    openNew: openNew
  };
})();
