/* Corporate Ladder — SVG art: finance monsters and the player avatar.
 * Everything is drawn in a 200×200 viewBox with thick outlines and flat colour,
 * so enemies from every floor share one style.
 */
(function (root) {
  'use strict';
  const INK = '#1f2430';

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------------- bodies ---------------- */
  const BODY = {
    blob: { top: 42, eyeY: 100, mouthY: 136, left: 28, right: 172, bottom: 180, dx: 26,
      draw: (f, s) => `<path d="M100 40 C146 40 174 76 174 122 C174 162 144 180 100 180 C56 180 26 162 26 122 C26 76 54 40 100 40 Z" fill="${f}" stroke="${s}" stroke-width="4.5"/>` },
    round: { top: 48, eyeY: 104, mouthY: 140, left: 34, right: 166, bottom: 180, dx: 25,
      draw: (f, s) => `<circle cx="100" cy="114" r="66" fill="${f}" stroke="${s}" stroke-width="4.5"/>` },
    box: { top: 48, eyeY: 100, mouthY: 140, left: 36, right: 164, bottom: 180, dx: 28,
      draw: (f, s) => `<rect x="36" y="48" width="128" height="132" rx="28" fill="${f}" stroke="${s}" stroke-width="4.5"/>` },
    ghost: { top: 38, eyeY: 92, mouthY: 128, left: 42, right: 158, bottom: 176, dx: 24, noFeet: true,
      draw: (f, s) => `<path d="M42 176 V100 C42 62 68 38 100 38 C132 38 158 62 158 100 V176 Q149 166 140 176 Q130 186 120 176 Q110 166 100 176 Q90 186 80 176 Q70 166 60 176 Q51 186 42 176 Z" fill="${f}" stroke="${s}" stroke-width="4.5" stroke-linejoin="round"/>` },
    coin: { top: 46, eyeY: 102, mouthY: 140, left: 32, right: 168, bottom: 182, dx: 25,
      draw: (f, s) => `<ellipse cx="100" cy="120" rx="68" ry="68" fill="${shade(f, -0.25)}" stroke="${s}" stroke-width="4.5"/><circle cx="100" cy="114" r="68" fill="${f}" stroke="${s}" stroke-width="4.5"/><circle cx="100" cy="114" r="58" fill="none" stroke="${shade(f, -0.3)}" stroke-width="3" stroke-dasharray="3 7"/>` },
    spiky: { top: 42, eyeY: 108, mouthY: 142, left: 36, right: 164, bottom: 186, dx: 24,
      draw: (f, s) => {
        const pts = [];
        for (let k = 0; k < 18; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 9; const r = k % 2 ? 60 : 74; pts.push((100 + r * Math.cos(a)).toFixed(1) + ',' + (114 + r * Math.sin(a)).toFixed(1)); }
        return `<polygon points="${pts.join(' ')}" fill="${f}" stroke="${s}" stroke-width="4.5" stroke-linejoin="round"/>`;
      } },
    tall: { top: 26, eyeY: 78, mouthY: 112, left: 58, right: 142, bottom: 180, dx: 20,
      draw: (f, s) => `<rect x="58" y="26" width="84" height="154" rx="42" fill="${f}" stroke="${s}" stroke-width="4.5"/>` },
  };

  /* ---------------- faces ---------------- */
  function eyesSVG(m, n, brows) {
    const list = n === 1 ? [[100, m.eyeY, 19, 21]] : n === 3
      ? [[100 - m.dx - 4, m.eyeY + 4, 11, 13], [100, m.eyeY - 12, 11, 13], [100 + m.dx + 4, m.eyeY + 4, 11, 13]]
      : [[100 - m.dx, m.eyeY, 13, 15], [100 + m.dx, m.eyeY, 13, 15]];
    let out = '<g class="eyes">';
    list.forEach(([cx, cy, rx, ry]) => {
      out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${INK}" stroke-width="3.5"/>` +
        `<circle cx="${cx - 3}" cy="${cy + 2}" r="${(rx * 0.52).toFixed(1)}" fill="${INK}"/>` +
        `<circle cx="${cx - 6}" cy="${cy - 3}" r="2.6" fill="#fff"/>`;
    });
    out += '</g>';
    if (brows) {
      list.forEach(([cx, cy, rx, ry], i) => {
        const left = n === 3 ? i < 1 : cx < 100;
        const y = cy - ry - 7;
        out += left ? `<path d="M${cx - rx} ${y - 5} L${cx + rx - 2} ${y + 4}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`
          : `<path d="M${cx - rx + 2} ${y + 4} L${cx + rx} ${y - 5}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
      });
    }
    return { svg: out, list };
  }

  function mouthSVG(kind, m) {
    const Y = m.mouthY;
    switch (kind) {
      case 'fangs': return `<path d="M76 ${Y} Q100 ${Y + 16} 124 ${Y} Z" fill="#5a1e28" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M85 ${Y + 1} L89 ${Y + 10} L93 ${Y + 2} Z M107 ${Y + 2} L111 ${Y + 10} L115 ${Y + 1} Z" fill="#fff" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
      case 'smirk': return `<path d="M82 ${Y + 4} Q104 ${Y + 12} 122 ${Y - 4}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`;
      case 'o': return `<ellipse cx="100" cy="${Y + 5}" rx="8" ry="10" fill="#5a1e28" stroke="${INK}" stroke-width="3.5"/>`;
      case 'flat': return `<path d="M86 ${Y + 4} H114" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`;
      case 'tongue': return `<path d="M80 ${Y} Q100 ${Y + 24} 120 ${Y} Z" fill="#5a1e28" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="100" cy="${Y + 12}" rx="8" ry="6" fill="#ff7b93"/>`;
      default: return `<path d="M80 ${Y} Q100 ${Y + 24} 120 ${Y} Z" fill="#5a1e28" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><rect x="92" y="${Y}" width="16" height="5" rx="1.5" fill="#fff"/>`;
    }
  }

  /* ---------------- accessories ---------------- */
  function acc(name, m, eyes, color) {
    const T = m.top;
    const ex = (i) => eyes[i] || eyes[0];
    switch (name) {
      case 'tophat': return `<rect x="62" y="${T - 8}" width="76" height="12" rx="5" fill="#23262d" stroke="${INK}" stroke-width="3.5"/><rect x="74" y="${T - 58}" width="52" height="52" rx="4" fill="#23262d" stroke="${INK}" stroke-width="3.5"/><rect x="75.5" y="${T - 20}" width="49" height="9" fill="${color || '#d64545'}"/>`;
      case 'crown': return `<polygon points="66,${T + 4} 66,${T - 26} 83,${T - 11} 100,${T - 36} 117,${T - 11} 134,${T - 26} 134,${T + 4}" fill="#f2c14e" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="100" cy="${T - 10}" r="5" fill="#e0487a" stroke="${INK}" stroke-width="2"/><circle cx="80" cy="${T - 4}" r="3.6" fill="#3fa7e0" stroke="${INK}" stroke-width="1.5"/><circle cx="120" cy="${T - 4}" r="3.6" fill="#3fa7e0" stroke="${INK}" stroke-width="1.5"/>`;
      case 'horns': return `<path d="M72 ${T + 16} Q54 ${T - 10} 62 ${T - 28} Q72 ${T - 4} 86 ${T + 8} Z" fill="#f5ecd9" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M128 ${T + 16} Q146 ${T - 10} 138 ${T - 28} Q128 ${T - 4} 114 ${T + 8} Z" fill="#f5ecd9" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
      case 'antenna': return `<path d="M100 ${T + 2} Q96 ${T - 16} 104 ${T - 30}" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="104" cy="${T - 34}" r="8" fill="#ff5a5f" stroke="${INK}" stroke-width="3.5"/>`;
      case 'halo': return `<ellipse cx="100" cy="${T - 18}" rx="30" ry="8" fill="none" stroke="#f2c14e" stroke-width="6"/>`;
      case 'cap': return `<path d="M64 ${T + 16} Q64 ${T - 20} 100 ${T - 20} Q136 ${T - 20} 136 ${T + 16} Z" fill="${color || '#2f7de1'}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M62 ${T + 13} Q40 ${T + 14} 32 ${T + 24} Q62 ${T + 24} 100 ${T + 17} Z" fill="${shade(color || '#2f7de1', -0.3)}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="100" cy="${T - 19}" r="4" fill="${INK}"/>`;
      case 'bandana': { const y = m.eyeY - 30; return `<rect x="${m.left + 8}" y="${y}" width="${m.right - m.left - 16}" height="13" rx="6" fill="#d64545" stroke="${INK}" stroke-width="3"/><path d="M${m.right - 12} ${y + 6} l22 -8 l-4 14 z M${m.right - 12} ${y + 7} l20 10 l-10 6 z" fill="#d64545" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`; }
      case 'wizard': return `<polygon points="58,${T + 6} 142,${T + 6} 106,${T - 72}" fill="#6f4bd8" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="100" cy="${T + 6}" rx="48" ry="9" fill="#5a3bb8" stroke="${INK}" stroke-width="3.5"/><text x="96" y="${T - 20}" font-size="16" fill="#f2c14e" text-anchor="middle">✦</text><text x="112" y="${T - 42}" font-size="11" fill="#f2c14e" text-anchor="middle">✦</text>`;
      case 'hardhat': return `<path d="M62 ${T + 12} Q62 ${T - 28} 100 ${T - 28} Q138 ${T - 28} 138 ${T + 12} Z" fill="#f2c14e" stroke="${INK}" stroke-width="3.5"/><rect x="52" y="${T + 6}" width="96" height="10" rx="5" fill="#e0a92a" stroke="${INK}" stroke-width="3.5"/><path d="M100 ${T - 28} V${T + 6}" stroke="${INK}" stroke-width="3"/>`;
      case 'headset': { const e0 = ex(0), e1 = ex(eyes.length - 1); return `<path d="M${m.left + 6} ${m.eyeY - 2} Q${m.left + 6} ${T - 16} 100 ${T - 16} Q${m.right - 6} ${T - 16} ${m.right - 6} ${m.eyeY - 2}" fill="none" stroke="${INK}" stroke-width="6"/><rect x="${m.left - 4}" y="${m.eyeY - 14}" width="16" height="28" rx="6" fill="#3a3f4b" stroke="${INK}" stroke-width="3"/><rect x="${m.right - 12}" y="${m.eyeY - 14}" width="16" height="28" rx="6" fill="#3a3f4b" stroke="${INK}" stroke-width="3"/><path d="M${m.right - 6} ${m.eyeY + 12} Q${m.right - 16} ${m.mouthY + 8} 118 ${m.mouthY + 6}" fill="none" stroke="${INK}" stroke-width="3.5"/><circle cx="116" cy="${m.mouthY + 6}" r="4.5" fill="${INK}"/>` + (e0 && e1 ? '' : ''); }
      case 'leaf': return `<path d="M100 ${T + 2} V${T - 16}" stroke="#3f7d3a" stroke-width="4" stroke-linecap="round"/><path d="M100 ${T - 16} Q108 ${T - 38} 132 ${T - 32} Q124 ${T - 12} 100 ${T - 16} Z" fill="#6cc05f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M100 ${T - 12} Q90 ${T - 30} 72 ${T - 24} Q80 ${T - 8} 100 ${T - 12} Z" fill="#8ad37c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      case 'monocle': { const [cx, cy, rx] = ex(eyes.length - 1); return `<circle cx="${cx}" cy="${cy}" r="${rx + 6}" fill="rgba(255,255,255,0.15)" stroke="#c9a227" stroke-width="3.5"/><path d="M${cx + rx + 4} ${cy + 6} Q${cx + rx + 12} ${m.mouthY} ${cx + 4} ${m.mouthY + 26}" fill="none" stroke="#c9a227" stroke-width="2" stroke-dasharray="3 3"/>`; }
      case 'glasses': { let s = ''; eyes.forEach(([cx, cy, rx]) => { s += `<circle cx="${cx}" cy="${cy}" r="${rx + 5}" fill="rgba(255,255,255,0.12)" stroke="${INK}" stroke-width="3.5"/>`; }); if (eyes.length >= 2) { const a = eyes[0], b = eyes[eyes.length - 1]; s += `<path d="M${a[0] + a[2] + 5} ${a[1]} Q100 ${a[1] - 6} ${b[0] - b[2] - 5} ${b[1]}" fill="none" stroke="${INK}" stroke-width="3.5"/>`; } return s; }
      case 'shades': { let s = ''; eyes.forEach(([cx, cy]) => { s += `<rect x="${cx - 18}" y="${cy - 12}" width="36" height="22" rx="8" fill="#1b1d24" stroke="${INK}" stroke-width="3"/><path d="M${cx - 12} ${cy - 6} l8 0" stroke="#5f6675" stroke-width="3" stroke-linecap="round"/>`; }); if (eyes.length >= 2) s += `<path d="M${eyes[0][0] + 18} ${eyes[0][1] - 4} H${eyes[eyes.length - 1][0] - 18}" stroke="${INK}" stroke-width="3.5"/>`; return s; }
      case 'bowtie': { const Y = m.mouthY + 30; return `<path d="M100 ${Y} L80 ${Y - 11} L80 ${Y + 11} Z M100 ${Y} L120 ${Y - 11} L120 ${Y + 11} Z" fill="${color || '#e0487a'}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="${Y}" r="5" fill="${shade(color || '#e0487a', -0.25)}" stroke="${INK}" stroke-width="2.5"/>`; }
      case 'tie': { const Y = m.mouthY + 20; const B = Math.min(m.bottom - 8, Y + 44); return `<path d="M94 ${Y} H106 L104 ${Y + 8} L110 ${B - 6} L100 ${B + 2} L90 ${B - 6} L96 ${Y + 8} Z" fill="${color || '#d64545'}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`; }
      case 'pirate': { const [cx, cy, rx] = ex(0); return `<path d="M56 ${T + 8} Q100 ${T - 44} 144 ${T + 8} Q100 ${T - 6} 56 ${T + 8} Z" fill="#23262d" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><text x="100" y="${T - 8}" font-size="15" text-anchor="middle" fill="#fff">☠</text><circle cx="${cx}" cy="${cy}" r="${rx + 2}" fill="#1b1d24" stroke="${INK}" stroke-width="2"/><path d="M${m.left + 6} ${cy - 22} L${m.right - 8} ${cy - 8}" stroke="#1b1d24" stroke-width="3"/>`; }
      case 'mustache': { const Y = m.mouthY - 7; return `<path d="M100 ${Y} Q86 ${Y - 11} 73 ${Y - 3} Q68 ${Y + 5} 78 ${Y + 6} Q91 ${Y + 6} 100 ${Y + 1} Q109 ${Y + 6} 122 ${Y + 6} Q132 ${Y + 5} 127 ${Y - 3} Q114 ${Y - 11} 100 ${Y} Z" fill="#3b2a20" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`; }
      default: return '';
    }
  }
  const BEHIND = new Set(['halo']);
  const FACE = new Set(['monocle', 'glasses', 'shades', 'pirate', 'mustache', 'bowtie', 'tie', 'headset', 'bandana']);

  /** Enemy SVG. opts: {boss:bool, size:px, id:string} */
  function monsterSVG(e, opts) {
    opts = opts || {};
    const m = BODY[e.body] || BODY.blob;
    const color = e.color || '#7cc85a';
    const stroke = INK;
    const n = e.eyes || 2;
    const eyes = eyesSVG(m, n, opts.boss || e.angry);
    const accs = e.acc || [];
    const uid = 'm' + Math.random().toString(36).slice(2, 8);
    let s = `<svg class="mon-svg" viewBox="-10 -40 220 250" role="img" aria-label="${(e.name || 'Enemy').replace(/"/g, '')}" xmlns="http://www.w3.org/2000/svg">`;
    s += `<defs><radialGradient id="${uid}a" cx="50%" cy="55%" r="55%"><stop offset="0%" stop-color="${opts.boss ? '#ff5a5f' : color}" stop-opacity="0.45"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>`;
    if (opts.boss) s += `<circle class="aura" cx="100" cy="110" r="104" fill="url(#${uid}a)"/>`;
    s += `<ellipse cx="100" cy="${m.bottom + 8}" rx="58" ry="9" fill="#000" opacity="0.16"/>`;
    s += '<g class="mon">';
    accs.filter((a) => BEHIND.has(a)).forEach((a) => { s += acc(a, m, eyes.list, e.accColor); });
    // arms
    const armY = Math.round((m.eyeY + m.mouthY) / 2 + 16);
    const armCol = shade(color, -0.28);
    s += `<path d="M${m.left + 6} ${armY} Q${m.left - 12} ${armY + 6} ${m.left - 8} ${armY + 26}" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${m.left + 6} ${armY} Q${m.left - 12} ${armY + 6} ${m.left - 8} ${armY + 26}" fill="none" stroke="${armCol}" stroke-width="6" stroke-linecap="round"/>`;
    s += `<path d="M${m.right - 6} ${armY} Q${m.right + 12} ${armY + 6} ${m.right + 8} ${armY + 26}" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M${m.right - 6} ${armY} Q${m.right + 12} ${armY + 6} ${m.right + 8} ${armY + 26}" fill="none" stroke="${armCol}" stroke-width="6" stroke-linecap="round"/>`;
    if (!m.noFeet) s += `<ellipse cx="76" cy="${m.bottom + 2}" rx="16" ry="8" fill="${armCol}" stroke="${INK}" stroke-width="3.5"/><ellipse cx="124" cy="${m.bottom + 2}" rx="16" ry="8" fill="${armCol}" stroke="${INK}" stroke-width="3.5"/>`;
    s += m.draw(color, stroke);
    // belly + shine
    s += `<ellipse cx="100" cy="${Math.round((m.mouthY + m.bottom) / 2 + 4)}" rx="${Math.round((m.right - m.left) * 0.26)}" ry="${Math.round((m.bottom - m.mouthY) * 0.32)}" fill="#fff" opacity="0.16"/>`;
    s += `<ellipse cx="${m.left + 30}" cy="${m.top + 26}" rx="12" ry="7" fill="#fff" opacity="0.35" transform="rotate(-30 ${m.left + 30} ${m.top + 26})"/>`;
    // cheeks
    s += `<ellipse cx="${100 - m.dx - 12}" cy="${m.mouthY - 8}" rx="9" ry="5" fill="#ff8fa3" opacity="0.45"/><ellipse cx="${100 + m.dx + 12}" cy="${m.mouthY - 8}" rx="9" ry="5" fill="#ff8fa3" opacity="0.45"/>`;
    s += eyes.svg;
    s += mouthSVG(e.mouth || 'grin', m);
    accs.filter((a) => FACE.has(a)).forEach((a) => { s += acc(a, m, eyes.list, e.accColor); });
    accs.filter((a) => !BEHIND.has(a) && !FACE.has(a)).forEach((a) => { s += acc(a, m, eyes.list, e.accColor); });
    if (e.item) s += `<text x="${m.right + 12}" y="${armY + 44}" font-size="34" text-anchor="middle">${e.item}</text>`;
    s += '</g></svg>';
    return s;
  }

  /* ---------------- player avatar ---------------- */
  const SUITS = [
    { id: 'navy', name: 'Navy', color: '#2451b7', price: 0 },
    { id: 'charcoal', name: 'Charcoal', color: '#3a3f4b', price: 0 },
    { id: 'burgundy', name: 'Burgundy', color: '#8e2c48', price: 60 },
    { id: 'forest', name: 'Forest', color: '#2f6b4f', price: 60 },
    { id: 'plum', name: 'Plum', color: '#6b3fa0', price: 60 },
    { id: 'teal', name: 'Teal', color: '#0f7c7c', price: 60 },
    { id: 'gold', name: 'Gold lamé', color: '#c9951f', price: 300 },
  ];
  const SKINS = ['#f7d7c0', '#e8b894', '#c98e62', '#8d5a3b', '#5a3825'];
  const HAIRS = ['short', 'bun', 'curly', 'long', 'bald'];
  const HAIR_COLORS = ['#1f1a17', '#3b2a20', '#8a5a2b', '#d9a441', '#b5452f', '#9aa0a6'];
  const HATS = [
    { id: 'cap', name: 'Baseball cap', price: 80 },
    { id: 'hardhat', name: 'Hard hat', price: 100 },
    { id: 'headset', name: 'Call-centre headset', price: 90 },
    { id: 'shades', name: 'Trading-floor shades', price: 120 },
    { id: 'tophat', name: 'Top hat', price: 150 },
    { id: 'bowtie', name: 'Bow tie', price: 70 },
    { id: 'monocle', name: 'Monocle', price: 140 },
    { id: 'wizard', name: 'Spreadsheet wizard hat', price: 250 },
    { id: 'halo', name: 'Audit-clean halo', price: 220 },
    { id: 'crown', name: 'CFO crown', price: 500 },
  ];

  function hairSVG(style, c) {
    switch (style) {
      case 'bun': return `<circle cx="100" cy="22" r="15" fill="${c}" stroke="${INK}" stroke-width="3.5"/><path d="M60 70 Q58 30 100 28 Q142 30 140 70 Q128 50 100 48 Q72 50 60 70 Z" fill="${c}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
      case 'curly': { let s = ''; [[66, 50], [78, 36], [94, 30], [110, 30], [124, 36], [136, 50]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="13" fill="${c}" stroke="${INK}" stroke-width="3.5"/>`; }); return s + `<path d="M58 62 Q60 40 100 38 Q140 40 142 62 Q120 52 100 52 Q80 52 58 62 Z" fill="${c}"/>`; }
      case 'long': return `<path d="M58 96 Q50 40 100 30 Q150 40 142 96 L136 110 Q140 60 118 50 Q100 60 82 50 Q60 60 64 110 Z" fill="${c}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
      case 'bald': return `<path d="M72 40 Q84 34 96 36" fill="none" stroke="#fff" stroke-width="4" opacity="0.4" stroke-linecap="round"/>`;
      default: return `<path d="M60 70 Q56 28 100 28 Q144 28 140 70 Q134 52 118 48 Q104 58 86 50 Q70 52 60 70 Z" fill="${c}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
    }
  }

  const HEAD = { top: 32, eyeY: 74, mouthY: 92, left: 60, right: 140, bottom: 112, dx: 14 };

  /** Player avatar SVG. av = {suit, skin, hair, hairColor, hat} */
  function avatarSVG(av, opts) {
    av = av || {};
    opts = opts || {};
    const suit = av.suit || '#2451b7', skin = av.skin || SKINS[1], hc = av.hairColor || HAIR_COLORS[1];
    let s = `<svg class="ava-svg" viewBox="-10 -40 220 250" role="img" aria-label="Your character" xmlns="http://www.w3.org/2000/svg">`;
    s += `<ellipse cx="100" cy="194" rx="46" ry="8" fill="#000" opacity="0.16"/><g class="ava">`;
    // legs + shoes
    s += `<rect x="80" y="160" width="16" height="28" rx="5" fill="#2b2f3a" stroke="${INK}" stroke-width="3"/><rect x="104" y="160" width="16" height="28" rx="5" fill="#2b2f3a" stroke="${INK}" stroke-width="3"/>`;
    s += `<ellipse cx="86" cy="190" rx="13" ry="6" fill="#15171c"/><ellipse cx="114" cy="190" rx="13" ry="6" fill="#15171c"/>`;
    // body
    s += `<path d="M56 172 Q56 118 100 110 Q144 118 144 172 Z" fill="${suit}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    s += `<path d="M86 112 L100 142 L114 112 Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<path d="M96 116 H104 L106 146 L100 154 L94 146 Z" fill="#d64545" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<path d="M84 113 L96 146 L78 132 Z M116 113 L104 146 L122 132 Z" fill="${shade(suit, -0.22)}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
    // arms + calculator
    s += `<path d="M62 128 Q52 146 66 156" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M62 128 Q52 146 66 156" fill="none" stroke="${suit}" stroke-width="7" stroke-linecap="round"/>`;
    s += `<rect x="118" y="126" width="30" height="40" rx="5" fill="#2d3140" stroke="${INK}" stroke-width="3" transform="rotate(8 133 146)"/><rect x="122" y="130" width="22" height="9" rx="2" fill="#9fd3a8" transform="rotate(8 133 146)"/>`;
    s += `<g transform="rotate(8 133 146)" fill="#f2c14e"><circle cx="126" cy="146" r="2.2"/><circle cx="133" cy="146" r="2.2"/><circle cx="140" cy="146" r="2.2"/><circle cx="126" cy="153" r="2.2"/><circle cx="133" cy="153" r="2.2"/><circle cx="140" cy="153" r="2.2" fill="#e0662f"/></g>`;
    s += `<circle cx="68" cy="156" r="7" fill="${skin}" stroke="${INK}" stroke-width="3"/><circle cx="124" cy="160" r="7" fill="${skin}" stroke="${INK}" stroke-width="3"/>`;
    // head
    if (av.hair === 'long') s += hairSVG('long', hc);
    s += `<circle cx="100" cy="72" r="40" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
    if (av.hair !== 'long') s += hairSVG(av.hair || 'short', hc);
    else s += `<path d="M62 64 Q70 38 100 36 Q130 38 138 64 Q120 50 100 50 Q80 50 62 64 Z" fill="${hc}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
    s += `<g class="eyes"><ellipse cx="86" cy="76" rx="4.8" ry="6.2" fill="${INK}"/><ellipse cx="114" cy="76" rx="4.8" ry="6.2" fill="${INK}"/><circle cx="84.5" cy="73.5" r="1.7" fill="#fff"/><circle cx="112.5" cy="73.5" r="1.7" fill="#fff"/></g>`;
    s += opts.sad ? `<path d="M88 96 Q100 88 112 96" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`
      : `<path d="M88 90 Q100 101 112 90" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
    s += `<ellipse cx="76" cy="88" rx="7" ry="4" fill="#ff8fa3" opacity="0.45"/><ellipse cx="124" cy="88" rx="7" ry="4" fill="#ff8fa3" opacity="0.45"/>`;
    if (av.hat) {
      const eyes = [[86, 76, 7, 8], [114, 76, 7, 8]];
      s += acc(av.hat, HEAD, eyes, '#d64545');
    }
    s += '</g></svg>';
    return s;
  }

  root.ART = { monsterSVG, avatarSVG, shade, SUITS, SKINS, HAIRS, HAIR_COLORS, HATS, INK };
})(typeof window !== 'undefined' ? window : globalThis);
