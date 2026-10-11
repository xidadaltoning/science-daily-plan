/* ============================================================
   科研日课 · charts.js
   纯 SVG 图表（无外部依赖，支持明暗主题）
   ============================================================ */
window.Charts = (function () {
  let seq = 0;
  function nid(p) { return (p || 'ch') + '-' + (++seq); }

  function ring(o) {
    const size = o.size || 120, stroke = o.stroke || 10;
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const pct = o.max ? Math.max(0, Math.min(1, o.value / o.max)) : 0;
    const color = o.color || 'var(--accent)';
    const gid = nid('ring');
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" style="stop-color:' + color + '"/><stop offset="1" style="stop-color:var(--accent-2)"/></linearGradient></defs>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '" style="stroke:var(--surface-3)"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '" stroke-linecap="round" ' +
      'stroke-dasharray="' + (c * pct) + ' ' + c + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')" style="stroke:url(#' + gid + ')"/>' +
      (o.center ? '<text x="' + size / 2 + '" y="' + (size / 2 + (o.centerSize ? o.centerSize * 0.36 : 8)) + '" text-anchor="middle" font-size="' + (o.centerSize || 24) + '" font-weight="700" style="fill:var(--text);font-variant-numeric:tabular-nums">' + o.center + '</text>' : '') +
      (o.sub ? '<text x="' + size / 2 + '" y="' + (size / 2 + (o.centerSize || 24) * 0.62 + 12) + '" text-anchor="middle" font-size="11" style="fill:var(--text-3)">' + o.sub + '</text>' : '') +
      '</svg>';
  }

  function combo(o) {
    const labels = o.labels || [], bars = o.bars || [], line = o.line || [];
    const W = o.width || 660, H = o.height || 210;
    const padL = 36, padR = 36, padT = 16, padB = 26;
    const iw = W - padL - padR, ih = H - padT - padB;
    const n = Math.max(labels.length, 1);
    const step = iw / n;
    const barW = Math.max(6, Math.min(24, step * 0.5));
    const maxBar = Math.max.apply(null, bars.concat([1]));
    const maxLine = Math.max.apply(null, line.concat([1]));
    const gid = nid('combo');
    const hasLine = line.some(function (v) { return v > 0; });
    let svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' +
      '<defs><linearGradient id="' + gid + 'b" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent-2);stop-opacity:.55"/></linearGradient>' +
      '<linearGradient id="' + gid + 'a" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" style="stop-color:var(--ok);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--ok);stop-opacity:0"/></linearGradient></defs>';
    let lastBarTick = null, lastLineTick = null;
    for (let i = 0; i <= 3; i++) {
      const y = padT + (ih * i) / 3;
      svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" style="stroke:var(--grid-line)" stroke-dasharray="3 5"/>';
      const bTick = Math.round((maxBar * (3 - i)) / 3);
      const lTick = Math.round((maxLine * (3 - i)) / 3);
      if (bTick !== lastBarTick) {
        svg += '<text x="' + (padL - 7) + '" y="' + (y + 3.5) + '" text-anchor="end" class="chart-tip">' + bTick + '</text>';
        lastBarTick = bTick;
      }
      if (hasLine && lTick !== lastLineTick) {
        svg += '<text x="' + (W - padR + 7) + '" y="' + (y + 3.5) + '" text-anchor="start" class="chart-tip">' + lTick + '</text>';
        lastLineTick = lTick;
      }
    }
    let area = '', linePath = '', pts = [];
    for (let i = 0; i < n; i++) {
      const cx = padL + step * i + step / 2;
      const bv = bars[i] || 0;
      const bh = Math.max(bv > 0 ? 2 : 0, (bv / maxBar) * ih);
      const by = padT + ih - bh;
      svg += '<g class="bar-hit"><title>' + (o.barTip ? o.barTip(i, bv) : labels[i] + '：' + bv) + '</title>' +
        '<rect x="' + (cx - barW / 2) + '" y="' + by + '" width="' + barW + '" height="' + bh + '" rx="' + Math.min(5, barW / 2) + '" style="fill:url(#' + gid + 'b)"/></g>';
      const lv = line[i] || 0;
      const ly = padT + ih - (lv / maxLine) * ih;
      pts.push([cx, ly, lv]);
    }
    if (hasLine) {
      linePath = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      area = linePath + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (padT + ih) + ' L' + pts[0][0].toFixed(1) + ' ' + (padT + ih) + ' Z';
      svg += '<path d="' + area + '" style="fill:url(#' + gid + 'a)"/>';
      svg += '<path d="' + linePath + '" fill="none" style="stroke:var(--ok)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      pts.forEach(function (p, i) {
        if (!p[2]) return;
        svg += '<g><title>' + (o.lineTip ? o.lineTip(i, p[2]) : labels[i] + '：' + p[2]) + '</title>' +
          '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.2" style="fill:var(--surface);stroke:var(--ok)" stroke-width="2"/></g>';
      });
    }
    const every = n > 16 ? Math.ceil(n / 8) : n > 9 ? 2 : 1;
    labels.forEach(function (lb, i) {
      if (i % every) return;
      const cx = padL + step * i + step / 2;
      svg += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" class="chart-tip">' + lb + '</text>';
    });
    return svg + '</svg>';
  }

  function area(o) {
    const labels = o.labels || [], values = o.values || [];
    const W = o.width || 660, H = o.height || 170;
    const padL = 34, padR = 18, padT = 14, padB = 24;
    const iw = W - padL - padR, ih = H - padT - padB;
    const n = Math.max(labels.length, 1);
    const step = n > 1 ? iw / (n - 1) : iw;
    const max = Math.max.apply(null, values.concat([o.minMax || 1]));
    const gid = nid('area');
    const color = o.color || 'var(--accent)';
    let pts = [];
    let svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" style="stop-color:' + color + ';stop-opacity:.32"/><stop offset="1" style="stop-color:' + color + ';stop-opacity:0"/></linearGradient></defs>';
    for (let i = 0; i <= 2; i++) {
      const y = padT + (ih * i) / 2;
      svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" style="stroke:var(--grid-line)" stroke-dasharray="3 5"/>';
      svg += '<text x="' + (padL - 7) + '" y="' + (y + 3.5) + '" text-anchor="end" class="chart-tip">' + Math.round((max * (2 - i)) / 2) + '</text>';
    }
    values.forEach(function (v, i) {
      const x = padL + step * i;
      const y = padT + ih - (v / max) * ih;
      pts.push([x, y, v]);
    });
    if (pts.length) {
      const path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      svg += '<path d="' + path + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (padT + ih) + ' L' + pts[0][0].toFixed(1) + ' ' + (padT + ih) + ' Z" style="fill:url(#' + gid + ')"/>';
      svg += '<path d="' + path + '" fill="none" style="stroke:' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
      pts.forEach(function (p, i) {
        svg += '<g><title>' + labels[i] + '：' + p[2] + (o.unit || '') + '</title><circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" style="fill:var(--surface);stroke:' + color + '" stroke-width="2"/></g>';
      });
    }
    const every = n > 16 ? Math.ceil(n / 8) : n > 8 ? 2 : 1;
    labels.forEach(function (lb, i) {
      if (i % every) return;
      svg += '<text x="' + (padL + step * i) + '" y="' + (H - 7) + '" text-anchor="middle" class="chart-tip">' + lb + '</text>';
    });
    return svg + '</svg>';
  }

  function donut(o) {
    const slices = (o.slices || []).filter(function (s) { return s.value > 0; });
    const size = o.size || 176, th = o.thickness || 19;
    const r = (size - th) / 2 - 2, cx = size / 2, cy = size / 2;
    const C = 2 * Math.PI * r;
    const total = slices.reduce(function (a, s) { return a + s.value; }, 0);
    if (!total) {
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke-width="' + th + '" style="stroke:var(--surface-3)"/>' +
        '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="12" style="fill:var(--text-4)">暂无数据</text></svg>';
    }
    let off = 0, svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
    slices.forEach(function (s) {
      const frac = s.value / total;
      const len = Math.max(0.6, frac * C - 3);
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke-width="' + th + '" stroke-linecap="butt" ' +
        'stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" ' +
        'style="stroke:' + s.color + '">' +
        '<title>' + Utils.esc(s.label) + '：' + s.value + (o.unit || '') + '（' + Math.round(frac * 100) + '%）</title></circle>';
      off += frac * C;
    });
    svg += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="' + (o.centerSize || 21) + '" font-weight="700" style="fill:var(--text);font-variant-numeric:tabular-nums">' + (o.centerTop || '') + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 17) + '" text-anchor="middle" font-size="11" style="fill:var(--text-3)">' + (o.centerSub || '') + '</text>';
    return svg + '</svg>';
  }

  function sparkline(values, w, h, color) {
    w = w || 90; h = h || 26;
    const max = Math.max.apply(null, values.concat([1]));
    const n = Math.max(values.length, 2);
    const step = w / (n - 1);
    const pts = values.map(function (v, i) { return [i * step, h - (v / max) * (h - 4) - 2]; });
    const d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="display:block">' +
      '<path d="' + d + '" fill="none" style="stroke:' + (color || 'var(--accent)') + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  }

  function heatmap(weeks, opts) {
    opts = opts || {};
    const WD = ['一', '', '三', '', '五', '', '日'];
    let html = '<div class="heat"><div class="heat-months">';
    let lastMonth = '';
    const monthCells = weeks.map(function (w) {
      const first = w[0] && w[0].date || '';
      const m = first ? Utils.monthLabel(first) : '';
      const show = m && m !== lastMonth;
      if (show) lastMonth = m;
      return show ? m : '';
    });
    monthCells.forEach(function (m, i) {
      html += '<div class="heat-month" style="width:' + (opts.cell || 12) + 'px;flex:none">' + (m ? '<span style="position:relative;left:-2px">' + m + '</span>' : '') + '</div>';
    });
    html += '</div><div class="heat-body"><div class="heat-days">';
    WD.forEach(function (d) { html += '<div class="heat-day-label">' + d + '</div>'; });
    html += '</div><div class="heat-grid">';
    weeks.forEach(function (w) {
      html += '<div class="heat-col">';
      w.forEach(function (c) {
        const tip = c.date ? (Utils.fmtDate(c.date, 'md') + '：' + (c.tip || (c.value + ' 分'))) : '';
        html += '<div class="heat-cell l' + (c.level || 0) + '" title="' + Utils.esc(tip) + '"></div>';
      });
      html += '</div>';
    });
    html += '</div></div><div class="heat-legend"><span>少</span>' +
      '<div class="heat-cell l0"></div><div class="heat-cell l1"></div><div class="heat-cell l2"></div><div class="heat-cell l3"></div><div class="heat-cell l4"></div>' +
      '<span>多</span></div></div>';
    return html;
  }

  return { ring: ring, combo: combo, area: area, donut: donut, sparkline: sparkline, heatmap: heatmap };
})();

