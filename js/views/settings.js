/* ============================================================
   科研日课 · views/settings.js
   设置：个人目标 / 番茄钟 / 外观 / 数据管理 / 快捷键
   ============================================================ */
window.Views = window.Views || {};

(function () {
  const ACCENTS = [
    { id: 'indigo', color: '#5b6cff', label: '靛蓝' },
    { id: 'violet', color: '#8b5cf6', label: '紫罗兰' },
    { id: 'sky', color: '#0ea5e9', label: '天蓝' },
    { id: 'emerald', color: '#10b981', label: '翡翠' },
    { id: 'amber', color: '#f59e0b', label: '琥珀' },
    { id: 'rose', color: '#f43f5e', label: '玫瑰' }
  ];

  function bytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  function render(root) {
    const s = Store.state.settings;
    const p = s.pomodoro;
    const counts = {
      tasks: Store.state.tasks.length,
      exps: Store.state.experiments.length,
      papers: Store.state.papers.length,
      notes: Store.state.notes.length,
      sessions: Store.state.sessions.length,
      goals: Store.state.goals.length,
      days: Object.keys(Store.state.routineLog).length
    };
    root.innerHTML = `
      ${Store.isStorageOK() ? '' : `<div class="card" style="border-color:color-mix(in srgb,var(--danger) 40%, var(--border));margin-bottom:16px">
        <div class="row" style="gap:10px"><span style="color:var(--danger)">${Utils.icon('alert', 20)}</span>
        <div class="grow"><div class="bold">本地存储不可用</div>
        <div class="text-sm text-3">浏览器可能处于隐私模式或限制了本地存储，数据将无法自动保存。建议立即导出备份，或换用普通窗口打开。</div></div></div></div>`}
      <div class="settings-grid">
        <div class="stack">
          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('target', 16)} 个人与目标</div></div>
            <div class="form-grid">
              <div class="field"><label>称呼</label>
                <input class="input" id="setName" value="${Utils.esc(s.name)}" placeholder="例如：小林"></div>
              <div class="field"><label>研究方向</label>
                <input class="input" id="setField" value="${Utils.esc(s.field)}" placeholder="例如：纳米酶传感"></div>
              <div class="field"><label>每日专注目标（分钟）</label>
                <input class="input" type="number" min="10" max="960" step="10" id="setFocus" value="${s.dailyFocusGoal}"></div>
              <div class="field"><label>每日任务目标（项）</label>
                <input class="input" type="number" min="1" max="20" id="setTaskGoal" value="${s.dailyTaskGoal}"></div>
              <div class="field"><label>每周任务目标（项）</label>
                <input class="input" type="number" min="1" max="200" id="setWeekGoal" value="${s.weeklyTaskGoal}"></div>
              <div class="field" style="justify-content:flex-end">
                <button class="btn btn-primary" data-action="save-profile">${Utils.icon('save', 15)} 保存设置</button></div>
            </div>
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('clock', 16)} 番茄钟</div>
              <div class="card-sub">默认 25 + 5 的经典节奏</div></div>
            <div class="form-grid">
              <div class="field"><label>专注时长（分钟）</label>
                <input class="input" type="number" min="5" max="180" id="pomoWork" value="${p.work}"></div>
              <div class="field"><label>短休息（分钟）</label>
                <input class="input" type="number" min="1" max="60" id="pomoShort" value="${p.short}"></div>
              <div class="field"><label>长休息（分钟）</label>
                <input class="input" type="number" min="5" max="120" id="pomoLong" value="${p.long}"></div>
              <div class="field"><label>每几个番茄进入长休息</label>
                <input class="input" type="number" min="2" max="10" id="pomoEvery" value="${p.longEvery}"></div>
            </div>
            <div class="set-list mt-10">
              <div class="set-row">
                <div class="set-main"><div class="set-name">完成提示音</div><div class="set-desc">阶段结束时播放提示音</div></div>
                <div class="set-control"><label class="switch"><input type="checkbox" id="pomoSound" ${p.sound ? 'checked' : ''}><span class="track"></span><span class="thumb"></span></label></div>
              </div>
              <div class="set-row">
                <div class="set-main"><div class="set-name">自动开始下一阶段</div><div class="set-desc">专注结束后自动进入休息倒计时</div></div>
                <div class="set-control"><label class="switch"><input type="checkbox" id="pomoAuto" ${p.autoNext ? 'checked' : ''}><span class="track"></span><span class="thumb"></span></label></div>
              </div>
            </div>
            <button class="btn btn-soft btn-sm mt-10" data-action="save-pomo">保存番茄钟设置</button>
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('sun', 16)} 外观</div></div>
            <div class="field mb-10"><label>主题</label>
              <div class="segmented" id="themeSeg">
                <button class="segmented-item ${s.theme === 'auto' ? 'active' : ''}" data-theme="auto">跟随系统</button>
                <button class="segmented-item ${s.theme === 'light' ? 'active' : ''}" data-theme="light">浅色</button>
                <button class="segmented-item ${s.theme === 'dark' ? 'active' : ''}" data-theme="dark">深色</button>
              </div>
            </div>
            <div class="field"><label>强调色</label>
              <div class="swatches">
                ${ACCENTS.map(function (a) {
                  return `<button class="swatch ${s.accent === a.id ? 'active' : ''}" data-accent="${a.id}" title="${a.label}" style="background:${a.color};--sw:${a.color}"></button>`;
                }).join('')}
              </div>
            </div>
          </section>
        </div>

        <div class="stack">
          <section class="card" id="storeCard">
            <div class="card-head"><div class="card-title">${Utils.icon('save', 16)} 数据存储与备份</div>
              <div class="spacer"></div><span class="metric-chip" id="storeMode">检测中…</span></div>
            <div id="storeBody"></div>
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('folder', 16)} 数据管理</div>
              <div class="spacer"></div><span class="metric-chip">${bytes(Store.storageSize())}</span></div>
            <div class="set-list">
              <div class="set-row">
                <div class="set-main"><div class="set-name">导出 JSON 备份</div>
                  <div class="set-desc">包含全部任务、实验、文献、笔记与统计记录${s.lastBackupAt ? ' · 上次备份 ' + Utils.relTime(s.lastBackupAt) : ' · 还没有备份过'}</div></div>
                <div class="set-control"><button class="btn btn-sm btn-soft" data-action="export-json">${Utils.icon('download', 14)} 导出</button></div>
              </div>
              <div class="set-row">
                <div class="set-main"><div class="set-name">从备份导入</div>
                  <div class="set-desc">可选择「合并追加」或「完全覆盖」当前数据</div></div>
                <div class="set-control">
                  <button class="btn btn-sm" data-action="import-json">${Utils.icon('upload', 14)} 选择文件</button>
                  <input type="file" id="importFile" accept=".json,application/json" class="hide">
                </div>
              </div>
              <div class="set-row">
                <div class="set-main"><div class="set-name">导出全部内容为 Markdown</div>
                  <div class="set-desc">适合整理成 Word / Notion 中的科研档案</div></div>
                <div class="set-control"><button class="btn btn-sm" data-action="export-md">${Utils.icon('download', 14)} 导出</button></div>
              </div>
              <div class="set-row">
                <div class="set-main"><div class="set-name">载入示例数据</div>
                  <div class="set-desc">添加一组示例任务 / 实验 / 文献，用于体验功能</div></div>
                <div class="set-control"><button class="btn btn-sm" data-action="seed">${Utils.icon('sparkles', 14)} 载入</button></div>
              </div>
              <div class="set-row">
                <div class="set-main"><div class="set-name" style="color:var(--danger)">清空所有数据</div>
                  <div class="set-desc">删除本机保存的全部内容，请先导出备份</div></div>
                <div class="set-control"><button class="btn btn-sm btn-danger" data-action="clear">${Utils.icon('trash', 14)} 清空</button></div>
              </div>
            </div>
            <div class="divider"></div>
            <div class="row wrap" style="gap:8px">
              <span class="metric-chip">任务 ${counts.tasks}</span>
              <span class="metric-chip">实验 ${counts.exps}</span>
              <span class="metric-chip">文献 ${counts.papers}</span>
              <span class="metric-chip">目标 ${counts.goals}</span>
              <span class="metric-chip">速记 ${counts.notes}</span>
              <span class="metric-chip">专注记录 ${counts.sessions}</span>
              <span class="metric-chip">使用天数 ${counts.days}</span>
            </div>
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('layout', 16)} 快捷键</div></div>
            <table class="kbd-table">
              <tr><td>全局搜索</td><td><span class="kbd">Ctrl</span> + <span class="kbd">K</span> 或 <span class="kbd">/</span></td></tr>
              <tr><td>新建任务</td><td><span class="kbd">N</span></td></tr>
              <tr><td>开始 / 暂停番茄钟</td><td><span class="kbd">P</span></td></tr>
              <tr><td>切换到「今日」</td><td><span class="kbd">T</span></td></tr>
              <tr><td>切换页面</td><td><span class="kbd">1</span>–<span class="kbd">7</span></td></tr>
              <tr><td>保存 / 提交</td><td><span class="kbd">Ctrl</span> + <span class="kbd">Enter</span></td></tr>
              <tr><td>关闭弹窗 / 取消</td><td><span class="kbd">Esc</span></td></tr>
            </table>
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${Utils.icon('info', 16)} 关于</div></div>
            <div class="about-box">
              <p><b>科研日课</b> v1.1 · 单机运行的科研日程与记录工具，<b>数据不会上传网络</b>。</p>
              <p class="mt-10"><b>推荐用法（本地文件模式）</b>：双击 <code>启动科研日课.bat</code>，界面会以 http://127.0.0.1 打开，数据自动保存到 <code>data\科研日课数据.json</code>，并且每天自动生成一份快照备份。Chrome 与 Edge 看到的是同一份数据，清理浏览器也不会丢。</p>
              <p class="mt-10"><b>备用用法（离线模式）</b>：直接双击 <code>index.html</code>，数据保存在当前浏览器本地，适合临时使用；此时建议每周点一次「导出 JSON 备份」。</p>
              <p>· 数据文件夹可以直接复制到网盘 / 移动硬盘做二次备份；</p>
              <p>· 换电脑时把整个「科研日课」文件夹拷走即可，或用「从备份导入」恢复；</p>
              <p>· 想每天一键打开：右键 <code>启动科研日课.bat</code> → 发送到 → 桌面快捷方式。</p>
              <p class="mt-10">小建议：早上花 3 分钟规划今日任务，晚上花 2 分钟勾选完成情况并记一条速记，周五做一次周复盘，坚持一个月就能看到自己的科研节奏变化。</p>
            </div>
          </section>
        </div>
      </div>`;
    bind(root);
  }

  function bind(root) {
    bindStorage(root);
    root.querySelector('[data-action=save-profile]').addEventListener('click', function () {
      const s = Store.state.settings;
      s.name = root.querySelector('#setName').value.trim();
      s.field = root.querySelector('#setField').value.trim();
      s.dailyFocusGoal = Math.max(10, Number(root.querySelector('#setFocus').value) || 180);
      s.dailyTaskGoal = Math.max(1, Number(root.querySelector('#setTaskGoal').value) || 5);
      s.weeklyTaskGoal = Math.max(1, Number(root.querySelector('#setWeekGoal').value) || 25);
      Store.saveNow(); Store.emit();
      UI.toast('设置已保存', { type: 'success' });
    });
    root.querySelector('[data-action=save-pomo]').addEventListener('click', function () {
      const p = Store.state.settings.pomodoro;
      p.work = Math.max(5, Number(root.querySelector('#pomoWork').value) || 25);
      p.short = Math.max(1, Number(root.querySelector('#pomoShort').value) || 5);
      p.long = Math.max(5, Number(root.querySelector('#pomoLong').value) || 15);
      p.longEvery = Math.max(2, Number(root.querySelector('#pomoEvery').value) || 4);
      p.sound = root.querySelector('#pomoSound').checked;
      p.autoNext = root.querySelector('#pomoAuto').checked;
      Store.saveNow(); Store.emit();
      Pomodoro.reset();
      UI.toast('番茄钟设置已更新', { type: 'success' });
    });
    root.querySelector('#themeSeg').addEventListener('click', function (e) {
      const b = e.target.closest('[data-theme]');
      if (!b) return;
      Store.state.settings.theme = b.dataset.theme;
      App.applyTheme();
      Store.saveNow();
      root.querySelectorAll('#themeSeg .segmented-item').forEach(function (x) { x.classList.toggle('active', x === b); });
    });
    root.querySelectorAll('[data-accent]').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.state.settings.accent = b.dataset.accent;
        App.applyTheme();
        Store.saveNow();
        root.querySelectorAll('[data-accent]').forEach(function (x) { x.classList.toggle('active', x === b); });
      });
    });
    root.querySelector('[data-action=export-json]').addEventListener('click', function () {
      Store.exportJSON();
      UI.toast('备份已导出，请妥善保存文件', { type: 'success', duration: 4000 });
    });
    const file = root.querySelector('#importFile');
    root.querySelector('[data-action=import-json]').addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      const f = file.files && file.files[0];
      if (!f) return;
      Utils.readFile(f).then(function (text) {
        UI.openModal({
          size: 'slim', icon: 'upload', title: '导入备份数据', sub: Utils.esc(f.name),
          body: '<div class="text-sm text-2">请选择导入方式：</div>' +
            '<div class="review-item mt-10"><div class="grow"><b>合并追加</b><div class="text-xs text-3">保留现有数据，把备份中不重复的内容追加进来</div></div></div>' +
            '<div class="review-item mt-10"><div class="grow"><b>完全覆盖</b><div class="text-xs text-3">用备份数据替换当前全部内容（当前数据将丢失）</div></div></div>',
          footer: '<button class="btn" data-act="cancel">取消</button><div class="spacer"></div>' +
            '<button class="btn" data-act="merge">合并追加</button>' +
            '<button class="btn btn-primary" data-act="replace">覆盖导入</button>',
          onMount: function (h) {
            h.wrap.querySelector('[data-act=cancel]').addEventListener('click', function () { h.close(); });
            h.wrap.querySelector('[data-act=merge]').addEventListener('click', function () {
              try { Store.importJSON(text, 'merge'); h.close(); UI.toast('已合并导入数据', { type: 'success' }); }
              catch (e) { UI.toast(e.message, { type: 'error', duration: 5000 }); }
            });
            h.wrap.querySelector('[data-act=replace]').addEventListener('click', function () {
              UI.confirm({ title: '确认覆盖当前数据？', message: '当前所有内容都会被备份文件替换，此操作不可撤销（可先导出一次备份）。', confirmLabel: '覆盖导入' })
                .then(function (ok) {
                  if (!ok) return;
                  try { Store.importJSON(text, 'replace'); h.close(); UI.toast('已覆盖导入数据', { type: 'success' }); }
                  catch (e) { UI.toast(e.message, { type: 'error', duration: 5000 }); }
                });
            });
          }
        });
      }).catch(function () { UI.toast('读取文件失败', { type: 'error' }); });
      file.value = '';
    });
    root.querySelector('[data-action=export-md]').addEventListener('click', function () {
      Utils.download('科研日课-全量导出-' + Utils.today() + '.md', Store.exportAllMarkdown(), 'text/markdown');
      UI.toast('已导出 Markdown', { type: 'success' });
    });
    root.querySelector('[data-action=seed]').addEventListener('click', function () {
      UI.confirm({ title: '载入示例数据？', message: '会添加示例任务、实验、文献与记录，便于体验。不会删除已有内容。', confirmLabel: '载入', danger: false })
        .then(function (ok) { if (ok) { Store.seedDemo(); UI.toast('示例数据已载入', { type: 'success' }); } });
    });
    root.querySelector('[data-action=clear]').addEventListener('click', function () {
      UI.confirm({
        title: '清空所有数据？',
        message: '本机保存的全部任务、实验、文献、速记与统计记录都将被删除，且无法恢复（除非已有备份）。',
        detail: '建议先点击「导出 JSON 备份」。',
        confirmLabel: '确认清空'
      }).then(function (ok) {
        if (!ok) return;
        Store.clearAll(true);
        UI.toast('数据已清空', { type: 'success' });
      });
    });
  }

  function bindStorage(root) {
    const card = root.querySelector('#storeCard');
    if (!card) return;
    const body = card.querySelector('#storeBody');
    const mode = card.querySelector('#storeMode');

    function wire() {
      const reveal = body.querySelector('[data-action=reveal]');
      if (reveal) reveal.addEventListener('click', function () {
        Store.revealData().then(function (ok) { if (!ok) UI.toast('无法打开数据文件夹', { type: 'error' }); });
      });
      const copyBtn = body.querySelector('[data-action=copy-path]');
      if (copyBtn) copyBtn.addEventListener('click', function () {
        Utils.copyText(Store.remoteStatus().dataFile || '').then(function () { UI.toast('数据文件路径已复制', { type: 'success' }); });
      });
      const backupBtn = body.querySelector('[data-action=backup-now]');
      if (backupBtn) backupBtn.addEventListener('click', function () {
        Store.backupNow().then(function (res) {
          if (res && res.ok) { UI.toast('已生成快照备份', { type: 'success' }); paint(Store.remoteStatus()); }
          else UI.toast('备份失败，请确认本地服务正在运行', { type: 'error' });
        });
      });
      const dl = body.querySelector('[data-action=download-json]');
      if (dl) dl.addEventListener('click', function () {
        Store.exportJSON();
        UI.toast('已导出 JSON 备份', { type: 'success' });
      });
    }

    function paint(st) {
      if (!document.body.contains(card)) return;
      if (st.mode === 'file') {
        mode.textContent = '已保存到本机文件';
        mode.style.color = 'var(--ok)';
        body.innerHTML = `<div class="set-list">
          <div class="set-row">
            <div class="set-main">
              <div class="set-name">数据文件（自动保存）</div>
              <div class="set-desc" style="word-break:break-all">${Utils.esc(st.dataFile || '')}</div>
              <div class="set-desc">上次写入：${st.savedAt ? Utils.dtText(st.savedAt) : '—'} · 已有 ${st.backups} 份快照备份</div>
            </div>
            <div class="set-control">
              <button class="btn btn-sm" data-action="reveal">${Utils.icon('folder', 14)} 打开文件夹</button>
              <button class="btn btn-sm" data-action="copy-path">${Utils.icon('copy', 14)} 复制路径</button>
            </div>
          </div>
          <div class="set-row">
            <div class="set-main">
              <div class="set-name">手动留一份快照</div>
              <div class="set-desc">每次修改都会写入数据文件，每天首次保存时再自动留一份快照；重要节点可以手动另存</div>
            </div>
            <div class="set-control">
              <button class="btn btn-sm btn-soft" data-action="backup-now">${Utils.icon('save', 14)} 立即备份</button>
              <button class="btn btn-sm" data-action="download-json">${Utils.icon('download', 14)} 导出 JSON</button>
            </div>
          </div>
        </div>`;
      } else if (st.mode === 'offline') {
        mode.textContent = '本地服务未响应';
        mode.style.color = 'var(--danger)';
        body.innerHTML = `<div class="set-list"><div class="set-row">
          <div class="set-main">
            <div class="set-name">暂时连不上本地数据服务</div>
            <div class="set-desc">数据仍会保存在浏览器中。可先运行「停止科研日课.bat」，再用「启动科研日课.bat」重新打开。</div>
            ${st.error ? '<div class="set-desc">错误信息：' + Utils.esc(st.error) + '</div>' : ''}
          </div></div></div>`;
      } else {
        mode.textContent = '浏览器本地存储';
        mode.style.color = 'var(--text-3)';
        body.innerHTML = `<div class="set-list"><div class="set-row">
          <div class="set-main">
            <div class="set-name">当前是离线模式</div>
            <div class="set-desc">数据保存在这个浏览器里。用「启动科研日课.bat」打开，即可自动保存到本机文件并每天生成快照备份。</div>
          </div>
          <div class="set-control"><button class="btn btn-sm" data-action="download-json">${Utils.icon('download', 14)} 导出 JSON 备份</button></div>
        </div></div>`;
      }
      wire();
    }

    const first = Store.remoteStatus();
    paint(first);
    if (first.mode !== 'browser') Store.syncRemote().then(function (st) { paint(st); });
  }

  Views.settings = {
    title: '设置',
    subtitle: function () { return '目标 · 外观 · 数据备份'; },
    render: render
  };
})();
