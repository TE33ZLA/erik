# Notes on the course material

Every answer in the game was worked out again from the BFC2140 slides, tutorials and test
solutions. In a few places the printed number is rounded early or has a typo. The game always
uses the exact value. When the gap is only rounding, typing the printed value is usually
accepted too.

This page lists those places, so a small difference between the game and your notes does not
worry you in the test.

## Week 2: annuities and loans

| Where | Printed | Exact | Why |
|---|---|---|---|
| Lecture W2, Example 11 (amortisation table) | Year 5 interest $\$106.12$, opening balance $\$1{,}179.34$ | $\$106.14$ and $\$1{,}179.32$ | The table pushes its rounding into the last rows. |

## Week 3: bonds and shares

| Where | Printed | Exact | Why |
|---|---|---|---|
| Lecture W3, Examples 2–5 | $\$1{,}000.10$, $\$926.00$, $\$1{,}081.55$, $\$750.86$ | $\$1{,}000.00$, $\$926.40$, $\$1{,}081.11$, $\$750.76$ | The slides use 3-decimal table factors and say "rounding error". The game uses the exact formula. |

## Week 4: capital budgeting

| Where | Printed | Exact | Why |
|---|---|---|---|
| Lecture W4, slide 17 | $NPV_S = \$19.99$ | $NPV_S = \$19.98$ | The slide adds rounded PVs. The table on slide 33 shows $\$19.98$. |
| Lecture W4, Taken Inn | The column is headed "PV of inflows @ 10%" | The column holds NPVs | The answer (Hobart, Sydney, Melbourne; $\$925{,}000$) is right. |
| Tutorial W4 Q5 | $\$7{,}547.37$ in the decision line | $\$7{,}547.30$ | The calculator line in the same solution gives $\$7{,}547.30$. |
| Tutorial W4 Q6 | One crossover, $20.02\%$ | Also a second crossover near $155\%$ | The incremental cash flows change sign twice. Only $20.02\%$ matters at sensible rates. |
| Mock MST Q06 | Uses $712{,}250$ | Should be $715{,}250$ | Payback $= 2 + \frac{94{,}750}{823{,}330} = 2.1151$, still $2.12$ years. |

## Week 5: cash flows

| Where | Printed | Exact | Why |
|---|---|---|---|
| Lecture W5, Example 2 | $\frac{589}{1.085714^2}$ in the NPV line | $\frac{589.57}{1.085714^2}$ | A typo. The result is right. |
| Tutorial W5 Q3 (IFC), second table | The $-\$7{,}500$ row is labelled "Tax Saving (Capital Gain)" | It is tax **paid** on the old unit's gain, as the first table says | The totals are right: $-\$522{,}500$ and $NPV = -\$66{,}744.95$. |

## Week 7: risk analysis

| Where | Printed | Exact | Why |
|---|---|---|---|
| Lecture W7, Example 2 (machine A) | $NPV = \$0.5065\text{m}$ | $NPV = \$0.5062\text{m}$ | The slide rounds the $t = 3$ values to $\$3.412\text{m}$ and $\$2.654\text{m}$ first. |
| Lecture W7, slides 48–52 | $NPV_{3L} = NPV_{3H} = 1.791\text{m}$ | Leftover labels | They look like a mistyped copy of $1.971\text{m}$, machine B's value after high demand. Machine A's values are $\$3.412\text{m}$ (high) and $\$2.654\text{m}$ (low). |

## Week 8: working capital

| Where | Printed | Exact | Why |
|---|---|---|---|
| Lecture W8, slide 9 | Average daily sales $151.4$ | $\frac{55{,}129.8}{365} = 151.04$ | A typo. The CCC of $-11.4$ days is still right. |
| Lecture W8, slide 15 | 3/20, net 40: "full amount after 40 days" | Full amount **by** day 40 | "Net 40" is the due date. |
| Lecture W8, slide 17 | $44.6\%$ | $\left(1 + \frac{2}{98}\right)^{365/20} - 1 = 44.59\%$ | Rounded. |
| Tutorial W8 Q1 | CCC $= 59.97$ days | $59.96$ days | The solution rounds daily sales and COGS to $9.96$ and $8.92$ first. |
| Week 8 task sheet, suggested solution | Company B's comment says "Company A should…"; Company C's says "Company A takes 33.46 days" | They mean Company B and Company C | The numbers are right. |

## Week 9: risk and return

| Where | Printed | Exact | Why |
|---|---|---|---|
| Lecture W9, SML Example 2, share 3 | $r = 13\%$ | $r = 8\% + 1.3 \times 4\% = 13.2\%$ | Rounded. It is still undervalued, because $15\% > 13.2\%$. |
| Lecture W9, Example 3(b), portfolio B | $\sigma_B = 10.01\%$ | $\sigma_B = 10.00\%$ | The slide squares rounded SDs. So Sharpe $= 0.1680$ (slide $0.1678$) and $CV = 1.033$ (slide $1.034$). Portfolio C still wins. |
| Lecture W9, Example 6 | $\rho = 0.9294$ | $\rho = 0.9289$ | The slide divides by rounded SDs. The game gives you the rounded SDs, as the slide does, and accepts both. |
| Lecture W9, slide 83 | "The Sharpe ratio is not on the formula sheet" | The 2026 formula sheet includes it | Check your own copy of the sheet. |

### Week 9 tutorial answers

No solution file was included for this tutorial, so here are the game's answers. They use
sample statistics ($n - 1$) for historical data and probability weights for scenarios.

| Question | Answer |
|---|---|
| Q1, Highbull and Slowbear | $E[R_H] = 7.33\%$, $E[R_S] = 6.08\%$, $\sigma_H = 5.80\%$, $\sigma_S = 0.75\%$, $Cov = 0.000425$, $\rho = 0.9783$ |
| Q2, Nikkei and Russell 2000 | $\bar{R}_N = 4.17\%$, $s_N = 10.65\%$, $\bar{R}_R = 2.83\%$, $s_R = 11.02\%$, $Cov = 0.010143$, $\rho = 0.8647$ |
| Q3, shares A to D | $CV_A = 0.3803$, $CV_B = 0.1207$, $CV_C = 3.2745$, $CV_D = 6.82$. Pick B: it has the least risk per unit of return. |
| Q5, portfolios 1 and 2 | Portfolio 1: $E[R] = 14.6\%$, $\sigma = 34.03\%$, Sharpe $= 0.194$. Portfolio 2: $E[R] = 9.8\%$, $\sigma = 16\%$, Sharpe $= 0.1125$. Portfolio 1 has more risk but pays more for each unit of it. |

## Mock MST

| Where | Printed | Exact | Why |
|---|---|---|---|
| Mock MST Q04 | $\$17{,}290.02$ | $\$17{,}290.18$ | A typo in the solution. |
| Mock MST Q13 | Types the balance as $517{,}196.67$, so the new payment is $\$2{,}331.01$ | Balance $\$517{,}194.79$, new payment $\$2{,}331.00$ | The line above gives $\$517{,}195.67$ (from the rounded payment). One digit was mistyped. |
| Mock MST Q17 | $P_1 = \$22.50$ | $P_1 = \frac{2 \times 1.06^2}{0.16 - 0.06} = \$22.47$ | The solution rounds $D_2$ to $\$2.25$ first. The game accepts both. |
| Mock MST Q29 feedback | "800 * 10 + 1000 = $1800" | $8 \times \$100 + \$1{,}000 = \$1{,}800$ | The answer is right. The working has a typo. |

## MST 2026

| Where | Printed | Note |
|---|---|---|
| MST Q14 | Balance $\$239{,}080.94$ | This uses the unrounded payment. If you type the rounded $\$1{,}696.97$ into the calculator, you get $\$239{,}080.86$. The game accepts both. |
| MST Q17 | $P_6 = \$9.87$ | The exact value, $\$9.87496$, sits right on the rounding edge. The game accepts $\$9.87$ and $\$9.88$. |

## Weeks 10–11 (the Capital Summit)

The zip had no lecture slides for Weeks 10–11. Floor 9 is built only from the formula sheet
(WACC and Modigliani–Miller), so check it against the lectures when they are released.
