/* ============================================================
   科研日课 · views/library.js
   文献阅读：文献库 / 阅读记录 / 笔记 / BibTeX 导入
   ============================================================ */
window.Views = window.Views || {};

(function () {
  function state() {
    return App.ui.lib || (App.ui.lib = { q: '', status: 'all', tag: '', sort: 'added', view: 'grid' });
  }

  function filtered() {
    const s = state();
    const q = s.q.toLowerCase();
    let list = Store.state.papers.slice();
    if (s.status !== 'all') list = list.filter(function (p) { return p.status === s.status; });
    if (s.tag) list = list.filter(function (p) { return (p.tags || []).indexOf(s.tag) >= 0; });
    if (q) list = list.filter(function (p) {
      return [p.title, p.authors, p.journal, p.year, p.doi, p.summary, p.keyPoints, p.questions, p.quotes, (p.tags || []).join(' ')]
        .join(' ').toLowerCase().indexOf(q) >= 0;
    });
    if (s.sort === 'year') list.sort(function (a, b) { return (Number(b.year) || 0) - (Number(a.year) || 0); });
    else if (s.sort === 'rating') list.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    else if (s.sort === 'title') list.sort(function (a, b) { return a.title.localeCompare(b.title, 'zh'); });
    else list.sort(function (a, b) { return b.addedAt - a.addedAt; });
    return list;
  }

  function starsHTML(p, interactive) {
    let out = '<span class="stars">';
    for (let i = 1; i <= 5; i++) {
      out += `<button class="star ${p.rating >= i ? 'on' : ''}" ${interactive ? 'data-star="' + p.id + '" data-i="' + i + '"' : 'disabled'} title="${i} 星">${Utils.icon('star', 13)}</button>`;
    }
    return out + '</span>';
  }

  function cardHTML(p) {
    const st = Utils.PAPER_STATUS_MAP[p.status] || {};
    const mins = Store.paperMinutes(p.id);
    return `<div class="paper-card" data-paper="${p.id}" style="--st:${st.color}">
      <div class="row between" style="gap:8px;align-items:flex-start">
        <span class="pill" style="background:color-mix(in srgb,${st.color} 14%, transparent);color:${st.color}">${st.label}</span>
        ${starsHTML(p, true)}
      </div>
      <div class="paper-title clamp-3">${Utils.esc(p.title)}</div>
      <div class="paper-authors truncate">${Utils.esc(p.authors || '作者未记录')}</div>
      <div class="paper-journal">${p.journal ? Utils.icon('book', 12) + ' ' + Utils.esc(Utils.truncate(p.journal, 26)) : ''}${p.year ? '<span class="yr">· ' + p.year + '</span>' : ''}</div>
      ${(p.tags || []).length ? `<div class="paper-tags">${p.tags.slice(0, 4).map(function (t) { return '<span class="pill pill-ghost">#' + Utils.esc(t) + '</span>'; }).join('')}</div>` : ''}
      ${p.summary ? `<div class="text-xs text-3 clamp-2">${Utils.esc(p.summary)}</div>` : ''}
      ${p.status === 'reading' ? `<div class="progress-line"><span class="num">${p.progress || 0}%</span><div class="bar-mini"><i style="width:${p.progress || 0}%"></i></div></div>` : ''}
      <div class="paper-foot">
        ${p.status === 'todo' ? `<button class="btn btn-sm btn-soft" data-action="paper-start" data-id="${p.id}">开始阅读</button>` : ''}
        ${p.status !== 'read' ? `<button class="btn btn-sm" data-action="paper-log" data-id="${p.id}" data-min="15" title="记录 15 分钟阅读">+15m</button>` : ''}
        ${p.status !== 'read' ? `<button class="btn btn-sm" data-action="paper-read" data-id="${p.id}">标记读完</button>` : ''}
        ${p.status === 'read' ? `<span class="text-xs text-3">${Utils.icon('check', 12)} 已读完 ${p.readAt ? Utils.relTime(p.readAt) : ''}</span>` : ''}
        <span class="grow"></span>
        ${mins ? `<span class="text-xs text-3" title="累计阅读时长">${Utils.icon('clock', 12)} ${Utils.durShort(mins)}</span>` : ''}
        ${p.doi ? `<button class="mini-btn" data-action="paper-link" data-id="${p.id}" title="打开 DOI">${Utils.icon('external', 14)}</button>` : ''}
        <button class="mini-btn danger-hover" data-action="paper-del" data-id="${p.id}" title="删除">${Utils.icon('trash', 14)}</button>
      </div>
    </div>`;
  }

  function tableHTML(list) {
    if (!list.length) return emptyHTML();
    return `<div class="card" style="padding:6px 8px"><table class="lib-table">
      <thead><tr><th>标题</th><th>作者</th><th>期刊 / 年份</th><th>状态</th><th>评分</th><th>阅读</th><th></th></tr></thead>
      <tbody>${list.map(function (p) {
        const st = Utils.PAPER_STATUS_MAP[p.status] || {};
        return `<tr data-paper="${p.id}" style="cursor:pointer">
          <td><div class="bold">${Utils.esc(Utils.truncate(p.title, 60))}</div>
            ${(p.tags || []).length ? '<div class="text-xs text-3">' + p.tags.map(function (t) { return '#' + Utils.esc(t); }).join(' ') + '</div>' : ''}</td>
          <td class="text-3">${Utils.esc(Utils.truncate(p.authors || '—', 30))}</td>
          <td class="text-3">${Utils.esc(p.journal || '—')}${p.year ? ' · ' + p.year : ''}</td>
          <td><span class="pill" style="background:color-mix(in srgb,${st.color} 14%, transparent);color:${st.color}">${st.label}</span></td>
          <td>${p.rating ? '★'.repeat(p.rating) : '<span class="text-3">—</span>'}</td>
          <td class="num text-3">${Utils.durShort(Store.paperMinutes(p.id))}</td>
          <td><button class="mini-btn" data-action="paper-del" data-id="${p.id}" title="删除">${Utils.icon('trash', 14)}</button></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function emptyHTML() {
    return `<div class="card"><div class="empty">
      <div class="empty-title">文献库还是空的</div>
      <div class="empty-text">可以手动添加文献，也可以直接把 BibTeX 粘贴进来批量导入。</div>
      <div class="empty-actions">
        <button class="btn btn-primary btn-sm" data-action="new-paper">${Utils.icon('plus', 14)} 添加文献</button>
        <button class="btn btn-sm" data-action="import-bibtex">${Utils.icon('upload', 14)} 导入 BibTeX</button>
        <button class="btn btn-sm" data-action="seed-demo">载入示例数据</button>
      </div></div></div>`;
  }

  function render(root) {
    const s = state();
    const list = filtered();
    const stats = Store.paperStats();
    const total = Store.state.papers.length;
    const tags = Store.allTags('paper');
    const monthStart = Utils.today().slice(0, 8) + '01';
    const monthStats = Store.rangeStats(monthStart, Utils.today());
    const allMinutes = Store.state.papers.reduce(function (a, p) { return a + Store.paperMinutes(p.id); }, 0);
    root.innerHTML = `
      <div class="grid-4 mb-10" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px">
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('book', 15)}</span>文献总数</div>
          <div class="kpi-value">${total}<small>篇</small></div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('clock', 15)}</span>待读</div>
          <div class="kpi-value">${stats.todo || 0}<small>篇</small></div>
          <div class="kpi-label">在读 ${stats.reading || 0} · 已读 ${stats.read || 0}</div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('checkCircle', 15)}</span>本月读完</div>
          <div class="kpi-value">${monthStats.papersRead}<small>篇</small></div>
          <div class="kpi-label">阅读 ${Utils.durShort(monthStats.readingMin)}</div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('zap', 15)}</span>累计阅读</div>
          <div class="kpi-value">${Math.round(allMinutes / 60 * 10) / 10}<small>小时</small></div>
          <div class="kpi-label">来自阅读记录与番茄钟</div></div>
      </div>
      <div class="lib-toolbar">
        <div class="chips">
          <button class="chip ${s.status === 'all' ? 'active' : ''}" data-status="all">全部 <span class="chip-count">${total}</span></button>
          ${Utils.PAPER_STATUS.map(function (st) {
            return `<button class="chip ${s.status === st.id ? 'active' : ''}" data-status="${st.id}"><i class="dot" style="--c:${st.color}"></i>${st.label} <span class="chip-count">${stats[st.id] || 0}</span></button>`;
          }).join('')}
        </div>
        <div class="grow"></div>
        <div class="select-wrap" style="width:150px">
          <select class="select" id="libTagFilter"><option value="">全部标签</option>
            ${tags.map(function (t) { return `<option value="${Utils.esc(t)}" ${s.tag === t ? 'selected' : ''}>#${Utils.esc(t)}</option>`; }).join('')}</select>
        </div>
        <div class="select-wrap" style="width:126px">
          <select class="select" id="libSort">
            <option value="added" ${s.sort === 'added' ? 'selected' : ''}>按添加时间</option>
            <option value="year" ${s.sort === 'year' ? 'selected' : ''}>按年份</option>
            <option value="rating" ${s.sort === 'rating' ? 'selected' : ''}>按评分</option>
            <option value="title" ${s.sort === 'title' ? 'selected' : ''}>按标题</option>
          </select>
        </div>
        <div class="segmented" style="width:auto">
          <button class="segmented-item ${s.view === 'grid' ? 'active' : ''}" data-view="grid">${Utils.icon('grid', 14)} 卡片</button>
          <button class="segmented-item ${s.view === 'list' ? 'active' : ''}" data-view="list">${Utils.icon('list', 14)} 列表</button>
        </div>
        <div style="width:180px"><input class="input" id="libSearch" placeholder="搜索标题 / 作者 / 笔记…" value="${Utils.esc(s.q)}"></div>
        <button class="btn btn-sm" data-action="import-bibtex">${Utils.icon('upload', 14)} BibTeX</button>
        <button class="btn btn-primary btn-sm" data-action="new-paper">${Utils.icon('plus', 14)} 添加文献</button>
      </div>
      ${list.length ? (s.view === 'grid' ? '<div class="paper-grid">' + list.map(cardHTML).join('') + '</div>' : tableHTML(list)) : emptyHTML()}`;
    bind(root);
  }

  function bind(root) {
    const s = state();
    root.querySelectorAll('[data-status]').forEach(function (b) {
      b.addEventListener('click', function () { s.status = b.dataset.status; App.persistUI(); App.render(); });
    });
    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { s.view = b.dataset.view; App.persistUI(); App.render(); });
    });
    const tagSel = root.querySelector('#libTagFilter');
    if (tagSel) tagSel.addEventListener('change', function () { s.tag = tagSel.value; App.render(); });
    const sortSel = root.querySelector('#libSort');
    if (sortSel) sortSel.addEventListener('change', function () { s.sort = sortSel.value; App.render(); });
    const search = root.querySelector('#libSearch');
    if (search) {
      search.value = s.q;
      search.addEventListener('input', Utils.debounce(function () {
        s.q = search.value.trim();
        App.render({ keepFocus: '#libSearch' });
      }, 260));
    }
    root.querySelectorAll('.star[data-star]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        Store.setRating(b.dataset.star, Number(b.dataset.i));
      });
    });
    root.querySelectorAll('[data-paper]').forEach(function (node) {
      node.addEventListener('click', function (e) {
        if (e.target.closest('[data-action]') || e.target.closest('.star')) return;
        openDetail(node.dataset.paper);
      });
    });
    root.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'paper-start') { Store.setPaperStatus(id, 'reading'); UI.toast('已加入在读', { type: 'success' }); }
      else if (action === 'paper-log') { Store.logReading(id, Number(btn.dataset.min) || 15, ''); UI.toast('已记录阅读 ' + (btn.dataset.min || 15) + ' 分钟', { type: 'success' }); }
      else if (action === 'paper-read') { Store.setPaperStatus(id, 'read'); UI.toast('已标记读完 🎉', { type: 'success' }); }
      else if (action === 'paper-del') {
        const p = Store.paperById(id);
        if (!p) return;
        Store.deletePaper(id);
        UI.toast('已删除文献', { action: { label: '撤销', onClick: function () { Store.undo(); } } });
      } else if (action === 'paper-link') {
        const p = Store.paperById(id);
        if (p && p.doi) window.open('https://doi.org/' + p.doi, '_blank');
      } else if (action === 'new-paper') App.openPaperEditor();
      else if (action === 'seed-demo') Store.seedDemo();
      else if (action === 'import-bibtex') openBibtex();
    });
  }
  function logListHTML(p) {
    const logs = p.logs || [];
    return `<div class="log-list" id="readLogList">
      ${logs.length ? logs.map(function (l) {
        return `<div class="log-item"><div class="log-rail"><div class="log-dot"></div><div class="log-line"></div></div>
          <div class="log-body"><div class="log-time">${Utils.dtText(l.ts)} · 阅读 ${Utils.durText(l.minutes || 0)}</div>
          ${l.note ? '<div class="log-text">' + Utils.esc(l.note) + '</div>' : ''}</div></div>`;
      }).join('') : '<div class="field-hint">还没有阅读记录。点下面的「+15 分钟」即可积累阅读时长，也会计入今日专注统计。</div>'}
    </div>`;
  }

  function expLinksHTML(p) {
    const exps = Store.state.experiments;
    if (!exps.length) return '<div class="field-hint">暂无实验，可在「实验计划」中创建。</div>';
    return '<div class="chips">' + exps.map(function (e) {
      const on = (p.expIds || []).indexOf(e.id) >= 0;
      return `<button class="chip ${on ? 'active' : ''}" data-link-exp="${e.id}" title="${Utils.esc(e.title)}">${Utils.icon('flask', 13)} ${Utils.esc(Utils.truncate(e.title, 22))}</button>`;
    }).join('') + '</div>';
  }

  function openDetail(id) {
    const p = Store.paperById(id);
    if (!p) return;
    paperModal(p, false);
  }
  function openNew(preset) {
    const draft = Object.assign({
      id: null, title: '', authors: '', journal: '', year: '', volume: '', pages: '',
      doi: '', url: '', tags: [], status: 'todo', rating: 0, progress: 0,
      summary: '', keyPoints: '', questions: '', quotes: '', logs: [], expIds: []
    }, preset || {});
    paperModal(draft, true);
  }

  function paperModal(p, isNew) {
    const draft = isNew ? p : Object.assign({}, p);
    if (!isNew) {
      draft.tags = (p.tags || []).slice();
      draft.logs = (p.logs || []).slice();
      draft.expIds = (p.expIds || []).slice();
    }
    const st = Utils.PAPER_STATUS_MAP[draft.status] || {};
    const body = `
      <div class="form-grid">
        <div class="field full"><label>标题</label>
          <textarea class="textarea" id="ppTitle" style="min-height:52px" placeholder="论文标题">${Utils.esc(draft.title)}</textarea></div>
        <div class="field full"><label>作者 <span class="opt">用逗号分隔</span></label>
          <input class="input" id="ppAuthors" value="${Utils.esc(draft.authors)}" placeholder="Zhang Y., Liu H., Chen W."></div>
        <div class="field"><label>期刊 / 会议</label>
          <input class="input" id="ppJournal" value="${Utils.esc(draft.journal)}" placeholder="Nature Communications"></div>
        <div class="field"><label>年份</label>
          <input class="input" id="ppYear" value="${Utils.esc(draft.year)}" placeholder="2025"></div>
        <div class="field"><label>卷 / 页码 <span class="opt">选填</span></label>
          <input class="input" id="ppVolume" value="${Utils.esc(draft.volume)}${draft.pages ? ' · ' + Utils.esc(draft.pages) : ''}" placeholder="12(3), 456-470"></div>
        <div class="field"><label>DOI <span class="opt">用于一键跳转原文</span></label>
          <input class="input" id="ppDoi" value="${Utils.esc(draft.doi)}" placeholder="10.1039/D3CS00000X"></div>
        <div class="field full"><label>链接 <span class="opt">选填</span></label>
          <input class="input" id="ppUrl" value="${Utils.esc(draft.url)}" placeholder="https://…"></div>
        <div class="field full"><label>标签</label>
          <input class="input" id="ppTags" value="${Utils.esc((draft.tags || []).join(', '))}" placeholder="综述, 纳米酶, 单细胞"></div>
        <div class="field full"><label>阅读状态</label>
          <div class="segmented" id="ppStatusSeg">${Utils.PAPER_STATUS.map(function (s) {
            return `<button class="segmented-item ${draft.status === s.id ? 'active' : ''}" data-st="${s.id}" style="--c:${s.color}"><i class="dot"></i>${s.label}</button>`;
          }).join('')}</div></div>
        <div class="field"><label>我的评分</label><div id="ppStars" style="padding-top:4px">${starsHTML(draft, true)}</div></div>
        <div class="field"><label>阅读进度 <span class="opt" id="ppProgLabel">${draft.progress || 0}%</span></label>
          <input type="range" min="0" max="100" step="5" value="${draft.progress || 0}" id="ppProgress" style="accent-color:var(--accent)"></div>
      </div>

      <div class="form-section"><h4>阅读笔记</h4>
        <div class="field"><label>摘要 / 我的总结</label>
          <textarea class="textarea" id="ppSummary" placeholder="这篇文章讲了什么？核心方法？">${Utils.esc(draft.summary)}</textarea></div>
        <div class="field mt-10"><label>关键发现 / 可借鉴点</label>
          <textarea class="textarea" id="ppKey" placeholder="1. …&#10;2. …">${Utils.esc(draft.keyPoints)}</textarea></div>
        <div class="field mt-10"><label>疑问与批判</label>
          <textarea class="textarea" id="ppQ" style="min-height:60px" placeholder="哪些地方证据不足？与我课题的关系？">${Utils.esc(draft.questions)}</textarea></div>
        <div class="field mt-10"><label>好句摘录</label>
          <textarea class="textarea" id="ppQuotes" style="min-height:60px" placeholder="可以直接用于论文引言 / 讨论的句子">${Utils.esc(draft.quotes)}</textarea></div>
      </div>

      <div class="form-section"><h4>阅读记录 <span class="text-xs text-3" id="ppTotalMin" style="font-weight:500">累计 ${Utils.durText(Store.paperMinutes(draft.id))}</span></h4>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" data-act="log15">${Utils.icon('clock', 14)} +15 分钟</button>
          <button class="btn btn-sm" data-act="log30">${Utils.icon('clock', 14)} +30 分钟</button>
          <input class="input" id="ppLogMin" type="number" min="1" max="600" value="45" style="width:80px" title="自定义分钟数">
          <input class="input grow" id="ppLogNote" placeholder="这次读了哪部分？有什么收获？" style="min-width:160px">
          <button class="btn btn-sm btn-soft" data-act="logAdd">添加记录</button>
        </div>
        <div class="mt-10" id="readLogHost">${logListHTML(draft)}</div>
      </div>

      <div class="form-section"><h4>关联实验</h4>
        <div id="ppLinkHost">${expLinksHTML(draft)}</div>
      </div>`;

    const h = UI.openModal({
      size: 'wide',
      icon: 'book',
      title: isNew ? '添加文献' : Utils.esc(Utils.truncate(draft.title || '文献详情', 40)),
      sub: isNew ? '科研从积累开始，先把它记下来吧' : (st.label + ' · 添加于 ' + Utils.relTime(draft.addedAt)),
      body: body,
      footer: `${isNew ? '' : '<button class="btn" data-act="openDoi">' + Utils.icon('external', 15) + ' 打开原文</button>'}
        <div class="spacer"></div>
        <button class="btn" data-act="cancel">取消</button>
        <button class="btn btn-primary" data-act="save">${isNew ? '添加文献' : '保存'}</button>`,
      onMount: function (h) { bindPaper(h, draft, isNew); }
    });
    return h;
  }

  function bindPaper(h, draft, isNew) {
    const q = function (sel) { return h.wrap.querySelector(sel); };
    const statusSeg = q('#ppStatusSeg');
    statusSeg.addEventListener('click', function (e) {
      const b = e.target.closest('[data-st]');
      if (!b) return;
      draft.status = b.dataset.st;
      statusSeg.querySelectorAll('.segmented-item').forEach(function (x) { x.classList.toggle('active', x === b); });
      if (!isNew) Store.setPaperStatus(draft.id, draft.status);
      const prog = q('#ppProgress');
      if (draft.status === 'read' && prog) { prog.value = 100; q('#ppProgLabel').textContent = '100%'; draft.progress = 100; }
    });
    const stars = q('#ppStars');
    stars.addEventListener('click', function (e) {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const n = Number(b.dataset.i);
      draft.rating = draft.rating === n ? 0 : n;
      stars.querySelectorAll('.star').forEach(function (s, i) { s.classList.toggle('on', (i + 1) <= draft.rating); });
      if (!isNew) Store.setRating(draft.id, n);
    });
    const prog = q('#ppProgress');
    prog.addEventListener('input', function () {
      draft.progress = Number(prog.value);
      q('#ppProgLabel').textContent = prog.value + '%';
    });
    const linkHost = q('#ppLinkHost');
    linkHost.addEventListener('click', function (e) {
      const b = e.target.closest('[data-link-exp]');
      if (!b) return;
      const eid = b.dataset.linkExp;
      const i = draft.expIds.indexOf(eid);
      if (i >= 0) draft.expIds.splice(i, 1); else draft.expIds.push(eid);
      b.classList.toggle('active', i < 0);
      if (!isNew) Store.updatePaper(draft.id, { expIds: draft.expIds.slice() });
    });
    function addLog(minutes, note) {
      if (isNew) {
        draft.logs.unshift({ id: Utils.uid(), ts: Date.now(), minutes: minutes, note: note || '' });
        q('#readLogHost').innerHTML = logListHTML(draft);
        q('#ppTotalMin').textContent = '累计 ' + Utils.durText(draft.logs.reduce(function (a, l) { return a + l.minutes; }, 0));
      } else {
        Store.logReading(draft.id, minutes, note || '');
        const p = Store.paperById(draft.id);
        draft.logs = (p.logs || []).slice();
        q('#readLogHost').innerHTML = logListHTML(draft);
        q('#ppTotalMin').textContent = '累计 ' + Utils.durText(Store.paperMinutes(draft.id));
      }
      UI.toast('已记录阅读 ' + Utils.durText(minutes), { type: 'success' });
    }
    q('[data-act=log15]').addEventListener('click', function () { addLog(15, q('#ppLogNote').value.trim()); q('#ppLogNote').value = ''; });
    q('[data-act=log30]').addEventListener('click', function () { addLog(30, q('#ppLogNote').value.trim()); q('#ppLogNote').value = ''; });
    q('[data-act=logAdd]').addEventListener('click', function () {
      const m = Math.max(1, Number(q('#ppLogMin').value) || 45);
      addLog(m, q('#ppLogNote').value.trim());
      q('#ppLogNote').value = '';
    });
    const doiBtn = q('[data-act=openDoi]');
    if (doiBtn) doiBtn.addEventListener('click', function () {
      const d = q('#ppDoi').value.trim();
      const u = q('#ppUrl').value.trim();
      if (d) window.open('https://doi.org/' + d.replace(/^https?:\/\/(dx\.)?doi\.org\//, ''), '_blank');
      else if (u) window.open(u, '_blank');
      else UI.toast('还没有填写 DOI 或链接', { type: 'info' });
    });
    q('[data-act=cancel]').addEventListener('click', function () { h.close(); });
    q('[data-act=save]').addEventListener('click', function () {
      const volRaw = q('#ppVolume').value.trim();
      const parts = volRaw.split('·').map(function (x) { return x.trim(); });
      const data = {
        title: q('#ppTitle').value.trim() || '未命名文献',
        authors: q('#ppAuthors').value.trim(),
        journal: q('#ppJournal').value.trim(),
        year: q('#ppYear').value.trim(),
        volume: parts[0] || '',
        pages: parts[1] || '',
        doi: q('#ppDoi').value.trim(),
        url: q('#ppUrl').value.trim(),
        tags: Utils.parseTags(q('#ppTags').value),
        status: draft.status,
        rating: draft.rating,
        progress: draft.progress,
        summary: q('#ppSummary').value.trim(),
        keyPoints: q('#ppKey').value.trim(),
        questions: q('#ppQ').value.trim(),
        quotes: q('#ppQuotes').value.trim(),
        expIds: draft.expIds
      };
      if (isNew) {
        const created = Store.addPaper(data);
        if (draft.logs.length) {
          created.logs = draft.logs;
          Store.saveNow();
        }
        if (data.status !== 'todo') Store.setPaperStatus(created.id, data.status);
        UI.toast('文献已添加', { type: 'success' });
        h.close();
      } else {
        Store.updatePaper(draft.id, data);
        UI.toast('已保存文献', { type: 'success' });
        h.close();
      }
    });
  }

  function openBibtex() {
    const body = `<div class="field">
      <label>粘贴 BibTeX 内容</label>
      <textarea class="textarea" id="bibInput" style="min-height:220px;font-family:var(--font-mono);font-size:12px"
        placeholder="@article{zhang2024nanozyme,&#10;  title = {Nanozyme-based colorimetric biosensors},&#10;  author = {Zhang, Yi and Liu, Hui},&#10;  journal = {Chemical Society Reviews},&#10;  year = {2024},&#10;  doi = {10.1039/D3CS00000X}&#10;}"></textarea>
      <div class="field-hint">支持从 Zotero / EndNote / Google Scholar 直接复制多条 @article、@inproceedings 记录。会按 DOI 去重。</div>
    </div>
    <div id="bibPreview" class="mt-14"></div>`;
    const h = UI.openModal({
      size: 'wide', icon: 'upload', title: '导入 BibTeX 文献',
      sub: '批量解析标题、作者、期刊、年份、DOI、摘要与关键词',
      body: body,
      footer: '<button class="btn" data-act="cancel">取消</button><div class="spacer"></div>' +
        '<button class="btn" data-act="parse">解析预览</button>' +
        '<button class="btn btn-primary" data-act="import" disabled>导入全部</button>',
      onMount: function (h) {
        const ta = h.wrap.querySelector('#bibInput');
        const preview = h.wrap.querySelector('#bibPreview');
        const importBtn = h.wrap.querySelector('[data-act=import]');
        let parsed = [];
        function doParse() {
          parsed = Utils.parseBibtex(ta.value);
          if (!parsed.length) { preview.innerHTML = '<div class="field-hint">没有解析到条目，请检查格式（应以 @article{ 开头）。</div>'; importBtn.disabled = true; return; }
          const dups = parsed.filter(function (x) {
            return x.doi && Store.state.papers.some(function (p) { return p.doi && p.doi.toLowerCase() === x.doi.toLowerCase(); });
          });
          preview.innerHTML = `<div class="section-title">解析到 ${parsed.length} 条${dups.length ? '（其中 ' + dups.length + ' 条 DOI 已存在，将跳过）' : ''}</div>
            <div class="stack-sm" style="max-height:220px;overflow:auto">${parsed.map(function (x, i) {
              const dup = dups.indexOf(x) >= 0;
              return `<div class="review-item"><span class="icon-inline" style="color:var(--c-lit)">${Utils.icon('book', 14)}</span>
                <div class="grow"><div class="text-sm ${dup ? 'muted' : ''}">${Utils.esc(Utils.truncate(x.title, 70))}${dup ? ' <span class="pill">已存在</span>' : ''}</div>
                <div class="text-xs text-3">${Utils.esc(Utils.truncate(x.authors || '未记录作者', 46))} · ${Utils.esc(x.journal || '')} ${Utils.esc(x.year || '')}</div></div></div>`;
            }).join('')}</div>`;
          importBtn.disabled = false;
        }
        h.wrap.querySelector('[data-act=parse]').addEventListener('click', doParse);
        ta.addEventListener('input', Utils.debounce(function () { if (ta.value.trim()) doParse(); }, 500));
        h.wrap.querySelector('[data-act=cancel]').addEventListener('click', function () { h.close(); });
        importBtn.addEventListener('click', function () {
          let added = 0;
          parsed.forEach(function (x) {
            if (x.doi && Store.state.papers.some(function (p) { return p.doi && p.doi.toLowerCase() === x.doi.toLowerCase(); })) return;
            Store.addPaper(Object.assign({}, x, { status: 'todo' }));
            added++;
          });
          h.close();
          UI.toast('已导入 ' + added + ' 篇文献', { type: 'success' });
        });
      }
    });
    return h;
  }

  Views.library = {
    title: '文献阅读',
    subtitle: function () { return '文献库 · 阅读记录 · 笔记整理'; },
    render: render,
    openDetail: openDetail,
    openNew: openNew,
    openBibtex: openBibtex
  };
})();
