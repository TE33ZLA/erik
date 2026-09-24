/* Corporate Ladder — main screens: onboarding, tower, floors, codex. */
(function (root) {
  'use strict';
  const { GAME, UI, ART, SFX, RENDER, FORMULAS, QS, QVIEW } = root;
  const esc = RENDER.esc;
  const S = () => GAME.store.state;

  /* ---------------- helpers ---------------- */
  function floorProgress(pack) {
    const s = S();
    const max = pack.nodes.length * 3;
    const got = pack.nodes.reduce((a, n) => a + ((s.nodes[n.id] || {}).stars || 0), 0);
    const bossDone = pack.nodes.filter((n) => n.kind === 'boss').every((n) => (s.nodes[n.id] || {}).wins > 0);
    return { got, max, pct: max ? Math.round((got / max) * 100) : 0, bossDone };
  }
  function nextNode(pack) {
    const s = S();
    return pack.nodes.find((n) => !((s.nodes[n.id] || {}).stars > 0)) || null;
  }
  function continueTarget() {
    const s = S();
    const packs = root.PACKS;
    const last = GAME.packById(s.last.floor) || packs[0];
    let n = nextNode(last);
    if (n) return { pack: last, node: n };
    for (const p of packs) { n = nextNode(p); if (n) return { pack: p, node: n }; }
    return { pack: last, node: last.nodes[0] };
  }
  function starStr(k) { return [1, 2, 3].map((i) => `<span class="${i <= k ? 'on' : ''}">★</span>`).join(''); }
  function formulasOf(pack) {
    const ids = new Set();
    pack.questions.forEach((q) => q.formula && ids.add(q.formula));
    pack.generators.forEach((g) => g.formula && ids.add(g.formula));
    return [...ids].filter((id) => FORMULAS.byId[id]);
  }
  GAME.helpers = { floorProgress, nextNode, continueTarget, starStr, formulasOf };

  /* ---------------- onboarding ---------------- */
  GAME.screens.title = () => {
    const s = S();
    const av = s.avatar;
    GAME.after = (el) => { const i = el.querySelector('#pname'); if (i) i.focus(); };
    const sw = (list, key, cur) => list.map((c) => `<button type="button" class="swatch${cur === c ? ' on' : ''}" style="--sw:${c}" data-act="ava-set" data-k="${key}" data-v="${c}" aria-label="${key} colour" aria-pressed="${cur === c}"></button>`).join('');
    return `<section class="title-screen">
      <div class="title-hero">
        <p class="eyebrow">BFC2140 Corporate Finance</p>
        <h1 class="logo" aria-label="Corporate Ladder"><span>Corporate</span><span>Ladder</span></h1>
        <p class="tagline">Start as an intern. Beat the finance fiends on every floor. Reach the boardroom as <b>CFO</b>.</p>
        <ul class="title-points"><li>9 floors, one per week of the unit, from time value of money to risk and return.</li><li>Every calculation comes with a worked solution in LaTeX and HP10bII+ keystrokes.</li><li>Built for dyslexic readers: read-aloud, number highlighting, relaxed timers and font choices.</li></ul>
      </div>
      <form class="newgame card" data-submit="start-game" autocomplete="off">
        <h2>Create your character</h2>
        <div class="ng-grid">
          <div class="ng-preview" id="ng-preview" aria-hidden="true">${ART.avatarSVG(av)}</div>
          <div class="ng-fields">
            <label for="pname">Your name</label>
            <input id="pname" name="pname" maxlength="18" value="${esc(s.name)}" placeholder="e.g. Erik" required>
            <fieldset><legend>Suit</legend><div class="swatches">${sw(ART.SUITS.filter((x) => x.price === 0).map((x) => x.color), 'suit', av.suit)}</div></fieldset>
            <fieldset><legend>Skin tone</legend><div class="swatches">${sw(ART.SKINS, 'skin', av.skin)}</div></fieldset>
            <fieldset><legend>Hair</legend><div class="seg">${ART.HAIRS.map((h) => `<button type="button" class="seg-btn${av.hair === h ? ' on' : ''}" data-act="ava-set" data-k="hair" data-v="${h}" aria-pressed="${av.hair === h}">${h}</button>`).join('')}</div>
              <div class="swatches">${sw(ART.HAIR_COLORS, 'hairColor', av.hairColor)}</div></fieldset>
          </div>
        </div>
        <button type="submit" class="btn primary big">Start climbing ▶</button>
        <p class="muted small">Reading options (fonts, text size, read-aloud) live in ⚙️ Settings at any time.</p>
      </form>
    </section>`;
  };

  /* ---------------- tower (hub) ---------------- */
  GAME.screens.tower = () => {
    const s = S();
    const lvl = GAME.levelOf(s.xp);
    const packs = root.PACKS.slice().sort((a, b) => b.floor - a.floor);
    const cont = continueTarget();
    const achN = Object.keys(s.ach).length;
    const floors = packs.map((p) => {
      const pr = floorProgress(p);
      const here = s.last.floor === p.id;
      return `<button class="floor-row${here ? ' here' : ''}${pr.bossDone ? ' cleared' : ''}" data-act="goto-floor" data-floor="${p.id}" style="--floor:${p.color}">
        <span class="fl-num" aria-hidden="true">${p.floor}</span>
        <span class="fl-info"><b>${esc(p.title)}</b><small>${esc(p.week)} · ${esc(p.topic)}</small></span>
        <span class="fl-prog"><span class="fl-stars" aria-label="${pr.got} of ${pr.max} stars">★ ${pr.got}/${pr.max}</span><span class="pbar" aria-hidden="true"><i style="width:${pr.pct}%"></i></span></span>
        <span class="fl-icon" aria-hidden="true">${pr.bossDone ? '✅' : p.icon}</span>
        ${here ? `<span class="you" aria-label="You are here">${ART.avatarSVG(s.avatar)}</span>` : ''}
      </button>`;
    }).join('');
    return `<section class="tower-screen">
      <div class="tower-col">
        <div class="tower" aria-label="The tower. Each floor is one week of BFC2140.">
          <div class="roof" aria-hidden="true"><i></i></div>
          <button class="penthouse" data-act="goto-exam"><span class="ph-lbl">Penthouse</span><b>The Boardroom</b><small>Exam arena: mixed MST-style questions from any floors</small></button>
          ${floors}
          <div class="lobby"><span>Lobby</span><small>BFC2140 · Corporate Finance</small></div>
        </div>
      </div>
      <aside class="hub-side">
        <div class="card player-card">
          <div class="pc-ava" aria-hidden="true">${ART.avatarSVG(s.avatar)}</div>
          <div class="pc-info"><h1 class="pc-name">${esc(s.name || 'You')}</h1><p>Level ${lvl} · <b>${esc(GAME.titleOf(lvl))}</b></p>
            <p class="muted small">${s.stats.answered} answered · ${s.stats.answered ? Math.round((s.stats.correct / s.stats.answered) * 100) : 0}% correct · best streak ${s.stats.bestStreak}</p>
            <p class="pc-money"><span>Wallet <b>$${s.wallet.toLocaleString('en-AU')}</b></span><span>Vault <b>$${s.vault.bal.toLocaleString('en-AU', { maximumFractionDigits: 2 })}</b></span></p></div>
        </div>
        <button class="btn primary big wide" data-act="play-node" data-node="${cont.node.id}">▶ Continue: ${esc(cont.node.name)} <small>Floor ${cont.pack.floor}</small></button>
        <nav class="hub-menu" aria-label="Menu">
          <button data-act="smart-review"><span aria-hidden="true">🌙</span><b>Smart Review</b><small>Practise your weakest topics</small></button>
          <button data-act="goto-exam"><span aria-hidden="true">🎓</span><b>Boardroom exam</b><small>MST-style practice test</small></button>
          <button data-act="goto" data-s="journal"><span aria-hidden="true">📒</span><b>Mistake Ledger</b><small>${s.journal.length} to fix</small></button>
          <button data-act="goto" data-s="codex"><span aria-hidden="true">📘</span><b>Formula Codex</b><small>The whole formula sheet</small></button>
          <button data-act="goto" data-s="shop"><span aria-hidden="true">🏪</span><b>Company Store</b><small>Items, outfits and the vault</small></button>
          <button data-act="goto" data-s="stats"><span aria-hidden="true">📊</span><b>Performance Review</b><small>Mastery by topic</small></button>
          <button data-act="goto" data-s="achievements"><span aria-hidden="true">🏆</span><b>Achievements</b><small>${achN} of ${GAME.ACH.length}</small></button>
          <button data-act="open-help"><span aria-hidden="true">❓</span><b>How to play</b><small>Controls and tips</small></button>
        </nav>
      </aside>
    </section>`;
  };

  /* ---------------- floor ---------------- */
  GAME.screens.floor = (p) => {
    const pack = GAME.packById(p.id) || root.PACKS[0];
    const s = S();
    s.last.floor = pack.id; GAME.store.save();
    const nxt = nextNode(pack);
    const stops = pack.nodes.map((n, i) => {
      const rec = s.nodes[n.id] || {};
      const kindLbl = n.kind === 'boss' ? 'Boss' : n.kind === 'mini' ? 'Mini-game' : 'Battle';
      const spec = n.kind === 'mini' ? pack.minis[n.mini] : null;
      const portrait = n.kind === 'mini' ? `<span class="stop-ico" aria-hidden="true">🕹️</span>` : `<span class="stop-mon" aria-hidden="true">${ART.monsterSVG(n.enemy, { boss: n.kind === 'boss' })}</span>`;
      const topics = n.kind === 'mini' ? `<span class="chip">${esc(spec ? spec.title : 'Arcade')}</span>` : (n.topics === '*' ? '<span class="chip">All topics</span>' : n.topics.map((t) => `<span class="chip">${esc(pack.topics[t] || t)}</span>`).join(''));
      return `<li class="stop kind-${n.kind}${nxt && nxt.id === n.id ? ' next' : ''}${rec.stars ? ' done' : ''}">
        <span class="stop-n" aria-hidden="true">${i + 1}</span>
        ${portrait}
        <div class="stop-body"><span class="stop-kind">${kindLbl}${nxt && nxt.id === n.id ? ' · <b>next up</b>' : ''}</span><h3>${esc(n.name)}</h3>
          ${n.enemy ? `<p class="stop-foe">vs <b>${esc(n.enemy.name)}</b>, ${esc(n.enemy.title || '')}</p>` : ''}
          <div class="chips">${topics}</div></div>
        <div class="stop-act"><span class="stars sm" aria-label="${rec.stars || 0} of 3 stars">${starStr(rec.stars || 0)}</span>
          <button class="btn${nxt && nxt.id === n.id ? ' primary' : ''}" data-act="play-node" data-node="${n.id}">${n.kind === 'boss' ? 'Face the boss' : n.kind === 'mini' ? 'Play' : rec.wins ? 'Fight again' : 'Fight'}</button></div>
      </li>`;
    }).join('');
    const topics = Object.entries(pack.topics).map(([t, label]) => {
      const m = QS.mastery(pack.id, t);
      const rec = s.stats.topics[QS.topicKey(pack.id, t)];
      const pct = m === null ? 0 : Math.round(m * 100);
      return `<li><div class="tm-top"><span>${esc(label)}</span><span class="muted small">${rec ? `${rec.c}/${rec.a}` : 'new'}</span></div><div class="tm-row"><span class="pbar${m !== null && m < 0.6 ? ' weak' : ''}" aria-label="Mastery ${pct}%"><i style="width:${pct}%"></i></span><button class="chip-btn" data-act="practice" data-pack="${pack.id}" data-topic="${esc(t)}">Practise</button></div></li>`;
    }).join('');
    const fids = formulasOf(pack);
    return `<section class="floor-screen" style="--floor:${pack.color}">
      <header class="floor-head">
        <button class="linkbtn" data-act="goto-tower">← Tower</button>
        <p class="eyebrow">Floor ${pack.floor} · ${esc(pack.week)}</p>
        <h1>${esc(pack.title)}</h1>
        <p class="fh-topic">${esc(pack.topic)}</p>
        <p class="fh-intro">${UI.rich(pack.intro)}</p>
      </header>
      <div class="floor-grid">
        <div><h2 class="sec-h">The route</h2><ol class="route">${stops}</ol></div>
        <aside class="floor-side">
          <section class="card"><div class="card-h"><h2>Briefing notes</h2><button class="icon-btn" data-act="open-briefing" data-floor="${pack.id}" aria-label="Open the briefing notes">⤢</button></div>
            <p class="muted small">The key ideas of ${esc(pack.week)} on one page. Read them before the boss.</p>
            <button class="btn wide" data-act="open-briefing" data-floor="${pack.id}">📖 Read the briefing</button></section>
          <section class="card"><h2>Topic mastery</h2><ul class="mastery">${topics}</ul></section>
          ${fids.length ? `<section class="card"><h2>Formulas on this floor</h2><div class="fc-list">${fids.map((id) => QVIEW.formulaCard(id, true)).join('')}</div></section>` : ''}
        </aside>
      </div>
    </section>`;
  };

  function briefingHTML(pack) {
    return `<div class="briefing">${pack.briefing.map((b, i) => `<section class="brief-sec"><div class="card-h"><h3>${esc(b.h)}</h3><button class="icon-btn" data-act="speak-brief" data-floor="${pack.id}" data-i="${i}" aria-label="Read this section aloud">🔊</button></div><ul>${b.points.map((pt) => `<li>${UI.rich(pt)}</li>`).join('')}</ul></section>`).join('')}</div>`;
  }

  /* ---------------- codex ---------------- */
  GAME.screens.codex = () => {
    const s = S();
    s.stats.codexOpens++; GAME.store.save();
    GAME.checkAchievements({ type: 'codex' });
    GAME.after = (el) => {
      const f = el.querySelector('#codex-q');
      f.addEventListener('input', () => {
        const q = f.value.trim().toLowerCase();
        el.querySelectorAll('.codex-card').forEach((c) => { c.hidden = q && !c.dataset.text.includes(q); });
        el.querySelectorAll('.codex-group').forEach((g) => { g.hidden = ![...g.querySelectorAll('.codex-card')].some((c) => !c.hidden); });
      });
    };
    const groups = FORMULAS.GROUPS.map((g) => {
      const cards = FORMULAS.CARDS.filter((c) => c.group === g.id).map((c) => {
        const n = s.stats.formulas[c.id] || 0;
        return `<article class="codex-card${n >= 3 ? ' mastered' : ''}" data-text="${esc((c.name + ' ' + c.when + ' ' + c.id).toLowerCase())}">${QVIEW.formulaCard(c.id)}<p class="muted small">${n >= 3 ? '🥇 Mastered: ' : 'Used correctly '}${n} time${n === 1 ? '' : 's'}</p></article>`;
      }).join('');
      return `<section class="codex-group"><h2>${esc(g.name)} <small class="muted">${esc(g.floor)}</small></h2><div class="codex-grid">${cards}</div></section>`;
    }).join('');
    return `<section class="page">
      <header class="page-head"><button class="linkbtn" data-act="goto-tower">← Tower</button><h1>Formula Codex</h1>
        <p>Every formula from the BFC2140 formula sheet, plus the lecture formulas you must remember. Cards turn gold after 3 correct answers that use them.</p>
        <label for="codex-q" class="sr-only">Search formulas</label><input id="codex-q" class="search" placeholder="Search, e.g. annuity, EAR, beta" autocomplete="off"></header>
      ${groups}
    </section>`;
  };

  function sheetModal() {
    const cur = GAME.current.name === 'battle' && root.BATTLE.state && root.BATTLE.state.pack;
    const order = FORMULAS.GROUPS.slice();
    const body = `<p class="muted small">This is what you get on the exam formula sheet (plus “remember this” lecture formulas).</p><label for="sheet-q" class="sr-only">Search</label><input id="sheet-q" class="search" placeholder="Search formulas" autocomplete="off">` +
      order.map((g) => `<section class="codex-group"><h3>${esc(g.name)}</h3><div class="fc-list">${FORMULAS.CARDS.filter((c) => c.group === g.id).map((c) => `<div class="codex-card" data-text="${esc((c.name + ' ' + c.when).toLowerCase())}">${QVIEW.formulaCard(c.id, true)}</div>`).join('')}</div></section>`).join('');
    const m = UI.modal({ title: '📘 Formula sheet', body, wide: true, focus: '#sheet-q' });
    const f = m.el.querySelector('#sheet-q');
    f.addEventListener('input', () => {
      const q = f.value.trim().toLowerCase();
      m.el.querySelectorAll('.codex-card').forEach((c) => { c.hidden = q && !c.dataset.text.includes(q); });
      m.el.querySelectorAll('.codex-group').forEach((g) => { g.hidden = ![...g.querySelectorAll('.codex-card')].some((c) => !c.hidden); });
    });
    if (cur) {
      const fids = formulasOf(cur);
      if (fids.length) { const first = m.el.querySelector('.codex-card'); if (first) first.scrollIntoView({ block: 'start' }); }
    }
  }

  /* ---------------- actions ---------------- */
  Object.assign(GAME.actions, {
    'ava-set': (el) => {
      const k = el.dataset.k, v = el.dataset.v;
      S().avatar[k] = v;
      el.parentElement.querySelectorAll('[data-act="ava-set"]').forEach((b) => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      const pv = document.getElementById('ng-preview'); if (pv) pv.innerHTML = ART.avatarSVG(S().avatar);
      SFX.play('click');
    },
    'start-game': (form) => {
      const name = form.querySelector('#pname').value.trim().slice(0, 18);
      if (!name) { UI.toast('Type a name first.', 'warn'); return; }
      const s = S(); s.name = name; s.started = true;
      GAME.store.save();
      SFX.unlock(); SFX.play('levelup');
      GAME.go('tower');
      setTimeout(() => GAME.actions['open-help'](), 400);
    },
    'goto-tower': () => GAME.go('tower'),
    'goto-floor': (el) => GAME.go('floor', { id: el.dataset.floor }),
    goto: (el) => GAME.go(el.dataset.s),
    'play-node': (el) => {
      const f = GAME.nodeById(el.dataset.node);
      if (!f) return;
      UI.closeModal();
      SFX.unlock(); SFX.play('open');
      if (f.node.kind === 'mini') GAME.go('mini', { nodeId: f.node.id });
      else GAME.go('battle', { nodeId: f.node.id });
    },
    'open-briefing': (el) => {
      const pack = GAME.packById(el.dataset.floor);
      if (!pack) return;
      UI.modal({ title: `📖 Briefing: ${esc(pack.title)}`, body: briefingHTML(pack), wide: true });
    },
    'speak-brief': (el) => {
      const pack = GAME.packById(el.dataset.floor);
      const b = pack && pack.briefing[+el.dataset.i];
      if (b) UI.speak(b.h + '. ' + b.points.map((p) => UI.say(p)).join('. '));
    },
    'open-sheet': () => sheetModal(),
    'show-formula': (el) => { UI.modal({ title: '📘 Formula', body: QVIEW.formulaCard(el.dataset.f) }); },
    practice: (el) => GAME.go('battle', { practice: true, topics: [{ pack: el.dataset.pack, topic: el.dataset.topic }], n: 6, title: 'Practice: ' + QS.topicLabel(el.dataset.pack, el.dataset.topic) }),
    'smart-review': () => {
      const rep = QS.topicReport().filter((t) => t.a > 0).sort((a, b) => a.m - b.m);
      const weak = rep.slice(0, 5).map((t) => ({ pack: t.pack.id, topic: t.topic }));
      S().journal.slice(0, 6).forEach((j) => { if (!weak.some((w) => w.pack === j.pack && w.topic === j.topic)) weak.push({ pack: j.pack, topic: j.topic }); });
      GAME.go('battle', { review: true, topics: weak.length ? weak : null, n: 8, title: 'Night Shift: Smart Review' });
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
