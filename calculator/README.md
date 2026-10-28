# BFC2140 Solver for the TI-Nspire CX CAS

`BFC2140_SOLVER.tns` is a Lua app for the TI-Nspire CX / CX II (CAS or not, OS 3.2 or later) that solves every
kind of question in BFC2140 Corporate Finance, Weeks 1 to 12, and answers the questions without numbers.
It grew out of the student's own v21 solver (Weeks 1-5, kept here as `BFC2140_SOLVER_v21.tns`).

## Put it on the calculator

1. Install **TI-Nspire CX Student Software** or **TI-Nspire Computer Link** (free from education.ti.com).
2. Connect the calculator with its USB cable.
3. Drag `BFC2140_SOLVER.tns` onto the calculator (the software's Content Explorer / Handheld panel).
4. On the calculator: **home**, **My Documents**, open **BFC2140_SOLVER**.

Press-to-Test mode disables documents, so check your exam's calculator rules before relying on it in an exam.

## Use it

The home screen:

- **R  Root formulas.** Every line of the exam formula sheet (55 of them, in 9 groups) as a page of boxes, one per
  letter. Fill what the question gives, leave ONE box blank, ENTER: the answer, the formula solved for that letter
  (when it can be rearranged; otherwise it is found by trial), your numbers in it, the answer to 2 decimals, and a
  check with every box filled. N on a formula explains what goes in each box and lists the formula solved for every
  letter. Some boxes can come from a helper (D0 for D1, the market risk premium for E[RM], yearly COGS for daily
  COGS, variances and a covariance for SDs and the correlation); list formulas (NPV, IRR, expected return, variance,
  covariance) take one value per box.
- **E  Everything: type all you know.** The fall back: one page with a box for every letter on the formula sheet,
  grouped under the sheet's section titles in the sheet's order (the cursor skips the titles; left/right jumps a
  section). The same letter in different sections is a different box (C payment vs C coupon, r, n, g, PV); Tc is one
  box shared by Cost of Capital, the Tax World and section 9. Section 9, "Extra lines (not on the sheet)", adds lines
  the sheet leaves out, each with its own boxes: E = VL - D, share price = E/shares (so the number of shares too),
  E = shares x price, VU = FCF/rU, VU = EBIT(1 - Tc)/rU and rd after tax = rd(1 - Tc); their answers say they are
  not on the sheet (in I and under NOT ON THE SHEET). ENTER solves every line that has exactly one blank letter,
  again and again, and lists each answer as "formula: letter = answer" under its section; I (or clicking the line)
  explains it: the formula, the formula solved for that letter, the numbers in it, the answer and a check.
  Alternatives (annuity / annuity due / perpetuity, bond / zero-coupon bond, the share price lines, the two covariances,
  the two VU lines) are listed separately and never feed each other; an answer is passed on only when one line gave it, and it then says
  "(uses X from ...)". A few links cross sections: CAPM's E[Ri] -> re and rE, SD = sqrt(variance), rU, rE, rD, E, D
  typed in one capital-structure world are used in the other, section 9's VL, D, VU and rU are the Tax World's (both
  ways), its rd is Cost of Capital's, and its E (when only one line gave it) goes to the Tax World and the WACC
  weights. Nothing solvable? ONE VALUE SHORT says what each formula still needs. `src/everything.lua`, `src/ui_every.lua`, tested by `tests/test_everything.py`.
- **X  Excel tables (Part C).** The Excel parts have few inputs, so type them and the answer IS the Excel layout.
  Four kinds: 1 a replacement (old machine vs new), 2 a new project, 3 a decision tree "act now or wait", 4 a chance node
  (2-4 branches) with a choice today. Cash flows: ITEMS DOWN the rows in the order they are typed into Excel (revenue or
  saving, cost avoided, costs, new dep, old dep given up, incremental dep, EBIT, tax, after-tax profit, + dep, CapEx, old
  sale and its tax, new sale and its tax, NWC, FCF, PV, NPV), YEARS ACROSS (Year 0 in column B). The answer page starts
  with the FCF of each year and the NPV; T shows the grid (labels stay on the left, left/right moves along the years) and
  each cell's Excel formula (`=C7*0.3`, `=NPV(0.1,C16:H16)+B16`). Trees: one row per branch (probability, cash flow,
  when, PV, probability x PV), then the decision. The numbers come from the same code as the replacement page and the
  tree page. `src/t_excel.lua`.
- **F  Find my question type.** Answer two short questions ("What is it about?", "What do they ask for?"). The right
  solver opens with the answer box marked **FIND** and any choices already set.
- **1-8** pick a week, then a question type (23 types). A type that covers several kinds of question opens a numbered
  list first ("What does the question ask for?"): press its number and the page shows only the boxes that kind needs.
  Each kind is named by what the question asks for, and a PICK WHEN line under the list gives the question's giveaway
  words for the highlighted kind;
  ESC goes back to the list.
- **T  Theory + what-ifs.** The questions without numbers, by week and topic: first the WHAT-IF rules
  ("rates UP -> bond price DOWN"), then each question with its answer, why, and the trap. A week number jumps to that week.
- **S  Search.** Type a word from the question (COUPON, PERPETUITY, 2/10, BETA) and open the match: a solver, a theory
  card, a rule or a glossary word. A whole question works too ("Which of the following are included in a firm's
  capital structure?"): filler words are dropped and the cards matching most of the rest come first. THEORY lines are
  the answers to 'which of the following' and true/false questions.
- **L  Legend** (from any page): every letter on the exam formula sheet and what it means, section by section in
  the sheet's order (Financial Mathematics, Bonds and Shares, Capital Budgeting, Working Capital, Risk and Return,
  Cost of Capital, No Tax World, Tax World). In our own words.
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
| 4-5 | projects (NPV, IRR, payback, PI, A vs B, crossover, NPV-graph questions); different lives (EAA/EAC, NPV of repeating forever); cash flows (FCF from revenue and costs or from EBIT, lost sales (erosion), after-tax salvage added, change in NWC from inventory, A/R and A/P; depreciation, salvage, inflation); **replacement decisions** (type 22: year 0, each year's savings, incremental depreciation, EBIT, tax, NOPAT, operating CF, a one-off cost avoided, the final year's asset sales and NWC back, NPV, IRR, and the Excel layout row by row with the formula for each cell) |
| 7 | break-even (EBIT and NPV), sensitivity, scenarios; expected values, decision trees, abandon options, **act now or wait** (the option to wait, with Excel steps for the decision tree); two-year joint and conditional probabilities |
| 8 | inventory/A/R/A/P days, operating and cash cycles, cash freed, NWC, firm value, **float** (a lockbox or billing firm: cash freed today vs the PV of the fees); trade credit cost and decision; credit policy NPV |
| 9 | one share (realised, annualised, expected return, SD, CV, Sharpe, 95% range, standard error); two-share portfolios (covariance, correlation, SD, weights from up to 5 holdings, variances instead of SDs, one share or **two shares plus the risk-free asset**, equal weights over n shares); CAPM: required return, **find beta** (from prices or a forecast), buy or sell, find rf or the premium, beta from covariance, portfolio beta and return, target return, rf and premium from two shares on the SML |
| 10-11 | WACC (from values, weights or D/E; up to five same-risk projects marked accept or reject against it); cost of equity (CAPM, dividend growth, g from past dividends); cost of debt from a bond (the lectures' **effective** yearly rate, the APR alongside, after tax); preference shares (with issue costs); **book vs market weights**; cost of debt from **two bond issues**; **projects vs the SML** (wrongly accepted / rejected by one WACC); **project NPV at the WACC** (risk adjustment, issue costs); Modigliani-Miller with and without tax, tax shield (permanent or n-year debt, from the interest paid), recapitalisation (price, buyback, rE and WACC after), value from cash flows (VU = EBIT(1 - Tc)/rU, VL, equity, share price, PV of distress costs), **levered equity returns by state**, **levered vs unlevered: better buy**, **agency costs** of risky strategies, **debt overhang** |
| 12 | payout policy: ex-dividend price, **share buy-backs**, **homemade dividends**, franked dividends (**imputation**) vs classical tax, **capital gains tax** with the 50% discount; market efficiency and payout theory on the T pages |

Weeks 10-12 follow the unit's formula sheet and the lecture conventions (for example, the cost of debt from a
semi-annual bond is the effective yearly rate `(1 + y)^2 - 1`, with the APR shown next to it; MM Proposition II with tax
uses `(1 - Tc)`, which assumes permanent debt). Course slides and worksheets are not in this repository: the examples
and tests use their own numbers.

## Build and test (for changes)

- `src/main.lua` is the app (the v21 code, extended). `--@include` lines pull in `src/t_week7.lua` ... `t_week10.lua`
  (the Weeks 7-11 solvers), `t_replace.lua` (type 22, replacement decisions), `t_week12.lua` (type 23, payout policy), `v22_data.lua` (groups, hints, the finder,
  the Finance Solver checks, the help), `glossary_v22.lua`, `theory_a.lua` / `theory_b.lua` / `theory_c.lua` (the theory cards),
  `fsheet.lua` (the exam formula sheet and the FORMULA SHEET section), `roots.lua` (the R pages), `everything.lua` (the E page), `ui_v22.lua` (the new screens) and `ui_every.lua` (the E page keys).
- Lua 5.1 allows 200 local variables per function: new code goes in `do ... end` blocks or its own file.
- `node calculator/tools/build.js` writes `build/bfc2140_solver.lua` and `BFC2140_SOLVER.tns`.
  `tools/tns.js` makes the .tns (the same file layout as the Luna converter) and can read the Lua back out
  (`node calculator/tools/tns.js --extract file.tns out.lua`). The app must stay ASCII-only; the build checks.
- Tests need Python 3 and `lupa` (Lua 5.1, the calculator's Lua): `pip install lupa`, then
  - `python3 calculator/tests/test_solvers.py`: every solver against the course's worked answers and hand-checked
    cases; each answer must end with a FORMULA SHEET section (known formulas only, all on the type's N-page list);
    the number boxes' sums; the Excel rows on the replacement and act-now-or-wait answer pages, rebuilt as a sheet by
    `tests/excel_rows.py`, must give the solver's own numbers;
  - `python3 calculator/tests/test_ui.py`: every screen, mode, finder route, theory page and search opens without an
    error; every blank-solved page and every test case (typed into the boxes) shows the FORMULA SHEET section, and
    every N page starts with the sheet formulas;
  - `python3 calculator/tests/test_roots.py`: every root formula (R) solves its example, gets each box back when
    that box is left blank, every rearranged form checks numerically, and every R page opens;
  - `python3 calculator/tests/test_everything.py`: the Everything page (E) gets back every letter of every root
    formula's example left out of its boxes, never overwrites a typed box, lists alternatives separately and passes
    an answer on only when one line gave it; the same for the extra lines of section 9, and the chain
    FCF, rU -> VU -> VL -> E = VL - D -> share price;
  - `python3 calculator/tests/check_theory.py calculator/src/theory_c.lua THEORY_C` (and `theory_a`/`theory_b`): the
    theory data format.
  `tests/mock/nspire_mock.py` is a small TI-Nspire Lua mock that draws the screen to SVG; `tests/ui_tour.py` saves
  screenshots of a tour of the app (needs Playwright).
