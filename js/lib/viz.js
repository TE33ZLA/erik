/* Corporate Ladder — pictures that explain an idea (lesson cards, and questions too).
 * A card or question may carry `viz`: one picture spec, or a list of specs shown side by side (they stack on phones).
 * Every spec has a `type` and a caption `cap` (rich text: what to notice). Optional: `title`, `alt` (a text description;
 * one is generated when it is missing).
 *
 * Types and their fields (docs/CONTENT_GUIDE.md "Pictures" has an example of each):
 *   bars       {bars:[{label, v} | {label, parts:[{v, c}]}], keys, fmt, dp, line:{v,label}, hi:[i], sign}
 *   lines      {x:{label,min,max,fmt,dp,ticks}, y:{…, hide, zero}, series:[{name, c, pts:[[x,y]], dash, dots, area, line}],
 *               marks:[{x,y,label,c,pos}], vlines:[{x,label}], hlines:[{y,label}], shade:[{x1,x2,c,label}]}
 *   scatter    {x, y, sets:[{name, c, pts, fit}]}
 *   bell       {curves:[{mean, sd, name, c}], fmt, band}
 *   waterfall  {steps:[{label, v} | {label, total:true}], fmt, dp}
 *   flow       {steps:[{t, s, icon, c}], links:['label'], dir:'row'|'col', op}
 *   compare    {items:[{icon, title, big, points, c, mark:'good'|'bad', markText}], vs}
 *   cards      {items:[{icon, t, s, c}]}
 *   split      {parts:[{label, v, c, show, note}], total, fmt} or {rows:[{label, parts}], scale:'abs'}
 *   grid100    {parts:[{n, c, label}]} (or {fill, c, label})
 *   pie        {parts:[{label, v, c}], center} or {pies:[{title, parts, center, scale}]}
 *   anatomy    {tex:'\\colA{FV} = \\colB{PV}(1+\\colC{r})^{\\colD{n}}', parts:[{sym, say}]}
 *   balance    {left:{icon, label, sub}, right:{…}, tilt:'left'|'right'|'level', note}
 *   seesaw     {left:{icon, label}, right:{icon, label}, down:'left'|'right'}
 *   cycle      {steps:[{t, icon, c}], center}
 *   numline    {min, max, fmt, dp, ticks, zones:[{from, to, c, label}], marks:[{v, label, c, below}]}
 *   tiscreen   {lines:[{in, out} | {say}]}
 *   tl         a cash-flow timeline (charts.js) with extra `moves:[{from,to,label,c}]`, `spans:[{from,to,label,c}]`, `dim:[t]`
 *   table, tree, npv, sml   the existing charts (charts.js)
 * Colours `c`: 1 blue, 2 orange, 3 aqua, 4 yellow, 5 pink, 'good' green, 'bad' red, 'grey'. Use at most three of 1–5 in
 * one picture. SVG labels are plain text: simple LaTeX (\(…\), \times, \$, {,}, ^{n}, _{E}) is converted for you.
 * In rich text, [[ctrl]] draws a calculator key.
 */
(function (root) {
  'use strict';
  const RENDER = root.RENDER;
  const esc = RENDER.esc;

  /* ---------------- helpers ---------------- */
  const KC = { 1: 'k1', 2: 'k2', 3: 'k3', 4: 'k4', 5: 'k5', good: 'kg', bad: 'kb', grey: 'kn', gray: 'kn' };
  const kc = (c, i) => KC[c] || KC[((i || 0) % 3) + 1];
  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  /** A number for a label. fmt: '$' money, '%' percentage points (8.5 -> 8.5%), 'x' times, anything else a plain number. */
  function num(v, fmt, dp) {
    if (!isNum(v)) return v === undefined || v === null ? '' : String(v);
    const a = Math.abs(v);
    const need = (x, most) => { for (let k = 0; k < most; k++) if (Math.abs(x * 10 ** k - Math.round(x * 10 ** k)) < 1e-7) return k; return most; };
    const d = dp !== undefined ? dp : fmt === '$' ? (a >= 100 ? 0 : need(a, 2) ? 2 : 0) : need(a, a < 10 ? 2 : 1);
    let s = a.toLocaleString('en-AU', { minimumFractionDigits: d, maximumFractionDigits: d });
    if (fmt === '$') s = '$' + s;
    else if (fmt === '%') s += '%';
    else if (fmt === 'x') s = '×' + s;
    return (v < 0 && +a.toFixed(d) !== 0 ? '−' : '') + s;
  }

  /** Simple LaTeX -> plain text for SVG labels. Superscripts and subscripts become marked runs: \u0001 sup, \u0002 sub, \u0003 end. */
  function lite(s) {
    let t = String(s === undefined || s === null ? '' : s);
    t = t.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\{,\}/g, ',').replace(/\\\$/g, '$').replace(/\\%/g, '%').replace(/\\[,;:! ]/g, ' ');
    const W = { times: '×', cdot: '·', div: '÷', pm: '±', approx: '≈', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', to: '→', rightarrow: '→', Rightarrow: '⇒', infty: '∞', Delta: 'Δ', sigma: 'σ', beta: 'β', rho: 'ρ', mu: 'μ', alpha: 'α', pi: 'π', lambda: 'λ', sum: 'Σ', ldots: '…', dots: '…', cdots: '⋯', quad: '  ', qquad: '   ', left: '', right: '', big: '', Big: '', displaystyle: '', ' ': ' ' };
    t = t.replace(/\\(?:text|mathrm|textbf|mathbf|operatorname)\{([^{}]*)\}/g, '$1');
    t = t.replace(/\\d?t?frac\{([^{}]*)\}\{([^{}]*)\}/g, (m, a, b) => `${a.length > 1 ? '(' + a + ')' : a}/${b.length > 1 ? '(' + b + ')' : b}`);
    t = t.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
    t = t.replace(/\\([A-Za-z]+)/g, (m, w) => (w in W ? W[w] : m));
    t = t.replace(/\^\{([^{}]*)\}|\^(\S)/g, (m, a, b) => '\u0001' + (a !== undefined ? a : b) + '\u0003');
    t = t.replace(/_\{([^{}]*)\}|_([A-Za-z0-9])/g, (m, a, b) => '\u0002' + (a !== undefined ? a : b) + '\u0003');
    return t.replace(/[{}]/g, '');
  }
  /** SVG text content (escaped) with raised/lowered runs as tspans (dy works in every browser). */
  function svgT(s) {
    const t = lite(s);
    let out = '', shift = 0, i = 0;
    const re = /\u0001([^\u0003]*)\u0003|\u0002([^\u0003]*)\u0003/g;
    let m;
    while ((m = re.exec(t))) {
      const before = t.slice(i, m.index);
      if (before) { out += shift ? `<tspan dy="${-shift}">${esc(before)}</tspan>` : esc(before); shift = 0; }
      const up = m[1] !== undefined;
      const d = up ? -5 : 4;
      out += `<tspan dy="${d - shift}" font-size="75%">${esc(up ? m[1] : m[2])}</tspan>`;
      shift = d;
      i = re.lastIndex;
    }
    const rest = t.slice(i);
    if (rest) out += shift ? `<tspan dy="${-shift}">${esc(rest)}</tspan>` : esc(rest);
    return out;
  }
  /** Plain text for descriptions and read-aloud. */
  function plain(s) { return lite(s).replace(/\u0001/g, '^').replace(/\u0002/g, '').replace(/\u0003/g, '').replace(/\s+/g, ' ').trim(); }
  /** Rich text (LaTeX via KaTeX, **bold**) with [[key]] drawn as a calculator key. */
  function vrich(s, opts) {
    if (s === undefined || s === null || s === '') return '';
    return String(s).split(/\[\[([^\]]{1,24})\]\]/).map((part, i) => (i % 2 ? `<kbd>${esc(part)}</kbd>` : RENDER.rich(part, opts || { highlight: false }))).join('');
  }
  /** Split a label into lines: explicit \n, else words wrapped at about `max` characters. */
  function wrapLines(s, max) {
    const t = String(s === undefined || s === null ? '' : s);
    if (t.indexOf('\n') >= 0) return t.split('\n');
    if (plain(t).length <= max) return [t];
    const words = t.split(' ');
    const lines = [];
    let cur = '';
    words.forEach((w) => { if (cur && plain(cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
    if (cur) lines.push(cur);
    return lines;
  }
  function textLines(x, y, s, cls, max, lh, anchor) {
    return wrapLines(s, max).map((ln, k) => `<text x="${r1(x)}" y="${r1(y + k * (lh || 16))}" class="${cls}" text-anchor="${anchor || 'middle'}">${svgT(ln)}</text>`).join('');
  }
  const r1 = (v) => Math.round(v * 10) / 10;
  function niceTicks(lo, hi, count) {
    if (root.CHARTS && root.CHARTS.niceTicks) return root.CHARTS.niceTicks(lo, hi, count);
    const span = hi - lo || 1, raw = span / (count || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((k) => span / k <= (count || 5) + 0.5) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function svg(W, H, inner, alt, cls) {
    W = Math.round(W); H = Math.round(H);
    return `<div class="viz-scroll"><svg class="vz-svg${cls ? ' ' + cls : ''}" viewBox="0 0 ${W} ${H}" style="min-width:${Math.round(W * 0.62)}px;max-width:${Math.round(W * 1.3)}px" role="img" aria-label="${esc(alt)}">${inner}</svg></div>`;
  }
  function legend(keys) {
    if (!keys || !keys.length) return '';
    return `<ul class="vz-key">${keys.map((k, i) => `<li class="${kc(k.c, i)}"><i class="sw${k.dash ? ' dash' : ''}${k.dot ? ' dot' : ''}" aria-hidden="true"></i><span>${vrich(k.label)}</span></li>`).join('')}</ul>`;
  }
  /** A small arrowhead at (x, y) pointing along angle a (radians). */
  function head(x, y, a, cls, size) {
    const s = size || 9;
    const p = (dx, dy) => `${r1(x + dx * Math.cos(a) - dy * Math.sin(a))} ${r1(y + dx * Math.sin(a) + dy * Math.cos(a))}`;
    return `<path d="M${p(0, 0)} L${p(-s, -s * 0.55)} L${p(-s, s * 0.55)} Z" class="${cls || 'vz-head'}"/>`;
  }

  /* ---------------- bars ---------------- */
  function bars(s) {
    const B = s.bars || [];
    const n = B.length;
    const tot = B.map((b) => (b.parts ? sum(b.parts.map((p) => +p.v || 0)) : +b.v || 0));
    const extra = s.line ? [s.line.v] : [];
    let hi = Math.max(0, ...tot, ...extra), lo = Math.min(0, ...tot, ...extra);
    if (s.max !== undefined) hi = s.max;
    if (s.min !== undefined) lo = s.min;
    if (hi === lo) hi = lo + 1;
    if (lo < 0 && s.min === undefined) lo -= (hi - lo) * 0.14;
    const small = s._small;
    const longWord = Math.max(3, ...B.map((b) => Math.max(...String(b.label === undefined ? '' : b.label).split(/[\s\n]+/).map((w) => plain(w).length))));
    const base = (n <= 2 ? 110 : n <= 3 ? 96 : n <= 5 ? 76 : n <= 8 ? 60 : 48) * (small ? 0.8 : 1);
    const slot = Math.min(124, Math.max(base, longWord * 7.8 + 12));
    const labMax = Math.max(5, Math.floor((slot - 6) / 7.8));
    const labLines = Math.max(1, ...B.map((b) => wrapLines(b.label, labMax).length));
    const mL = 12, mR = s.line && s.line.label ? 24 + Math.min(120, plain(s.line.label).length * 9) : 12;
    const mT = 26, plotH = s.h || 160, mB = 14 + 17 * labLines;
    const W = mL + slot * n + mR, H = mT + plotH + mB;
    const Y = (v) => mT + ((hi - v) / (hi - lo)) * plotH;
    const bw = Math.min(50, slot * 0.62);
    const hiSet = new Set(s.hi || []);
    const labs = B.map((b, i) => (b.note !== undefined ? b.note : s.values === false ? '' : num(tot[i], s.fmt, s.dp)));
    const widest = Math.max(1, ...labs.map((l) => plain(l).length));
    const valCls = widest * 10 <= slot - 6 ? 'vz-val' : 'vz-val sm';
    const thin = widest * 7.9 > slot - 4 && s.values !== 'all';
    let g = '';
    B.forEach((b, i) => {
      const cx = mL + slot * i + slot / 2, x = cx - bw / 2;
      const dim = hiSet.size && !hiSet.has(i) ? ' dim' : '';
      if (b.parts) {
        let acc = 0;
        b.parts.forEach((p, j) => {
          const v = +p.v || 0;
          if (!v) return;
          const y1 = Y(acc + v), y0 = Y(acc);
          g += `<rect x="${r1(x)}" y="${r1(Math.min(y0, y1))}" width="${r1(bw)}" height="${r1(Math.max(1.5, Math.abs(y0 - y1)))}" rx="3" class="vz-fill ${kc(p.c, j)}${dim}"/>`;
          acc += v;
        });
      } else {
        const v = +b.v || 0;
        const c = b.c !== undefined ? b.c : v < 0 && s.sign !== false ? 'bad' : s.c !== undefined ? s.c : s.sign ? 'good' : 1;
        const y1 = Y(Math.max(v, 0)), y0 = Y(Math.min(v, 0));
        g += `<rect x="${r1(x)}" y="${r1(y1)}" width="${r1(bw)}" height="${r1(Math.max(1.5, y0 - y1))}" rx="3" class="vz-fill ${kc(c, 0)}${dim}"/>`;
      }
      const t = tot[i];
      const lab = labs[i];
      const show = !thin || b.note !== undefined || hiSet.has(i) || i === 0 || i === n - 1 || (n > 4 && i % 2 === 0 && n - 1 - i >= 2);
      if (lab !== '' && show) g += `<text x="${r1(cx)}" y="${r1(t >= 0 ? Y(t) - 8 : Y(t) + 18)}" class="${valCls}${dim}" text-anchor="middle">${svgT(lab)}</text>`;
      g += textLines(cx, mT + plotH + 20, b.label, 'vz-cat' + dim, labMax, 17);
    });
    g = `<line x1="${mL - 4}" x2="${r1(mL + slot * n + 4)}" y1="${r1(Y(0))}" y2="${r1(Y(0))}" class="vz-base"/>` + g;
    if (s.line) {
      const y = Y(s.line.v);
      g += `<line x1="${mL - 4}" x2="${r1(mL + slot * n + 6)}" y1="${r1(y)}" y2="${r1(y)}" class="vz-ref"/>`;
      if (s.line.label) g += `<text x="${r1(mL + slot * n + 10)}" y="${r1(y + 5)}" class="vz-reflab">${svgT(s.line.label)}</text>`;
    }
    return svg(W, H, g, describe(s)) + legend(s.keys);
  }

  /* ---------------- line charts (and scatter, bell) ---------------- */
  function lines(s) {
    const X = s.x || {}, YA = s.y || {};
    const series = (s.series || []).filter((se) => se.pts && se.pts.length);
    const xs = series.flatMap((se) => se.pts.map((p) => p[0])).concat((s.marks || []).map((m) => m.x), (s.vlines || []).map((v) => v.x), (s.shade || []).flatMap((b) => [b.x1, b.x2])).filter(isNum);
    const ys = series.flatMap((se) => se.pts.map((p) => p[1])).concat((s.marks || []).map((m) => m.y), (s.hlines || []).map((h) => h.y)).filter(isNum);
    let x0 = X.min !== undefined ? X.min : Math.min(...xs), x1 = X.max !== undefined ? X.max : Math.max(...xs);
    let y0 = YA.min !== undefined ? YA.min : Math.min(...ys), y1 = YA.max !== undefined ? YA.max : Math.max(...ys);
    if (YA.zero) { y0 = Math.min(0, y0); y1 = Math.max(0, y1); }
    if (x1 === x0) x1 = x0 + 1;
    if (y1 === y0) y1 = y0 + 1;
    const pad = (y1 - y0) * 0.08;
    if (YA.min === undefined && !(YA.zero && y0 === 0)) y0 -= pad;
    if (YA.max === undefined) y1 += pad;
    const xt = X.ticks || niceTicks(x0, x1, s.xTicks || 5), yt = YA.hide ? [] : YA.ticks || niceTicks(y0, y1, 4);
    const yLab = (v) => num(v, YA.fmt, YA.dp);
    const W = s.w || (s._small ? 260 : 400), H = s.h || (s._small ? 220 : 250);
    const mL = YA.hide ? 16 : 14 + Math.max(...yt.map((v) => yLab(v).length), 2) * 8;
    const hasEnd = series.some((se) => se.name && se.label !== false) && s.endLabels !== false;
    const endW = hasEnd ? Math.min(140, 26 + Math.max(...series.map((se) => plain(se.name || '').length)) * 8.4) : 0;
    const mR = 18 + endW, mT = (YA.label ? 30 : 16) + ((s.vlines || []).some((v) => v.label) ? 18 : 0), mB = 30 + (X.label ? 22 : 0);
    const PX = (v) => mL + ((v - x0) / (x1 - x0)) * (W - mL - mR);
    const PY = (v) => mT + ((y1 - v) / (y1 - y0)) * (H - mT - mB);
    let g = '';
    (s.shade || []).forEach((b, i) => {
      const a = PX(Math.max(x0, b.x1)), z = PX(Math.min(x1, b.x2));
      g += `<rect x="${r1(a)}" y="${mT}" width="${r1(Math.max(0, z - a))}" height="${r1(H - mT - mB)}" class="vz-band ${kc(b.c, i)}"/>`;
      if (b.label) g += `<text x="${r1((a + z) / 2)}" y="${mT + 16}" class="vz-reflab halo" text-anchor="middle">${svgT(b.label)}</text>`;
    });
    yt.forEach((v) => { g += `<line x1="${mL}" x2="${W - mR}" y1="${r1(PY(v))}" y2="${r1(PY(v))}" class="vz-grid"/><text x="${mL - 7}" y="${r1(PY(v) + 4.5)}" class="vz-tick" text-anchor="end">${esc(yLab(v))}</text>`; });
    const base = YA.hide ? H - mB : PY(Math.max(y0, Math.min(y1, 0)));
    g += `<line x1="${mL}" x2="${W - mR}" y1="${r1(H - mB)}" y2="${r1(H - mB)}" class="vz-axis"/>`;
    if (!YA.hide && y0 < 0 && y1 > 0) g += `<line x1="${mL}" x2="${W - mR}" y1="${r1(PY(0))}" y2="${r1(PY(0))}" class="vz-zero"/>`;
    if (!YA.hide) g += `<line x1="${mL}" x2="${mL}" y1="${mT}" y2="${r1(H - mB)}" class="vz-axis"/>`;
    xt.forEach((v) => { g += `<line x1="${r1(PX(v))}" x2="${r1(PX(v))}" y1="${r1(H - mB)}" y2="${r1(H - mB + 5)}" class="vz-axis"/><text x="${r1(PX(v))}" y="${r1(H - mB + 20)}" class="vz-tick" text-anchor="middle">${esc(num(v, X.fmt, X.dp))}</text>`; });
    if (X.label) g += `<text x="${r1((mL + W - mR) / 2)}" y="${H - 6}" class="vz-axt" text-anchor="middle">${svgT(X.label)}</text>`;
    if (YA.label) g += `<text x="${mL - (YA.hide ? 0 : 6)}" y="16" class="vz-axt" text-anchor="start">${svgT(YA.label)}</text>`;
    (s.hlines || []).forEach((h) => {
      g += `<line x1="${mL}" x2="${W - mR}" y1="${r1(PY(h.y))}" y2="${r1(PY(h.y))}" class="vz-ref"/>`;
      if (h.label) g += `<text x="${W - mR - 4}" y="${r1(PY(h.y) - 6)}" class="vz-reflab" text-anchor="end">${svgT(h.label)}</text>`;
    });
    (s.vlines || []).forEach((v) => {
      g += `<line x1="${r1(PX(v.x))}" x2="${r1(PX(v.x))}" y1="${mT}" y2="${r1(H - mB)}" class="vz-ref"/>`;
      if (v.label) g += `<text x="${r1(PX(v.x))}" y="${mT - 6}" class="vz-reflab" text-anchor="middle">${svgT(v.label)}</text>`;
    });
    const colOf = (se, i) => (se.c !== undefined ? se.c : (i % 3) + 1);
    series.forEach((se, i) => {
      const c = kc(colOf(se, i), i);
      const pts = se.pts.filter((p) => isNum(p[0]) && isNum(p[1]));
      const d = pts.map((p, k) => `${k ? 'L' : 'M'}${r1(PX(p[0]))} ${r1(PY(p[1]))}`).join(' ');
      if (se.area) g += `<path d="${d} L${r1(PX(pts[pts.length - 1][0]))} ${r1(base)} L${r1(PX(pts[0][0]))} ${r1(base)} Z" class="vz-area ${c}"/>`;
      if (se.line !== false) g += `<path d="${d}" class="vz-line ${c}${se.dash ? ' dash' : ''}"/>`;
      if (se.dots) pts.forEach((p) => { g += `<circle cx="${r1(PX(p[0]))}" cy="${r1(PY(p[1]))}" r="4.5" class="vz-dot ${c}"/>`; });
      if (hasEnd && se.name && se.label !== false) {
        const lp = pts[pts.length - 1];
        const lx = PX(lp[0]) + 8, ly = PY(lp[1]) + (se.labelDy || 0) + 4.5;
        g += `<circle cx="${r1(lx + 4)}" cy="${r1(ly - 4.5)}" r="4" class="vz-dot ${c}"/><text x="${r1(lx + 12)}" y="${r1(ly)}" class="vz-endlab">${svgT(se.name)}</text>`;
      }
    });
    (s.marks || []).forEach((m, i) => {
      const x = PX(m.x), y = PY(m.y);
      g += `<circle cx="${r1(x)}" cy="${r1(y)}" r="6" class="vz-dot big ${kc(m.c === undefined ? 2 : m.c, i)}"/>`;
      if (m.label) {
        const w = plain(m.label).length * 8.6;
        let pos = m.pos || 'above';
        if (pos === 'left' && x - 10 - w < 2) pos = x + 10 + w < W - 2 ? 'right' : 'above';
        if (pos === 'right' && x + 10 + w > W - 2) pos = x - 10 - w > 2 ? 'left' : 'above';
        let lx = pos === 'left' ? x - 10 : pos === 'right' ? x + 10 : Math.max(w / 2 + 3, Math.min(W - w / 2 - 3, x));
        const ly = pos === 'below' ? y + 22 : pos === 'left' || pos === 'right' ? y + 5 : y - 12;
        g += `<text x="${r1(lx)}" y="${r1(ly)}" class="vz-mlab" text-anchor="${pos === 'left' ? 'end' : pos === 'right' ? 'start' : 'middle'}">${svgT(m.label)}</text>`;
      }
    });
    const named = series.map((se, i) => ({ se, c: colOf(se, i) })).filter((x) => x.se.name);
    const keys = s.keys || (named.length >= 2 ? named.map((x) => ({ c: x.c, label: x.se.name, dash: x.se.dash, dot: x.se.line === false })) : null);
    return svg(W, H, g, describe(s)) + legend(keys);
  }
  function scatter(s) {
    const sets = s.sets || s.series || [];
    const series = [];
    sets.forEach((se, i) => {
      const c = se.c === undefined ? i + 1 : se.c;
      series.push(Object.assign({}, se, { c, line: false, dots: true, label: false }));
      if (se.fit && se.pts.length > 1) {
        const n = se.pts.length, mx = sum(se.pts.map((p) => p[0])) / n, my = sum(se.pts.map((p) => p[1])) / n;
        const sxx = sum(se.pts.map((p) => (p[0] - mx) ** 2)), sxy = sum(se.pts.map((p) => (p[0] - mx) * (p[1] - my)));
        const b = sxx ? sxy / sxx : 0, a = my - b * mx;
        const lo = Math.min(...se.pts.map((p) => p[0])), hi = Math.max(...se.pts.map((p) => p[0]));
        series.push({ c, dash: true, label: false, pts: [[lo, a + b * lo], [hi, a + b * hi]] });
      }
    });
    const keys = sets.length >= 2 ? sets.map((se, i) => ({ c: se.c === undefined ? i + 1 : se.c, label: se.name, dot: true })) : null;
    return lines(Object.assign({}, s, { series, keys: s.keys || keys, endLabels: false }));
  }
  function bell(s) {
    const cs = s.curves || [];
    const lo = s.x && s.x.min !== undefined ? s.x.min : Math.min(...cs.map((c) => c.mean - 3.3 * c.sd));
    const hi = s.x && s.x.max !== undefined ? s.x.max : Math.max(...cs.map((c) => c.mean + 3.3 * c.sd));
    const series = cs.map((c, i) => ({ name: c.name, c: c.c === undefined ? i + 1 : c.c, area: true, dash: c.dash,
      pts: Array.from({ length: 97 }, (_, k) => { const x = lo + ((hi - lo) * k) / 96; return [x, Math.exp(-0.5 * ((x - c.mean) / c.sd) ** 2) / (c.sd * Math.sqrt(2 * Math.PI))]; }) }));
    const means = [...new Set(cs.map((c) => c.mean))];
    const vl = s.meanLine === false ? [] : means.map((m) => ({ x: m, label: s.meanLabel !== undefined ? s.meanLabel : 'mean ' + num(m, s.fmt || '%', s.dp) }));
    const shade = s.band && cs[0] ? [{ x1: cs[0].mean - cs[0].sd, x2: cs[0].mean + cs[0].sd, c: cs[0].c === undefined ? 1 : cs[0].c, label: s.bandLabel || '' }] : [];
    return lines(Object.assign({}, s, { series, endLabels: false, x: Object.assign({ min: lo, max: hi, fmt: s.fmt || '%' }, s.x || {}), y: { hide: true, min: 0 }, vlines: (s.vlines || []).concat(vl), shade: (s.shade || []).concat(shade) }));
  }

  /* ---------------- waterfall ---------------- */
  function waterfall(s) {
    const St = s.steps || [];
    let run = 0;
    const rows = St.map((st) => {
      if (st.total) { const v = st.v !== undefined ? st.v : run; run = v; return Object.assign({}, st, { a: 0, b: v, v }); }
      const a = run; run += +st.v || 0; return Object.assign({}, st, { a, b: run });
    });
    const all = rows.flatMap((r) => [r.a, r.b]);
    let hi = Math.max(0, ...all), lo = Math.min(0, ...all);
    if (hi === lo) hi = lo + 1;
    if (rows.some((r) => !r.total && r.v < 0)) lo -= (hi - lo) * 0.12;
    const n = rows.length;
    const longWord = Math.max(3, ...rows.map((r) => Math.max(...String(r.label === undefined ? '' : r.label).split(/[\s\n]+/).map((w) => plain(w).length))));
    const slot = Math.min(124, Math.max(n <= 4 ? 90 : n <= 6 ? 72 : 58, longWord * 7.8 + 12)), bw = Math.min(50, slot * 0.64);
    const labMax = Math.max(5, Math.floor((slot - 6) / 7.8));
    const labLines = Math.max(1, ...rows.map((r) => wrapLines(r.label, labMax).length));
    const mL = 12, mR = 12, mT = 26, plotH = s.h || 170, mB = 14 + 17 * labLines;
    const W = mL + slot * n + mR, H = mT + plotH + mB + 6;
    const Y = (v) => mT + ((hi - v) / (hi - lo)) * plotH;
    let g = `<line x1="${mL - 4}" x2="${r1(W - mR + 4)}" y1="${r1(Y(0))}" y2="${r1(Y(0))}" class="vz-base"/>`;
    rows.forEach((r, i) => {
      const cx = mL + slot * i + slot / 2, x = cx - bw / 2;
      const c = r.c !== undefined ? r.c : r.total ? 1 : r.v >= 0 ? 'good' : 'bad';
      const top = Y(Math.max(r.a, r.b)), bot = Y(Math.min(r.a, r.b));
      g += `<rect x="${r1(x)}" y="${r1(top)}" width="${r1(bw)}" height="${r1(Math.max(1.5, bot - top))}" rx="3" class="vz-fill ${kc(c, 0)}"/>`;
      if (i < n - 1) g += `<line x1="${r1(x + bw)}" x2="${r1(x + slot)}" y1="${r1(Y(r.b))}" y2="${r1(Y(r.b))}" class="vz-conn"/>`;
      const lab = r.note !== undefined ? r.note : r.total ? num(r.v, s.fmt, s.dp) : (r.v >= 0 ? '+' : '') + num(r.v, s.fmt, s.dp);
      const up = r.v >= 0;
      g += `<text x="${r1(cx)}" y="${r1(up ? top - 8 : bot + 18)}" class="vz-val" text-anchor="middle">${svgT(lab)}</text>`;
      g += textLines(cx, mT + plotH + 26, r.label, 'vz-cat', labMax, 17);
    });
    return svg(W, H, g, describe(s)) + legend(s.keys);
  }

  /* ---------------- grid of 100 squares ---------------- */
  function grid100(s) {
    const parts = s.parts || [{ n: s.fill || 0, c: s.c === undefined ? 2 : s.c, label: s.label }];
    const cells = [];
    parts.forEach((p, j) => { for (let k = 0; k < Math.round(p.n); k++) cells.push(kc(p.c === undefined ? j + 1 : p.c, j)); });
    const sz = 22, gap = 4;
    let g = '';
    for (let i = 0; i < 100; i++) {
      const x = 2 + (i % 10) * (sz + gap), y = 2 + Math.floor(i / 10) * (sz + gap);
      g += `<rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="4" class="vz-cell${cells[i] ? ' on ' + cells[i] : ''}"/>`;
    }
    const W = 4 + 10 * sz + 9 * gap;
    const keys = parts.filter((p) => p.label).map((p, j) => ({ c: p.c === undefined ? j + 1 : p.c, label: p.label }));
    return `<div class="vz-g100">${svg(W, W, g, describe(s), 'sq')}${legend(keys)}</div>`;
  }

  /* ---------------- flow of steps ---------------- */
  function flow(s) {
    const st = s.steps || [], links = s.links || [];
    const many = st.length >= 3 ? ' many' : '';
    let h = `<div class="vz-flow ${s.dir === 'col' ? 'col' : 'row'}${many}${s.op ? ' op' : ''}" role="img" aria-label="${esc(describe(s))}">`;
    st.forEach((x, i) => {
      if (i) {
        const l = links[i - 1];
        h += `<div class="vz-link">${s.op ? '' : '<span class="ar-r" aria-hidden="true">→</span><span class="ar-d" aria-hidden="true">↓</span>'}${l ? `<span class="vz-lab">${vrich(l)}</span>` : ''}</div>`;
      }
      h += `<div class="vz-step ${kc(x.c !== undefined ? x.c : s.c !== undefined ? s.c : 1, 0)}">${x.icon ? `<span class="vz-ico" aria-hidden="true">${esc(x.icon)}</span>` : ''}${x.t !== undefined ? `<b class="vz-t">${vrich(x.t)}</b>` : ''}${x.s ? `<span class="vz-s">${vrich(x.s)}</span>` : ''}</div>`;
    });
    return h + '</div>';
  }

  /* ---------------- compare side by side ---------------- */
  function compare(s) {
    const it = s.items || [];
    const cell = (x, i) => `<div class="vz-item ${kc(x.c !== undefined ? x.c : i + 1, i)}${x.mark ? ' m-' + x.mark : ''}">${x.icon ? `<div class="vz-ico" aria-hidden="true">${esc(x.icon)}</div>` : ''}${x.title ? `<b class="vz-it">${vrich(x.title)}</b>` : ''}${x.big !== undefined ? `<div class="vz-big">${vrich(x.big)}</div>` : ''}${x.points && x.points.length ? `<ul>${x.points.map((p) => `<li>${vrich(p)}</li>`).join('')}</ul>` : ''}${x.mark === 'good' || x.mark === 'bad' ? `<span class="vz-mark"><span aria-hidden="true">${x.mark === 'good' ? '✓' : '✗'}</span> ${vrich(x.markText || (x.mark === 'good' ? 'Yes' : 'No'))}</span>` : ''}</div>`;
    const vs = s.vs !== false && it.length === 2;
    return `<div class="vz-compare n${it.length}${vs ? ' has-vs' : ''}">${vs ? cell(it[0], 0) + `<div class="vz-vs" aria-hidden="true">${esc(s.vsText || 'vs')}</div>` + cell(it[1], 1) : it.map(cell).join('')}</div>`;
  }

  /* ---------------- icon cards ---------------- */
  function cards(s) {
    const it = s.items || [];
    return `<div class="vz-cards n${it.length}">${it.map((x, i) => `<div class="vz-card ${kc(x.c !== undefined ? x.c : s.c !== undefined ? s.c : i + 1, i)}">${x.icon ? `<span class="vz-ico" aria-hidden="true">${esc(x.icon)}</span>` : ''}<b>${vrich(x.t)}</b>${x.s ? `<span class="vz-cs">${vrich(x.s)}</span>` : ''}</div>`).join('')}</div>`;
  }

  /* ---------------- one bar split into parts ---------------- */
  function splitRow(parts, s, width) {
    const T = sum(parts.map((p) => Math.abs(+p.v || 0))) || 1;
    return `<div class="vz-bar" style="width:${width || 100}%">${parts.map((p, i) => {
      const share = Math.abs(+p.v || 0) / T;
      const txt = p.show !== undefined ? p.show : num(+p.v, s.fmt, s.dp);
      return `<span class="vz-seg ${kc(p.c !== undefined ? p.c : i + 1, i)}" style="flex:${Math.abs(+p.v || 0)} 1 0">${share >= 0.2 && txt !== '' ? `<b>${vrich(txt)}</b>` : ''}</span>`;
    }).join('')}</div>`;
  }
  function split(s) {
    const rows = s.rows || [{ parts: s.parts || [] }];
    const totals = rows.map((r) => sum(r.parts.map((p) => Math.abs(+p.v || 0))));
    const big = Math.max(...totals) || 1;
    const first = rows[0].parts;
    const keys = `<ul class="vz-key">${first.map((p, i) => `<li class="${kc(p.c !== undefined ? p.c : i + 1, i)}"><i class="sw" aria-hidden="true"></i><span>${vrich(p.label)}${rows.length === 1 && (p.show !== undefined || p.v !== undefined) ? ` <b>${vrich(p.show !== undefined ? p.show : num(+p.v, s.fmt, s.dp))}</b>` : ''}${p.note ? ` <span class="vz-note">${vrich(p.note)}</span>` : ''}</span></li>`).join('')}</ul>`;
    const body = rows.map((r, k) => `${r.label ? `<div class="vz-rowlab">${vrich(r.label)}</div>` : ''}${splitRow(r.parts, s, s.scale === 'abs' ? (totals[k] / big) * 100 : 100)}`).join('');
    return `<div class="vz-split" role="img" aria-label="${esc(describe(s))}">${s.total ? `<div class="vz-total">${vrich(s.total)}</div>` : ''}${body}${keys}</div>`;
  }

  /* ---------------- pie (donut) ---------------- */
  function onePie(p, s) {
    const P = p.parts || [];
    const T = sum(P.map((x) => Math.abs(+x.v || 0))) || 1;
    const k = Math.max(0.5, Math.min(1.25, p.scale || 1));
    const R = 74 * k, r = R * 0.56, C = 90;
    let a0 = -Math.PI / 2, g = '';
    const pt = (rad, a) => `${r1(C + rad * Math.cos(a))} ${r1(C + rad * Math.sin(a))}`;
    P.forEach((x, i) => {
      const f = Math.abs(+x.v || 0) / T;
      if (!f) return;
      const cls = `vz-slice ${kc(x.c !== undefined ? x.c : i + 1, i)}`;
      if (f >= 0.9999) { g += `<circle cx="${C}" cy="${C}" r="${r1((R + r) / 2)}" class="${cls} ring" style="stroke-width:${r1(R - r)}px"/>`; return; }
      const a1 = a0 + f * 2 * Math.PI, lg = f > 0.5 ? 1 : 0;
      g += `<path d="M${pt(R, a0)} A${r1(R)} ${r1(R)} 0 ${lg} 1 ${pt(R, a1)} L${pt(r, a1)} A${r1(r)} ${r1(r)} 0 ${lg} 0 ${pt(r, a0)} Z" class="${cls}"/>`;
      a0 = a1;
    });
    if (p.center) g += textLines(C, C + 5 - (wrapLines(p.center, 10).length - 1) * 8, p.center, 'vz-pie-c', 10, 16);
    const keys = `<ul class="vz-key col">${P.map((x, i) => `<li class="${kc(x.c !== undefined ? x.c : i + 1, i)}"><i class="sw" aria-hidden="true"></i><span>${vrich(x.label)}${x.show !== undefined || x.v !== undefined ? ` <b>${vrich(x.show !== undefined ? x.show : num(+x.v, s.fmt, s.dp))}</b>` : ''}</span></li>`).join('')}</ul>`;
    return `<div class="vz-pie">${p.title ? `<b class="vz-pie-t">${vrich(p.title)}</b>` : ''}<svg class="vz-svg" viewBox="0 0 180 180" style="max-width:${Math.round(200 * k)}px" role="img" aria-label="${esc(P.map((x) => plain(x.label) + ' ' + (x.show !== undefined ? plain(x.show) : num(+x.v, s.fmt, s.dp))).join(', '))}">${g}</svg>${keys}</div>`;
  }
  function pie(s) {
    const pies = s.pies || [{ parts: s.parts, center: s.center, title: s.pieTitle }];
    return `<div class="vz-pies n${pies.length}">${pies.map((p) => onePie(p, s)).join(pies.length === 2 && s.arrow ? `<div class="vz-pies-ar" aria-hidden="true">${esc(s.arrow)}</div>` : '')}</div>`;
  }

  /* ---------------- formula anatomy ---------------- */
  const ANAT = ['A', 'B', 'C', 'D', 'E'];
  function anatTex(tex, display) {
    const k = root.katex;
    if (!k || !k.renderToString) return `<code>${esc(tex)}</code>`;
    const macros = {};
    ANAT.forEach((L, i) => { macros['\\col' + L] = `\\htmlClass{va${i + 1}}{#1}`; });
    try {
      return k.renderToString(String(tex), Object.assign({}, RENDER.KATEX_OPTS, { displayMode: !!display, macros, trust: (ctx) => ctx.command === '\\htmlClass' }));
    } catch (e) { return `<code>${esc(tex)}</code>`; }
  }
  function anatomy(s) {
    const parts = s.parts || [];
    return `<div class="vz-anat"><div class="vz-anat-f">${anatTex(s.tex, true)}</div><ul class="vz-anat-k">${parts.map((p, i) => {
      const L = p.c && ANAT.indexOf(p.c) >= 0 ? p.c : ANAT[i % 5];
      const n = ANAT.indexOf(L) + 1;
      return `<li class="k${n}"><span class="vz-sym">${anatTex(`\\col${L}{${p.sym}}`, false)}</span><span class="vz-say">${vrich(p.say)}</span></li>`;
    }).join('')}</ul></div>`;
  }

  /* ---------------- balance scale and seesaw ---------------- */
  function balance(s) {
    const W = 400, cx = 200, cy = 70, L = 130;
    const tilt = s.tilt || 'level';
    const ang = ((tilt === 'left' ? -1 : tilt === 'right' ? 1 : 0) * (s.angle || 9) * Math.PI) / 180;
    const ends = [[cx - L * Math.cos(ang), cy - L * Math.sin(ang)], [cx + L * Math.cos(ang), cy + L * Math.sin(ang)]];
    const sides = [s.left || {}, s.right || {}];
    const rowsOf = (x) => wrapLines(x.label || '', 16).length + wrapLines(x.sub || '', 18).length;
    const H = cy + Math.abs(L * Math.sin(ang)) + 44 + 34 + 18 * Math.max(rowsOf(sides[0]), rowsOf(sides[1])) + 10;
    let g = `<path d="M${cx} ${cy} L${cx - 30} ${cy + 118} L${cx + 30} ${cy + 118} Z" class="vz-stand"/>`;
    g += `<line x1="${r1(ends[0][0])}" y1="${r1(ends[0][1])}" x2="${r1(ends[1][0])}" y2="${r1(ends[1][1])}" class="vz-beam"/><circle cx="${cx}" cy="${cy}" r="7" class="vz-pivot"/>`;
    ends.forEach(([x, y], i) => {
      const side = sides[i], c = kc(side.c !== undefined ? side.c : i + 1, i), py = y + 44;
      g += `<line x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x - 34)}" y2="${r1(py)}" class="vz-string"/><line x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x + 34)}" y2="${r1(py)}" class="vz-string"/>`;
      g += `<path d="M${r1(x - 50)} ${r1(py)} Q${r1(x)} ${r1(py + 30)} ${r1(x + 50)} ${r1(py)} Z" class="vz-pan ${c}"/>`;
      if (side.icon) g += `<text x="${r1(x)}" y="${r1(py - 5)}" class="vz-emoji" text-anchor="middle">${esc(side.icon)}</text>`;
      let ty = py + 34;
      const lx = Math.max(76, Math.min(W - 76, x));
      wrapLines(side.label || '', 16).forEach((ln) => { g += `<text x="${r1(lx)}" y="${r1(ty + 14)}" class="vz-big-t" text-anchor="middle">${svgT(ln)}</text>`; ty += 18; });
      wrapLines(side.sub || '', 18).forEach((ln) => { g += `<text x="${r1(lx)}" y="${r1(ty + 14)}" class="vz-sub-t" text-anchor="middle">${svgT(ln)}</text>`; ty += 18; });
    });
    return svg(W, Math.max(H, cy + 124), g, describe(s)) + (s.note ? `<p class="vz-note-p">${vrich(s.note)}</p>` : '');
  }
  function seesaw(s) {
    const W = 400, cx = 200, cy = 128, L = 150;
    const H = cy + L * Math.sin((13 * Math.PI) / 180) + 34 + ((s.left || {}).sub || (s.right || {}).sub ? 22 : 4) + 6;
    const down = s.down === 'left' ? 'left' : 'right';
    const ang = ((down === 'right' ? 1 : -1) * 13 * Math.PI) / 180;
    const ends = [[cx - L * Math.cos(ang), cy - L * Math.sin(ang)], [cx + L * Math.cos(ang), cy + L * Math.sin(ang)]];
    let g = `<path d="M${cx} ${cy + 4} L${cx - 26} ${cy + 56} L${cx + 26} ${cy + 56} Z" class="vz-stand"/>`;
    g += `<line x1="${r1(ends[0][0])}" y1="${r1(ends[0][1])}" x2="${r1(ends[1][0])}" y2="${r1(ends[1][1])}" class="vz-plank"/>`;
    [s.left || {}, s.right || {}].forEach((side, i) => {
      const [x, y] = ends[i];
      const isDown = (i === 1) === (down === 'right');
      const c = kc(side.c !== undefined ? side.c : i + 1, i);
      g += `<circle cx="${r1(x)}" cy="${r1(y - 20)}" r="17" class="vz-seat ${c}"/>`;
      if (side.icon) g += `<text x="${r1(x)}" y="${r1(y - 12)}" class="vz-emoji sm" text-anchor="middle">${esc(side.icon)}</text>`;
      const lw = (plain(side.label || '').length + 2) * 9.6;
      const lx = Math.min(W - lw / 2 - 4, Math.max(lw / 2 + 4, x));
      const ly = isDown ? y + 34 : y - 50;
      g += `<text x="${r1(lx)}" y="${r1(ly)}" class="vz-big-t" text-anchor="middle">${svgT((side.label || '') + (isDown ? ' ↓' : ' ↑'))}</text>`;
      if (side.sub) g += `<text x="${r1(lx)}" y="${r1(ly + 18)}" class="vz-sub-t" text-anchor="middle">${svgT(side.sub)}</text>`;
    });
    return svg(W, H, g, describe(s)) + (s.note ? `<p class="vz-note-p">${vrich(s.note)}</p>` : '');
  }

  /* ---------------- cycle ---------------- */
  function cycle(s) {
    const st = s.steps || [], n = st.length;
    const W = 360, H = 320, cx = 180, cy = 160, R = n <= 3 ? 100 : 110;
    const bw = n <= 4 ? 122 : 104;
    const ang = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n;
    let g = '';
    // arcs first (under the boxes)
    const gapA = Math.min(0.62, (Math.PI / n) * 0.78);
    for (let i = 0; i < n; i++) {
      const a0 = ang(i) + gapA, a1 = ang(i + 1) - gapA;
      const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0)], p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
      g += `<path d="M${r1(p0[0])} ${r1(p0[1])} A${R} ${R} 0 0 1 ${r1(p1[0])} ${r1(p1[1])}" class="vz-arc"/>`;
      g += head(p1[0], p1[1], a1 + Math.PI / 2, 'vz-head', 10);
    }
    st.forEach((x, i) => {
      const a = ang(i), px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
      const c = kc(x.c !== undefined ? x.c : s.c !== undefined ? s.c : 1, 0);
      const lines = wrapLines(x.t || '', n <= 4 ? 12 : 10).slice(0, 3);
      const h = (x.icon ? 24 : 6) + 17 * lines.length + 10;
      g += `<rect x="${r1(px - bw / 2)}" y="${r1(py - h / 2)}" width="${bw}" height="${r1(h)}" rx="12" class="vz-node ${c}"/>`;
      let ty = py - h / 2 + 8;
      if (x.icon) { g += `<text x="${r1(px)}" y="${r1(ty + 18)}" class="vz-emoji sm" text-anchor="middle">${esc(x.icon)}</text>`; ty += 22; }
      lines.forEach((ln, k) => { g += `<text x="${r1(px)}" y="${r1(ty + 14 + k * 17)}" class="vz-node-t" text-anchor="middle">${svgT(ln)}</text>`; });
    });
    if (s.center) g += textLines(cx, cy + 5 - (wrapLines(s.center, 14).length - 1) * 9, s.center, 'vz-center', 14, 18);
    return svg(W, H, g, describe(s));
  }

  /* ---------------- number line ---------------- */
  function numline(s) {
    const lo = +s.min, hi = +s.max;
    const W = 360, mL = 26, mR = 26;
    const zones = s.zones || [];
    const Xr = (v) => mL + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (W - mL - mR);
    const marks = (s.marks || []).map((m) => Object.assign({}, m)).sort((a, b) => a.v - b.v);
    let lastRight = -1e9;
    marks.forEach((m) => {
      if (!m.label || m.below) return;
      const w = plain(m.label).length * 8.6 + 10, x = Math.max(40, Math.min(W - 40, Xr(m.v)));
      if (x - w / 2 < lastRight) m.below = true; else lastRight = x + w / 2;
    });
    const anyBelow = marks.some((m) => m.below);
    const axisY = zones.some((z) => z.label) ? (marks.some((m) => !m.below && m.label) ? 76 : 54) : marks.some((m) => !m.below && m.label) ? 50 : 30;
    const H = axisY + 34 + (anyBelow ? 26 : 0) + 4;
    const X = (v) => mL + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (W - mL - mR);
    let g = '';
    zones.forEach((z, i) => {
      const a = X(z.from === undefined ? lo : z.from), b = X(z.to === undefined ? hi : z.to);
      g += `<rect x="${r1(a)}" y="${axisY - 13}" width="${r1(Math.max(0, b - a))}" height="26" rx="6" class="vz-zone ${kc(z.c !== undefined ? z.c : i + 1, i)}"/>`;
      if (z.label) g += `<text x="${r1((a + b) / 2)}" y="${axisY - 22 - (marks.some((m) => !m.below && m.label) ? 22 : 0)}" class="vz-zlab" text-anchor="middle">${svgT(z.label)}</text>`;
    });
    g += `<line x1="${mL - 14}" x2="${W - mR + 14}" y1="${axisY}" y2="${axisY}" class="vz-axis2"/>`;
    g += head(W - mR + 16, axisY, 0, 'vz-head', 9) + head(mL - 16, axisY, Math.PI, 'vz-head', 9);
    const ticks = s.ticks || niceTicks(lo, hi, 5);
    ticks.forEach((t) => { g += `<line x1="${r1(X(t))}" x2="${r1(X(t))}" y1="${axisY - 6}" y2="${axisY + 6}" class="vz-axis2"/><text x="${r1(X(t))}" y="${axisY + 24}" class="vz-tick" text-anchor="middle">${esc(num(t, s.fmt, s.dp))}</text>`; });
    marks.forEach((m, i) => {
      const x = X(m.v);
      g += `<circle cx="${r1(x)}" cy="${axisY}" r="7.5" class="vz-dot big ${kc(m.c !== undefined ? m.c : 2, i)}"/>`;
      if (m.label) g += `<text x="${r1(Math.max(40, Math.min(W - 40, x)))}" y="${m.below ? axisY + 50 : axisY - 20}" class="vz-mlab" text-anchor="middle">${svgT(m.label)}</text>`;
    });
    return svg(W, H, g, describe(s));
  }

  /* ---------------- a calculator screen ---------------- */
  function tiscreen(s) {
    const typed = (t) => esc(t).replace(/-/g, '−').replace(/\*/g, '×').replace(/->/g, '→');
    return `<div class="ti-screen ti-calcline vz-ti">${(s.lines || []).map((l) => (l.say !== undefined ? `<p class="vz-ti-say">${vrich(l.say)}</p>` : `<div class="ti-line"><code class="ti-in">${typed(l.in || '')}</code><output class="ti-out">${esc(l.out === undefined ? '' : l.out)}</output></div>`)).join('')}</div>`;
  }

  /* ---------------- descriptions (screen readers and read-aloud) ---------------- */
  function describe(s) {
    if (!s) return '';
    if (s.alt) return plain(s.alt);
    const P = (x) => plain(x);
    switch (s.type) {
      case 'bars': return 'Bar chart: ' + (s.bars || []).map((b) => `${P(b.label)} ${b.note !== undefined ? P(b.note) : num(b.parts ? sum(b.parts.map((p) => +p.v || 0)) : +b.v, s.fmt, s.dp)}`).join(', ') + '.';
      case 'lines': case 'scatter': case 'bell': return `Chart${s.y && s.y.label ? ' of ' + P(s.y.label) : ''}${s.x && s.x.label ? ' against ' + P(s.x.label) : ''}${(s.series || s.sets || s.curves || []).some((x) => x.name) ? ': ' + (s.series || s.sets || s.curves || []).filter((x) => x.name).map((x) => P(x.name)).join(', ') : ''}.`;
      case 'waterfall': return 'Step chart: ' + (s.steps || []).map((x) => P(x.label) + (x.v !== undefined ? ' ' + num(x.v, s.fmt, s.dp) : '')).join(', then ') + '.';
      case 'flow': return (s.steps || []).map((x, i) => (i && (s.links || [])[i - 1] ? P((s.links || [])[i - 1]) + ' gives ' : '') + [x.t, x.s].filter(Boolean).map(P).join(', ')).join('; then ') + '.';
      case 'compare': return 'Comparison: ' + (s.items || []).map((x) => [x.title, x.big].filter(Boolean).map(P).join(' ')).join(' versus ') + '.';
      case 'cards': return (s.items || []).map((x) => P(x.t)).join('. ') + '.';
      case 'split': return (s.rows || [{ parts: s.parts || [] }]).map((r) => (r.label ? P(r.label) + ': ' : '') + r.parts.map((p) => `${P(p.label)} ${p.show !== undefined ? P(p.show) : num(+p.v, s.fmt, s.dp)}`).join(', ')).join('. ') + '.';
      case 'grid100': return (s.parts || [{ n: s.fill, label: s.label }]).map((p) => `${p.n} out of 100 squares${p.label ? ' ' + P(p.label) : ''}`).join(', ') + '.';
      case 'pie': return (s.pies || [{ parts: s.parts }]).map((p) => (p.title ? P(p.title) + ': ' : '') + (p.parts || []).map((x) => `${P(x.label)} ${x.show !== undefined ? P(x.show) : num(+x.v, s.fmt, s.dp)}`).join(', ')).join('. ') + '.';
      case 'anatomy': return (s.parts || []).map((p) => `${P(p.sym)}: ${P(p.say)}`).join('. ') + '.';
      case 'balance': return `A balance: ${P((s.left || {}).label)} on the left, ${P((s.right || {}).label)} on the right${s.tilt === 'left' ? '; the left side is heavier' : s.tilt === 'right' ? '; the right side is heavier' : '; the two sides balance'}.`;
      case 'seesaw': { const d = s.down === 'left' ? 'left' : 'right'; const up = d === 'left' ? s.right : s.left, dn = d === 'left' ? s.left : s.right; return `A seesaw: when ${P((up || {}).label)} goes up, ${P((dn || {}).label)} goes down.`; }
      case 'cycle': return 'A cycle: ' + (s.steps || []).map((x) => P(x.t)).join(', then ') + ', and back to the start.';
      case 'numline': return 'A number line' + (s.zones || []).map((z) => `; ${P(z.label || '')} from ${num(z.from === undefined ? s.min : z.from, s.fmt, s.dp)} to ${num(z.to === undefined ? s.max : z.to, s.fmt, s.dp)}`).join('') + (s.marks || []).map((m) => `; ${P(m.label || '')} at ${num(m.v, s.fmt, s.dp)}`).join('') + '.';
      case 'tiscreen': return 'Calculator screen: ' + (s.lines || []).map((l) => (l.say !== undefined ? P(l.say) : `${l.in} gives ${l.out}`)).join('. ') + '.';
      case 'tl': return 'Timeline' + (s.moves || []).map((m) => `; move from time ${m.from} to time ${m.to}${m.label ? ' (' + P(m.label) + ')' : ''}`).join('') + '.';
      default: return '';
    }
  }

  /* ---------------- dispatch ---------------- */
  const TYPES = { bars, lines, scatter, bell, waterfall, grid100, flow, compare, cards, split, pie, anatomy, balance, seesaw, cycle, numline, tiscreen };
  const CHART_TYPES = { tl: 1, table: 1, tree: 1, npv: 1, sml: 1 };

  function capHTML(s, tag) {
    return s.cap ? `<${tag} class="vz-cap"><span class="vz-eye" aria-hidden="true">👀</span> <span>${vrich(s.cap)}</span></${tag}>` : '';
  }
  function one(s, opts) {
    if (!s || !s.type) return '';
    const title = s.title ? `<p class="vz-title">${vrich(s.title)}</p>` : '';
    if (TYPES[s.type]) return `<figure class="viz vz vzt-${esc(s.type)}">${title}${TYPES[s.type](s, opts)}${capHTML(s, 'figcaption')}</figure>`;
    const C = root.CHARTS;
    let chart = '';
    if (s.type === 'tl') chart = C.timeline(s, opts);
    else if (s.type === 'table') chart = C.table(s, opts);
    else if (s.type === 'tree') chart = C.tree(s.root || s, opts);
    else if (s.type === 'npv') chart = C.npvChart(s);
    else if (s.type === 'sml') chart = C.smlChart(s);
    else return '';
    return `<div class="vz vzt-${esc(s.type)}">${title}${chart}${capHTML(s, 'p')}</div>`;
  }
  /** HTML for one picture spec or a list of them. */
  function render(v, opts) {
    if (!v) return '';
    if (Array.isArray(v)) return v.length === 1 ? one(v[0], opts) : `<div class="vz-row n${v.length}">${v.map((s) => one(Object.assign({}, s, { _small: true }), opts)).join('')}</div>`;
    return one(v, opts);
  }
  /** Words for read-aloud: each picture's caption. */
  function speech(v) {
    const list = Array.isArray(v) ? v : v ? [v] : [];
    return list.map((s) => (s.cap ? RENDER.speech(String(s.cap).replace(/\[\[([^\]]+)\]\]/g, '$1')) : '')).filter(Boolean).join(' ');
  }

  /* ---------------- checks (tests/validate.js) ---------------- */
  function check(v) {
    const errs = [];
    const list = Array.isArray(v) ? v : [v];
    if (Array.isArray(v) && v.length > 3) errs.push('at most 3 pictures side by side');
    list.forEach((s, k) => {
      const E = (m) => errs.push(`${list.length > 1 ? '#' + k + ' ' : ''}${s && s.type ? s.type : '?'}: ${m}`);
      if (!s || typeof s !== 'object') { E('not an object'); return; }
      if (!TYPES[s.type] && !CHART_TYPES[s.type]) { E('unknown type'); return; }
      if (!s.cap) E('needs a caption (cap)');
      const cols = new Set();
      const col = (c) => { if (c === undefined) return; if (!KC[c]) E('bad colour ' + c); else if (typeof c === 'number') cols.add(c); };
      const need = (cond, m) => { if (!cond) E(m); };
      const nums = (arr, m) => { if (!arr.every(isNum)) E(m + ' must be numbers'); };
      switch (s.type) {
        case 'bars':
          need(Array.isArray(s.bars) && s.bars.length >= 1 && s.bars.length <= 14, 'bars: 1 to 14');
          (s.bars || []).forEach((b) => { if (b.parts) { nums(b.parts.map((p) => p.v), 'bar parts'); b.parts.forEach((p) => col(p.c)); } else nums([b.v], 'bar values'); col(b.c); need(b.label !== undefined, 'every bar needs a label'); });
          (s.keys || []).forEach((kk) => col(kk.c));
          if ((s.bars || []).some((b) => b.parts && b.parts.length > 1)) need(s.keys && s.keys.length, 'stacked bars need keys (a legend)');
          if (s.line) nums([s.line.v], 'line.v');
          break;
        case 'lines':
          need(Array.isArray(s.series) && s.series.length >= 1 && s.series.length <= 4, 'series: 1 to 4');
          (s.series || []).forEach((se) => { need(Array.isArray(se.pts) && se.pts.length >= 2, 'each series needs 2+ points'); nums((se.pts || []).flat(), 'points'); col(se.c); });
          (s.marks || []).forEach((m) => { nums([m.x, m.y], 'marks'); col(m.c); });
          (s.vlines || []).forEach((m) => nums([m.x], 'vlines'));
          (s.hlines || []).forEach((m) => nums([m.y], 'hlines'));
          (s.shade || []).forEach((m) => { nums([m.x1, m.x2], 'shade'); col(m.c); });
          break;
        case 'scatter':
          need(Array.isArray(s.sets) && s.sets.length >= 1 && s.sets.length <= 3, 'sets: 1 to 3');
          (s.sets || []).forEach((se) => { need(Array.isArray(se.pts) && se.pts.length >= 2, 'each set needs 2+ points'); nums((se.pts || []).flat(), 'points'); col(se.c); });
          break;
        case 'bell':
          need(Array.isArray(s.curves) && s.curves.length >= 1 && s.curves.length <= 3, 'curves: 1 to 3');
          (s.curves || []).forEach((c) => { nums([c.mean, c.sd], 'mean and sd'); need(c.sd > 0, 'sd must be positive'); col(c.c); });
          break;
        case 'waterfall':
          need(Array.isArray(s.steps) && s.steps.length >= 2 && s.steps.length <= 9, 'steps: 2 to 9');
          (s.steps || []).forEach((st) => { if (!st.total) nums([st.v], 'step values'); col(st.c); need(st.label !== undefined, 'every step needs a label'); });
          break;
        case 'grid100': {
          const parts = s.parts || [{ n: s.fill }];
          nums(parts.map((p) => p.n), 'grid parts');
          need(sum(parts.map((p) => +p.n || 0)) <= 100, 'at most 100 squares');
          parts.forEach((p) => col(p.c));
          break;
        }
        case 'flow':
          need(Array.isArray(s.steps) && s.steps.length >= 2 && s.steps.length <= 6, 'steps: 2 to 6');
          need(!s.links || s.links.length === (s.steps || []).length - 1, 'links: one fewer than steps');
          (s.steps || []).forEach((x) => col(x.c));
          break;
        case 'compare':
          need(Array.isArray(s.items) && s.items.length >= 2 && s.items.length <= 4, 'items: 2 to 4');
          (s.items || []).forEach((x) => { col(x.c); need(x.title || x.big !== undefined, 'each item needs a title or big'); });
          break;
        case 'cards':
          need(Array.isArray(s.items) && s.items.length >= 2 && s.items.length <= 6, 'items: 2 to 6');
          (s.items || []).forEach((x) => { col(x.c); need(x.t, 'each card needs t'); });
          break;
        case 'split': {
          const rows = s.rows || [{ parts: s.parts }];
          rows.forEach((r) => { need(Array.isArray(r.parts) && r.parts.length >= 1 && r.parts.length <= 5, 'parts: 1 to 5'); nums((r.parts || []).map((p) => p.v), 'part values'); (r.parts || []).forEach((p) => { col(p.c); need(p.label !== undefined, 'every part needs a label'); }); });
          break;
        }
        case 'pie': {
          const pies = s.pies || [{ parts: s.parts }];
          need(pies.length >= 1 && pies.length <= 3, 'pies: 1 to 3');
          pies.forEach((p) => { need(Array.isArray(p.parts) && p.parts.length >= 1 && p.parts.length <= 5, 'parts: 1 to 5'); nums((p.parts || []).map((x) => x.v), 'slice values'); (p.parts || []).forEach((x) => col(x.c)); });
          break;
        }
        case 'anatomy':
          need(typeof s.tex === 'string' && /\\col[A-E]\{/.test(s.tex), 'tex must colour its parts with \\colA{…}, \\colB{…}, …');
          need(Array.isArray(s.parts) && s.parts.length >= 1 && s.parts.length <= 5, 'parts: 1 to 5');
          (s.parts || []).forEach((p) => need(p.sym && p.say, 'each part needs sym and say'));
          break;
        case 'balance':
          need(s.left && s.right && s.left.label && s.right.label, 'left and right need labels');
          need(!s.tilt || ['left', 'right', 'level'].includes(s.tilt), "tilt is 'left', 'right' or 'level'");
          break;
        case 'seesaw':
          need(s.left && s.right && s.left.label && s.right.label, 'left and right need labels');
          break;
        case 'cycle':
          need(Array.isArray(s.steps) && s.steps.length >= 3 && s.steps.length <= 6, 'steps: 3 to 6');
          (s.steps || []).forEach((x) => { col(x.c); need(x.t, 'each step needs t'); });
          break;
        case 'numline':
          nums([s.min, s.max], 'min and max');
          need(s.max > s.min, 'max must be above min');
          (s.marks || []).forEach((m) => { nums([m.v], 'mark values'); col(m.c); });
          (s.zones || []).forEach((z) => col(z.c));
          break;
        case 'tiscreen':
          need(Array.isArray(s.lines) && s.lines.length >= 1, 'lines needed');
          break;
        case 'tl':
          need(Array.isArray(s.cfs) || isNum(s.n), 'tl needs cfs or n');
          (s.moves || []).forEach((m) => { nums([m.from, m.to], 'move from/to'); col(m.c); });
          (s.spans || []).forEach((m) => { nums([m.from, m.to], 'span from/to'); col(m.c); });
          break;
        case 'table':
          need(Array.isArray(s.head) && Array.isArray(s.rows), 'table needs head and rows');
          break;
        default: break;
      }
      if (cols.size > 3) E('use at most three of the colours 1-5 in one picture');
      // SVG labels must not keep LaTeX commands that cannot be drawn
      const svgLabels = [];
      if (s.type === 'bars') (s.bars || []).forEach((b) => svgLabels.push(b.label, b.note)), s.line && svgLabels.push(s.line.label);
      if (s.type === 'lines' || s.type === 'scatter' || s.type === 'bell') { svgLabels.push(s.x && s.x.label, s.y && s.y.label); (s.series || s.sets || s.curves || []).forEach((x) => svgLabels.push(x.name)); (s.marks || []).concat(s.vlines || [], s.hlines || [], s.shade || []).forEach((m) => svgLabels.push(m.label)); }
      if (s.type === 'waterfall') (s.steps || []).forEach((x) => svgLabels.push(x.label, x.note));
      if (s.type === 'balance' || s.type === 'seesaw') [s.left, s.right].forEach((x) => x && svgLabels.push(x.label, x.sub));
      if (s.type === 'cycle') { (s.steps || []).forEach((x) => svgLabels.push(x.t)); svgLabels.push(s.center); }
      if (s.type === 'numline') (s.marks || []).concat(s.zones || []).forEach((m) => svgLabels.push(m.label));
      if (s.type === 'pie') (s.pies || [{ center: s.center }]).forEach((p) => svgLabels.push(p.center));
      if (s.type === 'tl') (s.moves || []).concat(s.spans || []).forEach((m) => svgLabels.push(m.label));
      svgLabels.filter((x) => x !== undefined && x !== null && x !== '').forEach((x) => {
        if (/\\[A-Za-z]/.test(lite(x))) E(`label "${x}" has LaTeX that cannot be drawn in a chart (use plain text)`);
        wrapLines(x, 22).forEach((ln) => { if (plain(ln).length > 26) E(`label line too long: "${ln}"`); });
      });
      try { one(s, {}); } catch (e) { E('failed to draw: ' + e.message); }
    });
    return errs;
  }

  root.VIZ = { render, one, describe, speech, check, num, plain, svgT, lite, TYPES: Object.keys(TYPES).concat(Object.keys(CHART_TYPES)) };
})(typeof window !== 'undefined' ? window : globalThis);
