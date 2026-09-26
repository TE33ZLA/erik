/* Corporate Ladder — visual aids for questions: cash-flow timelines, tables,
 * NPV profiles, the Security Market Line and decision trees.
 * Colours come from CSS tokens (--c1..--c3, --ink, --ink-2, --line), so both themes work.
 */
(function (root) {
  'use strict';
  const { RENDER, T } = root;
  const esc = RENDER.esc;

  function fmtVal(v) {
    if (typeof v === 'number') return T.moneyT(v);
    return String(v);
  }

  /* ---------------- timeline ----------------
   * tl: {cfs:[…]} or {n, at:{t:v}}, plus optional hi:[t], labels:{t:'text'}, unit,
   *     moves:[{from, to, label, c}]  arrows that carry money between dates (compounding or discounting),
   *     spans:[{from, to, label, c, row}]  brackets under the line (periods, stretches of time),
   *     dim:[t]  values drawn faintly (for example, cash flows a rule ignores). */
  function timeline(tl, opts) {
    opts = opts || {};
    const V = root.VIZ;
    const svgT = (x) => (V ? V.svgT(x) : esc(x));
    const kc = (c, i) => ({ 1: 'k1', 2: 'k2', 3: 'k3', 4: 'k4', 5: 'k5', good: 'kg', bad: 'kb', grey: 'kn' })[c] || ['k2', 'k1', 'k3'][(i || 0) % 3];
    const moves = tl.moves || [], spans = tl.spans || [], dim = new Set((tl.dim || []).map(Number));
    let n, at = {};
    if (Array.isArray(tl.cfs)) { n = tl.cfs.length - 1; tl.cfs.forEach((v, t) => { if (v !== '' && v !== null && v !== undefined) at[t] = v; }); }
    else { n = tl.n; at = Object.assign({}, tl.at || {}); }
    const hi = new Set((tl.hi || []).map(Number));
    const labels = tl.labels || {};
    let ticks = [];
    if (n <= 12) ticks = Array.from({ length: n + 1 }, (_, k) => k);
    else {
      const s = new Set([0, 1, 2, n - 1, n]);
      Object.keys(at).forEach((k) => s.add(+k));
      hi.forEach((k) => s.add(k));
      moves.concat(spans).forEach((m) => { s.add(+m.from); s.add(+m.to); });
      ticks = [...s].filter((k) => k >= 0 && k <= n).sort((a, b) => a - b);
    }
    const longest = Math.max(4, ...ticks.map((t) => Math.max(fmtVal(at[t] === undefined ? '' : at[t]).length, String(labels[t] === undefined ? t : labels[t]).length)));
    const gap = Math.max(58, longest * 8.2 + 14);
    // room at the ends for a long first/last value and for the unit label ("Half-year")
    const valW = (t) => (at[t] === undefined ? 0 : fmtVal(at[t]).length * 8.2);
    const padL = Math.max(34, String(tl.unit || 't').length * 7.2 + 14, valW(ticks[0]) / 2 - 6);
    const padR = Math.max(36, valW(ticks[ticks.length - 1]) / 2 - 6);
    const W = Math.round(padL + padR + gap * (ticks.length - 1) + 20);
    // arrows above the line stack in levels so they never cross; brackets below stack in rows
    const lv = [];
    moves.forEach((m) => {
      const a = Math.min(m.from, m.to), b = Math.max(m.from, m.to);
      let L = 0;
      while (lv.some((o) => o.L === L && !(b <= o.a || a >= o.b))) L++;
      lv.push({ a, b, L });
    });
    const levels = lv.length ? Math.max(...lv.map((o) => o.L)) + 1 : 0;
    const Y = 62 + (levels ? 22 + levels * 34 : 0);
    const rows = spans.length ? Math.max(...spans.map((sp) => sp.row || 0)) + 1 : 0;
    const H = Y + 42 + (rows ? rows * 36 + 4 : 0);
    const x = (i) => padL + 10 + i * gap;
    const xt = (t) => { const i = ticks.indexOf(+t); return i >= 0 ? x(i) : null; };
    let s = `<svg class="tl-svg" viewBox="0 0 ${W} ${H}" style="width:100%;min-width:${Math.round(W * 0.8)}px;max-width:${W}px" role="img" aria-label="${esc(tl.alt || (V && moves.length ? V.describe(Object.assign({ type: 'tl' }, tl)) : 'Cash flow timeline'))}">`;
    s += `<line x1="${padL - 6}" y1="${Y}" x2="${W - padR + 20}" y2="${Y}" class="tl-axis"/>`;
    s += `<path d="M${W - padR + 20} ${Y} l-9 -5 v10 z" class="tl-arrow"/>`;
    ticks.forEach((t, i) => {
      const cx = x(i);
      if (i > 0 && t - ticks[i - 1] > 1) {
        const mx = (x(i - 1) + cx) / 2;
        s += `<rect x="${mx - 9}" y="${Y - 7}" width="18" height="14" class="tl-gapbg"/><path d="M${mx - 7} ${Y + 6} l5 -12 M${mx + 1} ${Y + 6} l5 -12" class="tl-break"/>`;
      }
      const isHi = hi.has(t);
      s += `<line x1="${cx}" y1="${Y - 7}" x2="${cx}" y2="${Y + 7}" class="tl-tick${isHi ? ' hi' : ''}"/>`;
      if (isHi) s += `<circle cx="${cx}" cy="${Y}" r="6" class="tl-dot"/>`;
      const lab = labels[t] !== undefined ? labels[t] : String(t);
      s += `<text x="${cx}" y="${Y + 25}" class="tl-t${isHi ? ' hi' : ''}" text-anchor="middle">${esc(lab)}</text>`;
      if (at[t] !== undefined) {
        const v = fmtVal(at[t]);
        s += `<text x="${cx}" y="${Y - 17}" class="tl-v${isHi ? ' hi' : ''}${dim.has(t) ? ' dim' : ''}" text-anchor="middle">${esc(v)}</text>`;
      }
    });
    let arcLabels = '';
    moves.forEach((m, k) => {
      const x0 = xt(m.from), x1 = xt(m.to);
      if (x0 === null || x1 === null || x0 === x1) return;
      const y0 = Y - 34, rise = 30 + lv[k].L * 34, mx = (x0 + x1) / 2, yc = y0 - 2 * rise;
      const c = kc(m.c, k);
      s += `<path d="M${x0} ${y0} Q${mx} ${yc} ${x1} ${y0}" class="tl-arc ${c}"/>`;
      const a = Math.atan2(y0 - yc, x1 - mx), hs = 9;
      const p = (dx, dy) => `${(x1 + dx * Math.cos(a) - dy * Math.sin(a)).toFixed(1)} ${(y0 + dx * Math.sin(a) + dy * Math.cos(a)).toFixed(1)}`;
      s += `<path d="M${p(0, 0)} L${p(-hs, -hs * 0.55)} L${p(-hs, hs * 0.55)} Z" class="tl-arrowhead ${c}"/>`;
      if (m.label) arcLabels += `<text x="${mx}" y="${y0 - rise - 6}" class="tl-mlab" text-anchor="middle">${svgT(m.label)}</text>`;
    });
    s += arcLabels;
    spans.forEach((sp, k) => {
      const x0 = xt(sp.from), x1 = xt(sp.to);
      if (x0 === null || x1 === null) return;
      const y = Y + 44 + (sp.row || 0) * 36, c = kc(sp.c === undefined ? 1 : sp.c, k);
      s += `<path d="M${x0 + 2} ${y - 7} V${y} H${x1 - 2} V${y - 7}" class="tl-span ${c}"/>`;
      if (sp.label) s += `<text x="${(x0 + x1) / 2}" y="${y + 17}" class="tl-slab" text-anchor="middle">${svgT(sp.label)}</text>`;
    });
    s += `<text x="4" y="${Y + 25}" class="tl-unit">${esc(tl.unit || 't')}</text>`;
    s += '</svg>';
    return `<figure class="viz tl"><div class="viz-scroll">${s}</div></figure>`;
  }

  /* ---------------- table ---------------- */
  function table(tb, opts) {
    opts = opts || {};
    const r = (c) => RENDER.rich(String(c), opts);
    let h = '<figure class="viz"><div class="viz-scroll"><table class="qtable"><thead><tr>';
    tb.head.forEach((c) => { h += `<th scope="col">${r(c)}</th>`; });
    h += '</tr></thead><tbody>';
    tb.rows.forEach((row) => { h += '<tr>' + row.map((c, j) => (j === 0 ? `<th scope="row">${r(c)}</th>` : `<td>${r(c)}</td>`)).join('') + '</tr>'; });
    h += '</tbody></table></div>';
    if (tb.caption) h += `<figcaption>${r(tb.caption)}</figcaption>`;
    return h + '</figure>';
  }

  /* ---------------- helpers for plots ---------------- */
  function niceTicks(lo, hi, count) {
    const span = hi - lo || 1;
    const raw = span / (count || 5);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => span / k <= (count || 5) + 0.5) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function shortMoney(v) {
    const a = Math.abs(v), sgn = v < 0 ? '−' : '';
    if (a >= 1e9) return sgn + '$' + +(a / 1e9).toFixed(2) + 'b';
    if (a >= 1e6) return sgn + '$' + +(a / 1e6).toFixed(2) + 'm';
    if (a >= 1e4) return sgn + '$' + +(a / 1e3).toFixed(1) + 'k';
    return sgn + '$' + +a.toFixed(a < 10 ? 2 : 0);
  }
  let uid = 0;

  /* ---------------- NPV profile ---------------- */
  function npvChart(c) {
    const FIN = root.FIN;
    const projects = c.projects || [];
    const rMin = c.rMin || 0;
    let rMax = c.rMax;
    if (!rMax) {
      const irrs = projects.map((p) => FIN.irr(p.cfs)).filter(Number.isFinite);
      rMax = irrs.length ? Math.min(1, Math.max(0.1, Math.max(...irrs) * 1.35)) : 0.3;
    }
    const N = 80;
    const series = projects.map((p) => {
      const pts = [];
      for (let k = 0; k <= N; k++) { const r = rMin + ((rMax - rMin) * k) / N; pts.push([r, FIN.npv(r, p.cfs)]); }
      return { name: p.name, pts, cfs: p.cfs };
    });
    let yMin = Math.min(0, ...series.flatMap((s) => s.pts.map((p) => p[1])));
    let yMax = Math.max(0, ...series.flatMap((s) => s.pts.map((p) => p[1])));
    const pad = (yMax - yMin) * 0.08 || 1;
    yMin -= pad; yMax += pad;
    const W = 560, H = 300, mL = 66, mR = 92, mT = 14, mB = 46;
    const X = (r) => mL + ((r - rMin) / (rMax - rMin)) * (W - mL - mR);
    const Y = (v) => mT + (1 - (v - yMin) / (yMax - yMin)) * (H - mT - mB);
    const id = 'npv' + ++uid;
    let s = `<svg class="plot" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="NPV profile chart">`;
    niceTicks(yMin, yMax, 5).forEach((v) => {
      s += `<line x1="${mL}" y1="${Y(v)}" x2="${W - mR}" y2="${Y(v)}" class="grid"/>`;
      s += `<text x="${mL - 8}" y="${Y(v) + 4}" class="tick" text-anchor="end">${esc(shortMoney(v))}</text>`;
    });
    const xt = niceTicks(rMin, rMax, 6);
    xt.forEach((r) => { s += `<line x1="${X(r)}" y1="${H - mB}" x2="${X(r)}" y2="${H - mB + 5}" class="axis"/><text x="${X(r)}" y="${H - mB + 19}" class="tick" text-anchor="middle">${esc(+(r * 100).toFixed(1) + '%')}</text>`; });
    s += `<line x1="${mL}" y1="${Y(0)}" x2="${W - mR}" y2="${Y(0)}" class="zero"/>`;
    s += `<line x1="${mL}" y1="${H - mB}" x2="${W - mR}" y2="${H - mB}" class="axis"/>`;
    s += `<text x="${(mL + W - mR) / 2}" y="${H - 6}" class="axis-title" text-anchor="middle">Discount rate</text>`;
    s += `<text x="14" y="${(mT + H - mB) / 2}" class="axis-title" text-anchor="middle" transform="rotate(-90 14 ${(mT + H - mB) / 2})">NPV</text>`;
    series.forEach((se, k) => {
      const d = se.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
      s += `<path d="${d}" class="line s${k + 1}"/>`;
      const last = se.pts[se.pts.length - 1];
      s += `<line x1="${W - mR + 6}" y1="${Y(last[1])}" x2="${W - mR + 18}" y2="${Y(last[1])}" class="line s${k + 1}"/><text x="${W - mR + 22}" y="${Y(last[1]) + 4}" class="dlabel">${esc(se.name)}</text>`;
      if (c.showIRR) {
        const irr = FIN.irr(se.cfs);
        if (Number.isFinite(irr) && irr >= rMin && irr <= rMax) s += `<circle cx="${X(irr)}" cy="${Y(0)}" r="5" class="mark s${k + 1}"/>`;
      }
    });
    if (c.mark) { const mx = X(c.mark.r); s += `<line x1="${mx}" y1="${mT}" x2="${mx}" y2="${H - mB}" class="refline"/><text x="${mx + 5}" y="${mT + 12}" class="tick">${esc(c.mark.label || '')}</text>`; }
    s += `<line class="xhair" x1="0" y1="${mT}" x2="0" y2="${H - mB}" visibility="hidden"/>`;
    s += `<rect class="hit" x="${mL}" y="${mT}" width="${W - mL - mR}" height="${H - mT - mB}" fill="transparent" data-chart="npv" data-rmin="${rMin}" data-rmax="${rMax}" data-ml="${mL}" data-w="${W - mL - mR}"/>`;
    s += '</svg>';
    const legend = series.map((se, k) => `<span class="lg"><i class="sw s${k + 1}"></i>${esc(se.name)}</span>`).join('');
    const data = esc(JSON.stringify(projects.map((p) => ({ name: p.name, cfs: p.cfs }))));
    return `<figure class="viz plotwrap" data-npv="${data}">${series.length > 1 ? `<div class="legend">${legend}</div>` : ''}<div class="viz-scroll">${s}</div><div class="tip" hidden></div></figure>`;
  }

  /* ---------------- Security Market Line ---------------- */
  function smlChart(c) {
    const pts = c.points || [];
    const bMax = Math.max(2, ...pts.map((p) => p.beta + 0.3));
    const sml = (b) => c.rf + b * (c.rm - c.rf);
    const yHi = Math.max(sml(bMax), ...pts.map((p) => p.er)) + 0.02;
    const yLo = Math.min(0, ...pts.map((p) => p.er)) ;
    const W = 560, H = 300, mL = 58, mR = 40, mT = 14, mB = 46;
    const X = (b) => mL + (b / bMax) * (W - mL - mR);
    const Y = (v) => mT + (1 - (v - yLo) / (yHi - yLo)) * (H - mT - mB);
    let s = `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="Security Market Line chart">`;
    niceTicks(yLo, yHi, 5).forEach((v) => { s += `<line x1="${mL}" y1="${Y(v)}" x2="${W - mR}" y2="${Y(v)}" class="grid"/><text x="${mL - 8}" y="${Y(v) + 4}" class="tick" text-anchor="end">${esc(+(v * 100).toFixed(1) + '%')}</text>`; });
    niceTicks(0, bMax, 5).forEach((b) => { s += `<line x1="${X(b)}" y1="${H - mB}" x2="${X(b)}" y2="${H - mB + 5}" class="axis"/><text x="${X(b)}" y="${H - mB + 19}" class="tick" text-anchor="middle">${esc(String(+b.toFixed(2)))}</text>`; });
    s += `<line x1="${mL}" y1="${H - mB}" x2="${W - mR}" y2="${H - mB}" class="axis"/><line x1="${mL}" y1="${mT}" x2="${mL}" y2="${H - mB}" class="axis"/>`;
    s += `<text x="${(mL + W - mR) / 2}" y="${H - 6}" class="axis-title" text-anchor="middle">Beta (β)</text>`;
    s += `<text x="14" y="${(mT + H - mB) / 2}" class="axis-title" text-anchor="middle" transform="rotate(-90 14 ${(mT + H - mB) / 2})">Expected return</text>`;
    s += `<line x1="${X(0)}" y1="${Y(sml(0))}" x2="${X(bMax)}" y2="${Y(sml(bMax))}" class="line s1"/>`;
    s += `<text x="${X(bMax) - 4}" y="${Y(sml(bMax)) - 8}" class="dlabel" text-anchor="end">SML</text>`;
    s += `<path d="M${X(1)} ${Y(c.rm) - 7} l7 7 l-7 7 l-7 -7 z" class="mkt"/><text x="${X(1) + 10}" y="${Y(c.rm) + 18}" class="tick">M</text>`;
    s += `<text x="${X(0) + 6}" y="${Y(c.rf) - 7}" class="tick">r<tspan baseline-shift="sub" font-size="9">f</tspan></text>`;
    pts.forEach((p, k) => {
      const cls = 'pt' + (p.focus ? ' focus' : '') + (p.state ? ' ' + p.state : '');
      s += `<circle cx="${X(p.beta)}" cy="${Y(p.er)}" r="${p.focus ? 9 : 7}" class="${cls}" data-tip="${esc(`${p.name}: β = ${p.beta}, E(R) = ${+(p.er * 100).toFixed(2)}%`)}"/>`;
      if (p.name) s += `<text x="${X(p.beta) + 11}" y="${Y(p.er) - 9}" class="plabel">${esc(p.name)}</text>`;
    });
    s += '</svg>';
    return `<figure class="viz plotwrap"><div class="viz-scroll">${s}</div><div class="tip" hidden></div></figure>`;
  }

  /* ---------------- decision tree (HTML) ---------------- */
  function tree(t, opts) {
    const r = (x) => RENDER.rich(String(x || ''), opts || {});
    function node(n) {
      const kids = n.kids || [];
      let h = `<div class="tn tn-${n.t}"><div class="tn-box"><i class="tn-ico" aria-hidden="true"></i><span>${r(n.label || (n.t === 'decision' ? 'Decide' : n.t === 'chance' ? 'Chance' : ''))}</span></div>`;
      if (kids.length) h += '<div class="tn-kids">' + kids.map((k) => `<div class="tn-kid">${k.edge ? `<div class="tn-edge">${r(k.edge)}</div>` : ''}${node(k.node)}</div>`).join('') + '</div>';
      return h + '</div>';
    }
    return `<figure class="viz"><div class="viz-scroll"><div class="tree">${node(t)}</div></div><figcaption class="tree-key"><span><i class="tn-ico k-dec"></i> decision</span><span><i class="tn-ico k-chance"></i> chance</span><span><i class="tn-ico k-end"></i> outcome</span></figcaption></figure>`;
  }

  /** Render every visual aid present on a question. */
  function visuals(q, opts) {
    let h = '';
    if (q.viz && !(opts && opts.noViz) && root.VIZ) h += root.VIZ.render(q.viz, opts);
    if (q.tl) h += timeline(q.tl, opts);
    if (q.table) h += table(q.table, opts);
    if (q.chart && q.chart.type === 'npv') h += npvChart(q.chart);
    if (q.chart && q.chart.type === 'sml') h += smlChart(q.chart);
    if (q.tree) h += tree(q.tree, opts);
    return h;
  }

  /* ---------------- hover layer (delegated) ---------------- */
  function onMove(ev) {
    const hit = ev.target.closest && ev.target.closest('rect.hit[data-chart="npv"]');
    const fig = ev.target.closest && ev.target.closest('.plotwrap');
    if (!fig) return;
    const tip = fig.querySelector('.tip');
    if (hit) {
      const svg = hit.ownerSVGElement;
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
      const mL = +hit.dataset.ml, w = +hit.dataset.w, rMin = +hit.dataset.rmin, rMax = +hit.dataset.rmax;
      const r = Math.min(rMax, Math.max(rMin, rMin + ((loc.x - mL) / w) * (rMax - rMin)));
      const xh = svg.querySelector('.xhair');
      xh.setAttribute('x1', loc.x); xh.setAttribute('x2', loc.x); xh.setAttribute('visibility', 'visible');
      let projects = [];
      try { projects = JSON.parse(fig.dataset.npv || '[]'); } catch (e) { /* ignore */ }
      tip.innerHTML = `<b>r = ${(r * 100).toFixed(1)}%</b>` + projects.map((p, k) => `<span><i class="sw s${k + 1}"></i>${esc(p.name)}: ${esc(T.money(root.FIN.npv(r, p.cfs), 0))}</span>`).join('');
      tip.hidden = false;
      place(fig, tip, ev);
      return;
    }
    const dot = ev.target.closest && ev.target.closest('circle.pt[data-tip]');
    if (dot) { tip.textContent = dot.dataset.tip; tip.hidden = false; place(fig, tip, ev); return; }
    hide(fig);
  }
  function place(fig, tip, ev) {
    const b = fig.getBoundingClientRect();
    let x = ev.clientX - b.left + 14, y = ev.clientY - b.top + 14;
    if (x + 190 > b.width) x = Math.max(4, ev.clientX - b.left - 200);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hide(fig) {
    const tip = fig.querySelector('.tip'); if (tip) tip.hidden = true;
    const xh = fig.querySelector('.xhair'); if (xh) xh.setAttribute('visibility', 'hidden');
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', (e) => { const f = e.target.closest && e.target.closest('.plotwrap'); if (f) hide(f); }, true);
  }

  root.CHARTS = { timeline, table, npvChart, smlChart, tree, visuals, niceTicks };
})(typeof window !== 'undefined' ? window : globalThis);
