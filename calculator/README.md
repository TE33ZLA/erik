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
- **1-7** pick a week, then a question type (22 types).
- **T  Theory + what-ifs.** The questions without numbers, by week and topic: first the WHAT-IF rules
  ("rates UP -> bond price DOWN"), then each question with its answer, why, and the trap. A week number jumps to that week.
- **S  Search.** Type a word from the question (COUPON, PERPETUITY, 2/10, BETA) and open the match: a solver, a theory
  card, a rule or a glossary word.
- **G  Glossary** of every finance word and question wording, each linked to its solver. **H** help.

Filling in a question: up/down (or tab) moves between boxes, the grey line at the bottom says what each box is and how
questions word it, left/right changes a choice, **leave the unknown blank**, ENTER solves. Rates go in as percent
(7 = 7%); money as 4750, 4.75k or 1.2m; negatives with the (-) key. **A box also takes a simple sum**: `4/12`,
`1.08^2`, `50000-40000`, `(3+4)*2`, `50k-40k` (+ - * / ^, brackets, a leading minus). The answer page shows what each
sum came to under CONVERSIONS (`t: 4/12 -> 0.333333`).

The answer page puts the answers first, each with how it was worked out. **I** explains a line, **T** shows the table,
**N** notes (formulas and letters), **A** steps and traps (what to write for the marks), **W** worked course examples.
Time-value, loan and bond answers end with **CHECK ON THE TI FINANCE SOLVER**: the exact boxes to type into the
built-in Finance Solver (menu 8 1). Projects show the `npv(` and `irr(` lines to type. Where a rate is found by search
(IRR, YTM, realised yield, the rate of an annuity or loan), **BY HAND: INTERPOLATE** shows the formula sheet's way:
two trial rates, `lambda = A1/(A1 - A2)`, `r = r1 + lambda*(r2 - r1)`.

### The formula sheet on every answer

Every answer ends with **FORMULA SHEET (n used)**: the lines of the exam's formula sheet that this answer used,
grouped by the sheet's sections and written exactly as they must be typed in the exam's text box (`*` times, `/`
divide, `^` power, brackets), for example

```
FORMULA SHEET (2 used)
 Capital Budgeting:
  FCF = (Rev - Costs - Dep)*(1 - tc) + Dep - CapEx - Change in NWC
  After-tax salvage = SV - (SV - BV)*tc
NOT ON THE SHEET (1)
  Dep tax shield = Dep*tc  <- part of the FCF line: (Rev - Costs)*(1 - tc) + Dep*tc
```

The list depends on the mode and on which boxes were filled. **NOT ON THE SHEET** lists every other formula the
answer used (rearranged forms such as `n = ln(FVn/PV)/ln(1 + r)`, the loan balance, break-evens, payback, the
trade-credit EAR, float, the trade-off value, ...) with where it comes from on the sheet. The **N** page of every type
starts with all the sheet lines that type can use. The 56 sheet formulas, the off-sheet catalogue and each type's
list are in `src/fsheet.lua`; a solver records what it used with `out:uses("fv")` and `out:off("nlump")`.

| Week | Types |
|---|---|
| 1-2 | one amount (PV, FV, n, r); regular payments (annuity, due, deferred, perpetuity, growing, and n payments then a second growth rate `g2` forever, e.g. -4 for a 4% fall); loans (repayment, balance, rate change); rate conversions (EAR, APR, continuous, Fisher) |
| 3 | bonds (price, yield, value later, skipped coupons); bond sold early (realised yield); shares (dividend growth, two-stage) |
| 4-5 | projects (NPV, IRR, payback, PI, A vs B, crossover, NPV-graph questions); different lives (EAA/EAC, NPV of repeating forever); cash flows (FCF from revenue and costs or from EBIT, lost sales (erosion), after-tax salvage added, change in NWC from inventory, A/R and A/P; depreciation, salvage, inflation); **replacement decisions** (type 22: year 0, each year's savings, incremental depreciation, EBIT, tax, NOPAT, operating CF, a one-off cost avoided, the final year's asset sales and NWC back, NPV, IRR and the Excel layout) |
| 7 | break-even (EBIT and NPV), sensitivity, scenarios; expected values, decision trees, abandon options, **act now or wait** (the option to wait); two-year joint and conditional probabilities |
| 8 | inventory/A/R/A/P days, operating and cash cycles, cash freed, NWC, firm value, **float** (a lockbox or billing firm: cash freed today vs the PV of the fees); trade credit cost and decision; credit policy NPV |
| 9 | one share (realised, annualised, expected return, SD, CV, Sharpe); two-share portfolios (covariance, correlation, SD, weights, variances instead of SDs, one share or **two shares plus the risk-free asset**); beta, CAPM, SML, portfolio beta, target return |
| 10-11 | costs of equity, debt (YTM) and preference shares, WACC; Modigliani-Miller with and without tax, tax shield, recapitalisation, **value from cash flows** (VU = EBIT(1 - Tc)/rU, VL, equity, share price, levered rE and WACC, PV of distress costs: the trade-off theory, textbook) |

Weeks 10-11 follow the unit's formula sheet (for example, MM Proposition II with tax uses `(1 - Tc)`, which assumes
permanent debt), because the lectures for those weeks were not in the course files used to build this.

## Build and test (for changes)

- `src/main.lua` is the app (the v21 code, extended). `--@include` lines pull in `src/t_week7.lua` ... `t_week10.lua`
  (the Weeks 7-11 solvers), `t_replace.lua` (type 22, replacement decisions), `v22_data.lua` (groups, hints, the finder,
  the Finance Solver checks, the help), `glossary_v22.lua`, `theory_a.lua` / `theory_b.lua` (the theory cards),
  `fsheet.lua` (the exam formula sheet and the FORMULA SHEET section) and `ui_v22.lua` (the new screens).
- Lua 5.1 allows 200 local variables per function: new code goes in `do ... end` blocks or its own file.
- `node calculator/tools/build.js` writes `build/bfc2140_solver.lua` and `BFC2140_SOLVER.tns`.
  `tools/tns.js` makes the .tns (the same file layout as the Luna converter) and can read the Lua back out
  (`node calculator/tools/tns.js --extract file.tns out.lua`). The app must stay ASCII-only; the build checks.
- Tests need Python 3 and `lupa` (Lua 5.1, the calculator's Lua): `pip install lupa`, then
  - `python3 calculator/tests/test_solvers.py`: every solver against the course's worked answers and hand-checked
    cases; each answer must end with a FORMULA SHEET section (known formulas only, all on the type's N-page list);
    the number boxes' sums;
  - `python3 calculator/tests/test_ui.py`: every screen, mode, finder route, theory page and search opens without an
    error; every blank-solved page and every test case (typed into the boxes) shows the FORMULA SHEET section, and
    every N page starts with the sheet formulas;
  - `python3 calculator/tests/check_theory.py calculator/src/theory_b.lua THEORY_B`: the theory data format.
  `tests/mock/nspire_mock.py` is a small TI-Nspire Lua mock that draws the screen to SVG; `tests/ui_tour.py` saves
  screenshots of a tour of the app (needs Playwright).
