# BFC2140 Solver for the TI-Nspire CX CAS

`BFC2140_SOLVER.tns` is a Lua app for the TI-Nspire CX / CX II (CAS or not, OS 3.2 or later) that solves every
kind of question in BFC2140 Corporate Finance, Weeks 1 to 11, and answers the questions without numbers.
It grew out of the student's own v21 solver (Weeks 1-5, kept here as `BFC2140_SOLVER_v21.tns`).

## Put it on the calculator

1. Install **TI-Nspire CX Student Software** or **TI-Nspire Computer Link** (free from education.ti.com).
2. Connect the calculator with its USB cable.
3. Drag `BFC2140_SOLVER.tns` onto the calculator (the software's Content Explorer / Handheld panel).
4. On the calculator: **home**, **My Documents**, open **BFC2140_SOLVER**.

Press-to-Test mode disables documents, so check your exam's calculator rules before relying on it in an exam.

## Use it

The home screen:

- **F  Find my question type.** Answer two short questions ("What is it about?", "What do they ask for?"). The right
  solver opens with the answer box marked **FIND** and any choices already set.
- **1-7** pick a week, then a question type (21 types).
- **T  Theory + what-ifs.** The questions without numbers, by week and topic: first the WHAT-IF rules
  ("rates UP -> bond price DOWN"), then each question with its answer, why, and the trap. A week number jumps to that week.
- **S  Search.** Type a word from the question (COUPON, PERPETUITY, 2/10, BETA) and open the match: a solver, a theory
  card, a rule or a glossary word.
- **G  Glossary** of every finance word and question wording, each linked to its solver. **H** help.

Filling in a question: up/down (or tab) moves between boxes, the grey line at the bottom says what each box is and how
questions word it, left/right changes a choice, **leave the unknown blank**, ENTER solves. Rates go in as percent
(7 = 7%); money as 4750, 4.75k or 1.2m; negatives with the (-) key.

The answer page puts the answers first, each with how it was worked out. **I** explains a line, **T** shows the table,
**N** notes (formulas and letters), **A** steps and traps (what to write for the marks), **W** worked course examples.
Time-value, loan and bond answers end with **CHECK ON THE TI FINANCE SOLVER**: the exact boxes to type into the
built-in Finance Solver (menu 8 1). Projects show the `npv(` and `irr(` lines to type.

| Week | Types |
|---|---|
| 1-2 | one amount (PV, FV, n, r); regular payments (annuity, due, deferred, perpetuity, growing); loans (repayment, balance, rate change); rate conversions (EAR, APR, continuous, Fisher) |
| 3 | bonds (price, yield, value later, skipped coupons); bond sold early (realised yield); shares (dividend growth, two-stage) |
| 4-5 | projects (NPV, IRR, payback, PI, A vs B, crossover, NPV-graph questions); different lives (EAA/EAC); cash flows (FCF, depreciation, salvage, inflation) |
| 7 | break-even (EBIT and NPV), sensitivity, scenarios; expected values, decision trees, abandon options; two-year joint and conditional probabilities |
| 8 | inventory/A/R/A/P days, operating and cash cycles, cash freed, NWC, firm value; trade credit cost and decision; credit policy NPV |
| 9 | one share (realised, annualised, expected return, SD, CV, Sharpe); two-share portfolios (covariance, correlation, SD, risk-free mixes, weights); beta, CAPM, SML, portfolio beta, target return |
| 10-11 | costs of equity, debt (YTM) and preference shares, WACC; Modigliani-Miller with and without tax, tax shield, recapitalisation |

Weeks 10-11 follow the unit's formula sheet (for example, MM Proposition II with tax uses `(1 - Tc)`, which assumes
permanent debt), because the lectures for those weeks were not in the course files used to build this.

## Build and test (for changes)

- `src/main.lua` is the app (the v21 code, extended). `--@include` lines pull in `src/t_week7.lua` ... `t_week10.lua`
  (the Weeks 7-11 solvers), `v22_data.lua` (groups, hints, the finder, the Finance Solver checks, the help),
  `glossary_v22.lua`, `theory_a.lua` / `theory_b.lua` (the theory cards) and `ui_v22.lua` (the new screens).
- `node calculator/tools/build.js` writes `build/bfc2140_solver.lua` and `BFC2140_SOLVER.tns`.
  `tools/tns.js` makes the .tns (the same file layout as the Luna converter) and can read the Lua back out
  (`node calculator/tools/tns.js --extract file.tns out.lua`). The app must stay ASCII-only; the build checks.
- Tests need Python 3 and `lupa` (Lua 5.1, the calculator's Lua): `pip install lupa`, then
  - `python3 calculator/tests/test_solvers.py`: every solver against the course's worked answers;
  - `python3 calculator/tests/test_ui.py`: every screen, mode, finder route, theory page and search opens without an error;
  - `python3 calculator/tests/check_theory.py calculator/src/theory_b.lua THEORY_B`: the theory data format.
  `tests/mock/nspire_mock.py` is a small TI-Nspire Lua mock that draws the screen to SVG; `tests/ui_tour.py` saves
  screenshots of a tour of the app (needs Playwright).
