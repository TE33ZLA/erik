/* Corporate Ladder — rich text renderer.
 * Question text uses \( inline \) and \[ display \] LaTeX (rendered by KaTeX),
 * **bold**, and \n for line breaks. Plain "$" is just a dollar sign.
 * Numbers in prose get a highlight span (a reading aid that can be switched off).
 * texToSpeech() turns LaTeX into words for the read-aloud button.
 */
(function (root) {
  'use strict';

  const MATH_RE = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  const NUM_RE = /[−-]?(?:\$\s?)?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?/g;
  const cache = new Map();

  const KATEX_OPTS = { throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function segments(str) {
    const out = [];
    let last = 0;
    String(str).replace(MATH_RE, (m, inl, disp, idx) => {
      if (idx > last) out.push({ type: 'text', v: str.slice(last, idx) });
      out.push(inl !== undefined ? { type: 'math', v: inl } : { type: 'display', v: disp });
      last = idx + m.length;
      return m;
    });
    if (last < str.length) out.push({ type: 'text', v: str.slice(last) });
    return out;
  }

  function mathHTML(tex, display) {
    const key = (display ? 'D' : 'I') + tex;
    if (cache.has(key)) return cache.get(key);
    let html;
    const k = root.katex;
    if (k && k.renderToString) {
      try { html = k.renderToString(tex, Object.assign({ displayMode: !!display }, KATEX_OPTS)); }
      catch (e) { html = '<code>' + esc(tex) + '</code>'; }
    } else {
      html = '<code class="tex-fallback">' + esc(tex) + '</code>';
    }
    if (display) html = '<div class="mathblock">' + html + '</div>';
    if (cache.size > 4000) cache.clear();
    cache.set(key, html);
    return html;
  }

  function textHTML(txt, opts) {
    const hl = opts.highlight !== false;
    // question text is often written with String.raw, so a literal backslash-n also means a line break
    txt = txt.replace(/\\n/g, '\n');
    // bold toggles on **
    const parts = txt.split('**');
    return parts.map((p, k) => {
      let h;
      if (hl) {
        h = '';
        let last = 0;
        p.replace(NUM_RE, (m, idx) => {
          // skip digits glued to letters (e.g. "Q3", "W1", "t2") — they are labels, not quantities
          const before = p[idx - 1];
          if (before && /[A-Za-z_]/.test(before)) return m;
          h += esc(p.slice(last, idx)) + '<span class="nm">' + esc(m) + '</span>';
          last = idx + m.length;
          return m;
        });
        h += esc(p.slice(last));
      } else h = esc(p);
      h = h.replace(/\n/g, '<br>');
      return k % 2 === 1 ? '<strong>' + h + '</strong>' : h;
    }).join('');
  }

  /** Render a rich string to HTML. opts: {highlight:true, name:'Player'} */
  function rich(str, opts) {
    opts = opts || {};
    if (str === undefined || str === null) return '';
    let s = String(str);
    if (s.indexOf('{NAME}') >= 0) s = s.split('{NAME}').join(opts.name || 'you');
    return segments(s).map((seg) => {
      if (seg.type === 'text') return textHTML(seg.v, opts);
      return mathHTML(seg.v.trim(), seg.type === 'display');
    }).join('');
  }

  /* ---------- LaTeX -> words ---------- */
  const GREEK = { alpha: 'alpha', beta: 'beta', gamma: 'gamma', delta: 'delta', epsilon: 'epsilon', lambda: 'lambda', mu: 'mu', pi: 'pi', rho: 'rho', sigma: 'sigma', tau: 'tau', phi: 'phi', omega: 'omega', theta: 'theta', Delta: 'change in', Sigma: 'sum', infty: 'infinity' };
  const WORDS = {
    times: ' times ', cdot: ' times ', div: ' divided by ', pm: ' plus or minus ', approx: ' is about ', neq: ' is not equal to ',
    ge: ' is at least ', geq: ' is at least ', le: ' is at most ', leq: ' is at most ', to: ' to ', rightarrow: ' gives ', Rightarrow: ' so ',
    implies: ' so ', ldots: ' and so on ', dots: ' and so on ', cdots: ' and so on ', quad: ' ', qquad: ' ', sum: ' the sum of ', prod: ' the product of ',
    text: '', mathrm: '', textbf: '', mathbf: '', operatorname: '', left: '', right: '', big: '', Big: '', bigg: '', Bigg: '', displaystyle: '', underbrace: '', overbrace: '',
  };

  function readGroup(s, i) {
    // s[i] should be '{'; returns [content, nextIndex]
    if (s[i] !== '{') {
      // single token (command or char)
      if (s[i] === '\\') { let j = i + 1; while (j < s.length && /[A-Za-z]/.test(s[j])) j++; if (j === i + 1) j++; return [s.slice(i, j), j]; }
      return [s[i] || '', i + 1];
    }
    let depth = 0, j = i;
    for (; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') { depth--; if (depth === 0) break; }
    }
    return [s.slice(i + 1, j), j + 1];
  }

  function texToSpeech(tex) {
    let s = String(tex);
    s = s.replace(/\{,\}/g, ',');
    s = s.replace(/-\\\$\s*([\d,]+(?:\.\d+)?)/g, ' minus $1 dollars ');
    s = s.replace(/\\\$\s*([\d,]+(?:\.\d+)?)/g, ' $1 dollars ');
    s = s.replace(/\\\$/g, ' dollars ');
    s = s.replace(/\\%/g, ' percent');
    s = s.replace(/\\[,;:! ]/g, ' ');
    let out = '';
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '\\') {
        let j = i + 1;
        while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
        const cmd = s.slice(i + 1, j);
        if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
          const [a, k1] = readGroup(s, j);
          const [b, k2] = readGroup(s, k1);
          out += ' ' + texToSpeech(a) + ' over ' + texToSpeech(b) + ' ';
          i = k2; continue;
        }
        if (cmd === 'sqrt') { const [a, k1] = readGroup(s, j); out += ' the square root of ' + texToSpeech(a) + ' '; i = k1; continue; }
        if (cmd in GREEK) { out += ' ' + GREEK[cmd] + ' '; i = j; continue; }
        if (cmd in WORDS) { out += WORDS[cmd]; i = j; continue; }
        if (cmd === 'ln') { out += ' natural log of '; i = j; continue; }
        if (cmd === 'max') { out += ' the maximum of '; i = j; continue; }
        if (!cmd) { i = j + 1; continue; }
        out += ' ' + cmd + ' ';
        i = j; continue;
      }
      if (c === '^') {
        const [a, k1] = readGroup(s, i + 1);
        const sp = texToSpeech(a).trim();
        out += sp === '2' ? ' squared ' : ' to the power of ' + sp + ' ';
        i = k1; continue;
      }
      if (c === '_') { const [a, k1] = readGroup(s, i + 1); out += ' ' + texToSpeech(a) + ' '; i = k1; continue; }
      if (c === '=') { out += ' equals '; i++; continue; }
      if (c === '+') { out += ' plus '; i++; continue; }
      if (c === '-' || c === '−') { out += ' minus '; i++; continue; }
      if (c === '<') { out += ' is less than '; i++; continue; }
      if (c === '>') { out += ' is greater than '; i++; continue; }
      if (c === '{' || c === '}' || c === '&') { out += ' '; i++; continue; }
      out += c; i++;
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  /** Speakable plain text for a rich string. */
  function speech(str, opts) {
    opts = opts || {};
    let s = String(str || '');
    if (s.indexOf('{NAME}') >= 0) s = s.split('{NAME}').join(opts.name || 'you');
    return segments(s).map((seg) => (seg.type === 'text' ? seg.v.replace(/\*\*/g, '').replace(/\\n/g, '\n').replace(/\n+/g, '. ') : ' ' + texToSpeech(seg.v) + ' '))
      .join('').replace(/\s+/g, ' ').trim();
  }

  root.RENDER = { rich, speech, segments, texToSpeech, esc, mathHTML, KATEX_OPTS };
})(typeof window !== 'undefined' ? window : globalThis);
