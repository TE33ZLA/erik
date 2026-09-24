# Corporate Ladder

A dyslexia-friendly RPG for learning **BFC2140 Corporate Finance**. You start as an intern
at the bottom of a corporate tower. Each floor is one week of the unit. Beat the finance
monsters on every floor, defeat the floor boss, and climb to the Boardroom as **CFO**.

## Play it

- **Easiest:** open `dist/corporate-ladder.html` in any modern browser (Chrome, Edge, Safari, Firefox).
  It is one self-contained file. It needs an internet connection only to load KaTeX, confetti and the web fonts.
- **From the source:** run `npm run serve` (or any static web server) in this folder, then open `http://localhost:8080`.
  Opening `index.html` directly from disk also works in most browsers.

Progress saves in your browser automatically. Use **Settings → Copy save code** to move it to another device.

## What is inside

| Floor | Week | Topic |
|---|---|---|
| 1 · The Clock Tower | Week 1 | Corporate goals, time value of money, compounding, EAR |
| 2 · Annuity Arcade | Week 2 | Mixed streams, perpetuities, annuities, loans |
| 3 · The Bond & Share Bazaar | Week 3 | Bond pricing, yields, interest-rate risk, dividend discount models |
| 4 · The Project Colosseum | Week 4 | Payback, NPV, IRR, crossover, PI and capital rationing, unequal lives |
| 5 · The Cash Flow Factory | Week 5 | Free cash flow, relevant cash flows, inflation, replacement decisions |
| 6 · The Uncertainty Lab | Week 7 | Break-even, sensitivity, scenarios, decision trees |
| 7 · The Working Capital Warehouse | Week 8 | Cash conversion cycle, trade credit, payables and receivables |
| 8 · The Risk Casino | Week 9 | Returns, variance, correlation, portfolios, beta, CAPM, SML |
| 9 · The Capital Summit | Weeks 10–11 (preview) | WACC and capital structure, built from the formula sheet |
| Penthouse · The Boardroom | All | MST-style practice exams (Section A 0.5 marks, Section B 2 marks) |

Every floor has study notes (the briefing), battles, mini-games and a boss. Calculation
questions are **generated with fresh numbers every time**, so you can practise forever.
Every answer comes with an explanation, a worked solution in LaTeX, and HP10bII+
keystrokes. Wrong answers go into the **Mistake Ledger** so you can retry them.

Other features:

- 🧮 A financial calculator with the HP10bII+ sign convention: a TVM solver (N, I/YR, PV, PMT, FV, P/YR, BEG/END), a NOM%/EFF% converter,
  cash flows (NPV, IRR, payback), sample statistics (mean, Sx, covariance, correlation) and a scientific mode.
- 📘 The Formula Codex: the whole BFC2140 formula sheet, searchable, with "when to use it" notes.
- 🌙 Smart Review targets your weakest topics. 📊 Performance Review shows mastery by topic.
- 🏦 A savings vault that pays compound interest after each win. Pick the account with the highest EAR.

## Built for dyslexic readers

- All maths is typeset in LaTeX (KaTeX).
- Fonts: **Lexend** (default), **Atkinson Hyperlegible**, or **OpenDyslexic**.
- Adjustable text size, line spacing and letter spacing. Paper tints (ledger green, cream, pale blue, peach, white) and a dark theme.
- **Read aloud** on every question, answer and briefing section (browser speech), with speed and voice settings.
- Numbers in questions are highlighted, and a **Given** panel lists each value in LaTeX.
- No timers in battles. Mini-game timers can be relaxed or switched off. Reduced motion is respected.
- Keyboard play: `A`–`D` or `1`–`4` to answer, `T`/`F` for true/false, `Enter` for next, `H` for a hint, `S` to read aloud.

## Libraries and assets used

| What | Why | Licence |
|---|---|---|
| [KaTeX](https://katex.org) 0.18.9 | Renders all LaTeX maths | MIT |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) 1.9.4 | Victory confetti | ISC |
| [Lexend](https://www.lexend.com), [Atkinson Hyperlegible Next](https://www.brailleinstitute.org/freefont/), Bungee, IBM Plex Mono (Google Fonts) | Reading, display and calculator fonts | SIL OFL |
| [OpenDyslexic](https://opendyslexic.org) via [@fontsource/opendyslexic](https://fontsource.org) | Optional dyslexia font | SIL OFL |

Monsters, the player character, charts, timelines, decision trees and sound effects are all
drawn or synthesised in code, so there are no image or audio files.

## Project layout

```
index.html              the game shell (loads everything below)
css/game.css            all styles (light "ledger" theme + dark "trading floor" theme)
css/katex-inline.css    KaTeX CSS with fonts embedded (generated)
css/opendyslexic.css    OpenDyslexic fonts embedded (generated)
js/lib/fin.js           finance maths: TVM, bonds, DDM, NPV/IRR, statistics, CAPM, WACC
js/lib/fmt.js           LaTeX/plain number formatting and a seeded random generator
js/lib/render.js        text + LaTeX rendering, number highlighting, LaTeX-to-speech
js/lib/qcore.js         answer parsing, tolerances, distractor building
js/lib/art.js           SVG monsters and the player avatar
js/lib/charts.js        timelines, tables, NPV profiles, SML charts, decision trees
js/lib/sfx.js           Web Audio sound effects
js/data/formulas.js     the formula codex
js/data/w*.js           one content pack per floor (see docs/CONTENT_GUIDE.md)
js/engine/*.js          screens, battles, mini-games, calculator, exam, store, settings
tests/                  finance tests against the course's worked answers + content validator
tools/build.js          builds the embedded fonts and dist/corporate-ladder.html
```

## Development

```
npm install
npm test          # finance maths vs lecture/tutorial/test answers, then validate every pack
npm run build     # regenerate css/katex-inline.css, css/opendyslexic.css and dist/
```

To add or edit questions, follow `docs/CONTENT_GUIDE.md`. Every generated question is
validated by `tests/validate.js`: it runs each generator hundreds of times and compiles every
LaTeX string with KaTeX.

The questions are based on the BFC2140 lecture slides, tutorials, the mock MST and the MST
solutions. Floor 9 is a preview built only from the formula sheet, because the course
material provided did not include those lectures yet.
