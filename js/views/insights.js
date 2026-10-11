/* ============================================================
   科研日课 · views/insights.js
   复盘统计：趋势 / 时间分配 / 热力图 / 周复盘 / 周报导出
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const RANGES = [
    { id: '7', label: '近 7 天' },
    { id: '30', label: '近 30 天' },
    { id: '90', label: '近 90 天' },
    { id: 'week', label: '本周' },
    { id: 'month', label: '本月' }
  ];

  function state() {
    return App.ui.insights || (App.ui.insights = { range: '7', weekKey: Utils.isoWeek(Utils.today()).key });
  }
  function rangeDates(range) {
    const today = Utils.today();
    if (range === 'week') return { start: Utils.startOfWeek(today), end: Utils.endOfWeek(today) };
    if (range === 'month') return { start: today.slice(0, 8) + '01', end: today };
    const n = Number(range) || 7;
    return { start: Utils.addDays(today, -(n - 1)), end: today };
  }
  function delta(cur, prev) {
    if (!prev) return { cls: cur > 0 ? 'up' : 'flat', txt: cur > 0 ? '新增' : '—' };
    const d = Math.round(((cur - prev) / prev) * 100);
    if (d > 0) return { cls: 'up', txt: '+' + d + '%' };
    if (d < 0) return { cls: 'down', txt: d + '%' };
    return { cls: 'flat', txt: '持平' };
  }

  function render(root) {
    const s = state();
    const r = rangeDates(s.range);
    const cur = Store.rangeStats(r.start, r.end);
    const span = Utils.diffDays(r.start, r.end) + 1;
    const prevEnd = Utils.addDays(r.start, -1);
    const prev = Store.rangeStats(Utils.addDays(prevEnd, -(span - 1)), prevEnd);
    const labels = cur.days.map(function (d) { return Utils.fmtDate(d.date, 'short'); });
    const completions = cur.days.map(function (d) { return d.done; });
    const focusSeries = cur.days.map(function (d) { return Math.round(d.focusMin); });
    const catMinutes = Store.categoryMinutes(r.start, r.end);
    const catTasks = Store.categoryTasks(r.start, r.end);
    const totalCatMin = catMinutes.reduce(function (a, x) { return a + x.value; }, 0);
    const expStat = Store.expStats();
    const paperStat = Store.paperStats();
    const expTotal = Store.state.experiments.length || 1;
    const paperTotal = Store.state.papers.length || 1;
    const goal = Store.state.settings.dailyFocusGoal || 180;
    const avgFocus = cur.days.length ? Math.round(cur.focusMin / cur.days.length) : 0;
    const rate = cur.tasksTotal ? Math.round((cur.tasksDone / cur.tasksTotal) * 100) : 0;
    const dTasks = delta(cur.tasksDone, prev.tasksDone);
    const dFocus = delta(cur.focusMin, prev.focusMin);
    const dRead = delta(cur.readingMin, prev.readingMin);

    const weeks = Store.heatWeeks(16);
    root.innerHTML = `
      <div class="row wrap mb-10" style="gap:10px;margin-bottom:14px">
        <div class="range-tabs">
          ${RANGES.map(function (x) { return `<button class="range-tab ${s.range === x.id ? 'active' : ''}" data-range="${x.id}">${x.label}</button>`; }).join('')}
        </div>
        <span class="text-xs text-3">统计区间：${Utils.fmtDate(r.start, 'md')} – ${Utils.fmtDate(r.end, 'md')}</span>
        <div class="grow"></div>
        <button class="btn btn-sm" data-action="export-week">${Utils.icon('download', 14)} 导出周报</button>
        <button class="btn btn-sm" data-action="print">${Utils.icon('copy', 14)} 打印 / 导出 PDF</button>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('checkCircle', 15)}</span>完成任务</div>
          <div class="kpi-value">${cur.tasksDone}<small>项</small></div>
          <div class="kpi-label">完成率 ${rate}% · <span class="kpi-delta ${dTasks.cls}">${dTasks.txt}</span></div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('clock', 15)}</span>专注时长</div>
          <div class="kpi-value">${Math.round(cur.focusMin / 60 * 10) / 10}<small>小时</small></div>
          <div class="kpi-label">日均 ${Utils.durShort(avgFocus)} · <span class="kpi-delta ${dFocus.cls}">${dFocus.txt}</span></div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('zap', 15)}</span>番茄个数</div>
          <div class="kpi-value">${cur.sessionCount}<small>个</small></div>
          <div class="kpi-label">平均每个 ${cur.sessionCount ? Utils.durShort(Math.round(cur.focusMin / cur.sessionCount)) : '—'}</div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('book', 15)}</span>文献阅读</div>
          <div class="kpi-value">${Math.round(cur.readingMin / 60 * 10) / 10}<small>小时</small></div>
          <div class="kpi-label">涉及 ${cur.readingPapers} 篇 · 读完 ${cur.papersRead} 篇 · <span class="kpi-delta ${dRead.cls}">${dRead.txt}</span></div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('flask', 15)}</span>实验记录</div>
          <div class="kpi-value">${cur.expLogs}<small>条</small></div>
          <div class="kpi-label">进行中实验 ${expStat.running || 0} 个</div></div>
        <div class="kpi"><div class="kpi-top"><span class="kpi-icon">${Utils.icon('flame', 15)}</span>连续活跃</div>
          <div class="kpi-value">${Store.streak()}<small>天</small></div>
          <div class="kpi-label">区间内活跃 ${cur.activeDays} 天</div></div>
      </div>

      <div class="grid-2 mt-14" style="margin-top:16px">
        <section class="chart-card">
          <div class="chart-head"><h4>任务完成 与 专注时长</h4><div class="spacer"></div>
            <div class="legend">
              <span class="legend-item"><i class="legend-swatch" style="--c:var(--accent)"></i>完成任务（项）</span>
              <span class="legend-item"><i class="legend-swatch line" style="--c:var(--ok)"></i>专注（分钟）</span>
            </div>
          </div>
          ${Charts.combo({
            labels: labels, bars: completions, line: focusSeries,
            height: 220,
            barTip: function (i, v) { return labels[i] + '：完成 ' + v + ' 项'; },
            lineTip: function (i, v) { return labels[i] + '：专注 ' + v + ' 分钟'; }
          })}
        </section>
        <section class="chart-card">
          <div class="chart-head"><h4>专注时间分配</h4><div class="spacer"></div>
            <span class="text-xs text-3">合计 ${Utils.durText(totalCatMin)}</span></div>
          <div class="row" style="gap:18px;align-items:center;flex-wrap:wrap">
            ${Charts.donut({
              slices: catMinutes, size: 172, thickness: 20,
              centerTop: totalCatMin ? Math.round(totalCatMin / 60 * 10) / 10 + 'h' : '0h', centerSub: '总计专注'
            })}
            <div class="stack-sm grow" style="min-width:150px">
              ${catMinutes.length ? catMinutes.sort(function (a, b) { return b.value - a.value; }).map(function (c) {
                return `<div class="stat-line"><span class="sl-label"><i class="legend-swatch" style="--c:${c.color}"></i>${c.label}</span>
                  <span class="sl-bar"><i style="width:${Math.round(c.value / totalCatMin * 100)}%;--c:${c.color}"></i></span>
                  <span class="sl-value">${Utils.durShort(c.value)}</span></div>`;
              }).join('') : '<div class="field-hint">还没有专注记录。用番茄钟开始第一个专注时段吧。</div>'}
            </div>
          </div>
        </section>
      </div>

      <div class="grid-2 mt-14" style="margin-top:16px">
        <section class="chart-card">
          <div class="chart-head"><h4>任务类型分布</h4><div class="spacer"></div><span class="text-xs text-3">共 ${cur.tasksTotal} 项</span></div>
          ${catTasks.length ? catTasks.sort(function (a, b) { return b.value - a.value; }).map(function (c) {
            const max = Math.max.apply(null, catTasks.map(function (x) { return x.value; }));
            return `<div class="stat-line mb-6"><span class="sl-label"><i class="legend-swatch" style="--c:${c.color}"></i>${c.label}</span>
              <span class="sl-bar"><i style="width:${Math.round(c.value / max * 100)}%;--c:${c.color}"></i></span>
              <span class="sl-value">${c.value} 项</span></div>`;
          }).join('') : '<div class="field-hint">区间内还没有任务记录。</div>'}
          <div class="divider"></div>
          <div class="row wrap" style="gap:16px">
            <div class="grow">
              <div class="text-xs text-3 mb-6">实验状态</div>
              <div class="seg-bar">
                ${Utils.EXP_STATUS.map(function (st) {
                  const v = expStat[st.id] || 0;
                  return v ? `<i style="width:${Math.round(v / expTotal * 100)}%;background:${st.color}" title="${st.label}：${v}"></i>` : '';
                }).join('')}
              </div>
              <div class="legend mt-10">${Utils.EXP_STATUS.filter(function (st) { return expStat[st.id]; }).map(function (st) {
                return `<span class="legend-item"><i class="legend-swatch" style="--c:${st.color}"></i>${st.label} ${expStat[st.id]}</span>`;
              }).join('') || '<span class="legend-item">暂无实验</span>'}</div>
            </div>
            <div class="grow">
              <div class="text-xs text-3 mb-6">文献状态</div>
              <div class="seg-bar">
                ${Utils.PAPER_STATUS.map(function (st) {
                  const v = paperStat[st.id] || 0;
                  return v ? `<i style="width:${Math.round(v / paperTotal * 100)}%;background:${st.color}" title="${st.label}：${v}"></i>` : '';
                }).join('')}
              </div>
              <div class="legend mt-10">${Utils.PAPER_STATUS.filter(function (st) { return paperStat[st.id]; }).map(function (st) {
                return `<span class="legend-item"><i class="legend-swatch" style="--c:${st.color}"></i>${st.label} ${paperStat[st.id]}</span>`;
              }).join('') || '<span class="legend-item">暂无文献</span>'}</div>
            </div>
          </div>
        </section>
        <section class="chart-card">
          <div class="chart-head"><h4>科研活跃热力图</h4><div class="spacer"></div><span class="text-xs text-3">近 16 周 · 任务 + 专注 + 打卡</span></div>
          <div class="heat-scroll">${Charts.heatmap(weeks)}</div>
          <div class="divider"></div>
          <div class="row" style="gap:14px;flex-wrap:wrap">
            <div class="grow"><div class="text-xs text-3">每日专注目标</div><div class="bold num">${Utils.durText(goal)}</div></div>
            <div class="grow"><div class="text-xs text-3">达成目标天数</div><div class="bold num">${cur.days.filter(function (d) { return d.focusMin >= goal; }).length} / ${cur.days.length}</div></div>
            <div class="grow"><div class="text-xs text-3">最高专注日</div><div class="bold num">${(function () {
              let best = null;
              cur.days.forEach(function (d) { if (!best || d.focusMin > best.focusMin) best = d; });
              return best && best.focusMin ? Utils.fmtDate(best.date, 'md') + ' · ' + Utils.durShort(best.focusMin) : '—';
            })()}</div></div>
          </div>
        </section>
      </div>

      <div id="reviewHost" class="mt-14" style="margin-top:16px"></div>`;
    renderReview(root, s);
    bind(root, s);
  }

  function weekOptions(currentKey) {
    const out = [];
    let monday = Utils.startOfWeek(Utils.today());
    for (let i = 0; i < 12; i++) {
      const key = Utils.isoWeek(monday).key;
      out.push({ key: key, start: monday, end: Utils.addDays(monday, 6), label: Utils.fmtDate(monday, 'md') + ' – ' + Utils.fmtDate(Utils.addDays(monday, 6), 'md') });
      monday = Utils.addDays(monday, -7);
    }
    return out;
  }

  function renderReview(root, s) {
    const host = root.querySelector('#reviewHost');
    const opts = weekOptions();
    if (!opts.some(function (o) { return o.key === s.weekKey; })) s.weekKey = opts[0].key;
    const cur = opts.find(function (o) { return o.key === s.weekKey; }) || opts[0];
    const rv = Store.getReview(s.weekKey);
    const rs = Store.rangeStats(cur.start, cur.end);
    host.innerHTML = `
      <section class="chart-card">
        <div class="chart-head">
          <h4>周复盘</h4>
          <div class="select-wrap" style="width:200px">
            <select class="select" id="revWeek">
              ${opts.map(function (o) { return `<option value="${o.key}" ${o.key === s.weekKey ? 'selected' : ''}>${o.label}${o.key === Utils.isoWeek(Utils.today()).key ? '（本周）' : ''}</option>`; }).join('')}
            </select>
          </div>
          <div class="spacer"></div>
          <span class="text-xs text-3">该周：完成 ${rs.tasksDone} 项 · 专注 ${Utils.durShort(rs.focusMin)} · 读完 ${rs.papersRead} 篇</span>
          <button class="btn btn-sm" data-action="report">${Utils.icon('copy', 14)} 生成周报</button>
          <button class="btn btn-primary btn-sm" data-action="save-review">保存复盘</button>
        </div>
        <div class="review-grid">
          <div class="review-field"><label>${Utils.icon('award', 14)} 本周进展与收获</label>
            <textarea class="textarea" id="revWins" style="min-height:130px" placeholder="1. 完成了什么？&#10;2. 学到 / 想通了什么？">${Utils.esc(rv.wins)}</textarea></div>
          <div class="review-field"><label>${Utils.icon('alert', 14)} 遇到的问题</label>
            <textarea class="textarea" id="revProblems" style="min-height:130px" placeholder="实验卡在哪？时间被什么偷走了？">${Utils.esc(rv.problems)}</textarea></div>
          <div class="review-field"><label>${Utils.icon('target', 14)} 下周计划</label>
            <textarea class="textarea" id="revPlans" style="min-height:130px" placeholder="1. 最重要的三件事&#10;2. 需要改进的习惯">${Utils.esc(rv.plans)}</textarea></div>
        </div>
        ${rv.updatedAt ? `<div class="field-hint mt-10">上次保存：${Utils.dtText(rv.updatedAt)}</div>` : ''}
      </section>`;
  }

  function bind(root, s) {
    root.querySelectorAll('[data-range]').forEach(function (b) {
      b.addEventListener('click', function () { s.range = b.dataset.range; App.persistUI(); App.render(); });
    });
    const weekSel = root.querySelector('#revWeek');
    if (weekSel) weekSel.addEventListener('change', function () {
      s.weekKey = weekSel.value; App.persistUI();
      renderReview(root, s);
    });
    root.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'save-review') {
        Store.setReview(s.weekKey, {
          wins: root.querySelector('#revWins').value.trim(),
          problems: root.querySelector('#revProblems').value.trim(),
          plans: root.querySelector('#revPlans').value.trim()
        });
        UI.toast('复盘已保存', { type: 'success' });
      } else if (action === 'report') {
        root.querySelector('#revWins').value.trim() || Store.setReview(s.weekKey, {
          wins: root.querySelector('#revWins').value.trim(),
          problems: root.querySelector('#revProblems').value.trim(),
          plans: root.querySelector('#revPlans').value.trim()
        });
        const key = s.weekKey;
        const m = key.match(/(\d{4})-W(\d+)/);
        let monday = Utils.startOfWeek(Utils.today());
        for (let i = 0; i < 12; i++) {
          if (Utils.isoWeek(monday).key === key) break;
          monday = Utils.addDays(monday, -7);
        }
        const md = Store.exportWeekMarkdown(monday);
        UI.openModal({
          size: 'wide', icon: 'insights', title: '科研周报（Markdown）',
          sub: '可直接粘贴到组会文档 / Notion / 周报邮件',
          body: '<textarea class="textarea" id="reportText" style="min-height:320px;font-family:var(--font-mono);font-size:12px">' + Utils.esc(md) + '</textarea>',
          footer: '<button class="btn" data-act="copy">' + Utils.icon('copy', 15) + ' 复制</button>' +
            '<button class="btn" data-act="dl">' + Utils.icon('download', 15) + ' 下载 .md</button><div class="spacer"></div>' +
            '<button class="btn btn-primary" data-act="close">完成</button>',
          onMount: function (h) {
            h.wrap.querySelector('[data-act=close]').addEventListener('click', function () { h.close(); });
            h.wrap.querySelector('[data-act=copy]').addEventListener('click', function () {
              Utils.copyText(md).then(function () { UI.toast('周报已复制到剪贴板', { type: 'success' }); });
            });
            h.wrap.querySelector('[data-act=dl]').addEventListener('click', function () {
              Utils.download('科研周报-' + monday + '.md', md, 'text/markdown');
            });
          }
        });
      } else if (action === 'export-week') {
        let monday = Utils.startOfWeek(Utils.today());
        for (let i = 0; i < 12; i++) {
          if (Utils.isoWeek(monday).key === s.weekKey) break;
          monday = Utils.addDays(monday, -7);
        }
        Utils.download('科研周报-' + monday + '.md', Store.exportWeekMarkdown(monday), 'text/markdown');
        UI.toast('已导出周报', { type: 'success' });
      } else if (action === 'print') {
        window.print();
      }
    });
  }

  Views.insights = {
    title: '复盘统计',
    subtitle: function () { return '用数据看清这段时间的科研节奏'; },
    render: render
  };
})();
