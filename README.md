# Corporate Ladder

A dyslexia-friendly RPG that teaches **BFC2140 Corporate Finance** from zero. You start as an
intern at the bottom of a corporate tower. Each floor is one week of the unit: short **lessons**
teach each idea, then you use it against finance monsters. Defeat every floor boss and climb to
the Boardroom as **CFO**. Every calculation is shown on a **TI-Nspire CX CAS**.

## Play it

- **Easiest:** open `dist/corporate-ladder.html` in any modern browser (Chrome, Edge, Safari, Firefox).
  It is one self-contained file. It needs an internet connection only to load KaTeX, confetti and the web fonts.
- **From the source:** run `npm run serve` (or any static web server) in this folder, then open `http://localhost:8080`.
  Opening `index.html` directly from disk also works in most browsers.

Progress saves in your browser automatically. Use **Settings → Copy save code** to move it to another device.

## What is inside

| Floor | Week | Topic |
|---|---|---|
| Basement · The Toolkit | Start here | Percentages, powers, and your TI-Nspire: the Finance Solver, nSolve, lists |
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

Every floor has **lessons** 📖, battles, mini-games, a boss and a one-page revision sheet.
Lessons assume no prior knowledge: one small idea per card, worked examples revealed one step
at a time, the same example on the TI-Nspire, quick checks, and "your turn" problems split
into small steps. Each battle comes right after the lessons it needs.

Calculation questions are **generated with fresh numbers every time**, so you can practise
forever. Every answer comes with an explanation, a worked solution in LaTeX, and the steps on
the **TI-Nspire CX CAS** (Finance Solver screens and the exact lines to type). Wrong answers go
into the **Mistake Ledger**, and a **Review** button shows the lesson's key points.

Other features:

- 🧮 A TI-Nspire-style calculator: the Finance Solver (N, I(%), PV, Pmt, FV, PpY, CpY, PmtAt) and a
  calculator line that understands `tvmFV(…)`, `npv(…)`, `irr(…)`, `eff(…)`, `nom(…)`, `nSolve(…)`,
  lists, `mean`, `stDevSamp` and stored values. Prefer the course's HP10bII+? Switch the worked
  steps to HP keystrokes in Settings.
- 📘 The Formula Codex: the whole BFC2140 formula sheet, searchable, with "when to use it" notes.
- 🌙 Smart Review targets your weakest topics. 📊 Performance Review shows mastery by topic.
- 🏦 A savings vault that pays compound interest after each win. Pick the account with the highest EAR.

## Built for dyslexic readers

- All maths is typeset in LaTeX (KaTeX).
- Fonts: **Lexend** (default), **Atkinson Hyperlegible**, or **OpenDyslexic**.
- Adjustable text size, line spacing and letter spacing. Paper tints (ledger green, cream, pale blue, peach, white) and a dark theme.
- **Read aloud** on every lesson card, question, answer and briefing section (browser speech), with speed and voice settings.
- Lessons show one idea at a time, reveal worked examples one step at a time, and never time you.
- Numbers in questions are highlighted, and a **Given** panel lists each value in LaTeX.
- No timers in battles. Mini-game timers can be relaxed or switched off. Reduced motion is respected.
- Keyboard play: `A`–`D` or `1`–`4` to answer, `T`/`F` for true/false, `Enter` for next, `←` to go back in a lesson, `H` for a hint, `S` to read aloud.

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
js/lib/nspire.js        a small TI-Nspire CX CAS emulator (checks and runs every calculator step)
js/lib/tiview.js        draws TI-Nspire steps: Finance Solver screens and calculator lines
js/lib/sfx.js           Web Audio sound effects
js/data/formulas.js     the formula codex
js/data/w*.js           one content pack per floor: lessons, questions, battles (see docs/CONTENT_GUIDE.md)
js/engine/*.js          screens, battles, mini-games, calculator, exam, store, settings
tests/                  finance tests against the course's worked answers + content validator
tools/build.js          builds the embedded fonts and dist/corporate-ladder.html
```

## Development

```
npm install
npm test          # finance maths vs course answers, TI-Nspire emulator, then validate every pack
npm run build     # regenerate css/katex-inline.css, css/opendyslexic.css and dist/
```

To add or edit questions or lessons, follow `docs/CONTENT_GUIDE.md`. `tests/validate.js` runs
each generator hundreds of times, compiles every LaTeX string with KaTeX, and runs every
TI-Nspire method to check that it reaches the question's answer. `tests/e2e.js` plays through
every lesson, battle and mini-game in a real browser.

The questions are based on the BFC2140 lecture slides, tutorials, the mock MST and the MST
solutions. Floor 9 is a preview built only from the formula sheet, because the course
material provided did not include those lectures yet.

Where a slide or solution rounds early or has a typo, the game uses the exact value.
[`docs/COURSE_NOTES.md`](docs/COURSE_NOTES.md) lists every such place, plus worked answers
for the Week 9 tutorial, which had no solution file.
