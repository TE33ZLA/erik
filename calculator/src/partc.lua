----------------------------------------------------------------------
-- PART C (extended response): how to answer written parts and Excel
-- parts. Opened from home C. General method only, our own examples.
-- ASCII only.
----------------------------------------------------------------------
PARTC_WRITTEN = [[## PART C: HOW TO ANSWER
Part C questions are longer: number parts
with working, 'why' parts, and Excel parts.
Marks come from the WORKING, not only the
final number.

## A NUMBER PART ('calculate ...')
1. Write the formula, as on the sheet.
2. Write it again with your numbers in.
3. The answer, with units (% or dollars) and the
   rounding asked.
4. Keep all decimals until the end.
5. Find the page: home B (the same pages as
   Part B), or M if it needs several steps.
6. Say any assumption you use, e.g. 'debt
   is kept forever'.

## A 'WHY' OR 'EXPLAIN' PART
1. Answer in ONE line first.
2. The cause: what changes, and for whom
   (e.g. more debt -> more risk for the
   shareholders).
3. Link it to the formula or rule
   (e.g. rE = rU + D/E(rU - rD)).
4. Use the question's own numbers if you
   have them ('rE rose from 10% to 13%').
5. 3 to 5 short sentences is enough.
Find the content: home A, type 2-3 words
from the question; or T for the topic.

## 'WHICH SHOULD IT ACCEPT? WHY?'
1. State the rule (e.g. accept if the
   return is above the hurdle rate).
2. Go through EACH option: its number
   against the hurdle -> accept or reject.
3. One line on why the rule works.
4. Any limit (money, one project only)?
   Say how it changes the choice.

## 'WHAT IS THE BEST ... ?' / 'WHAT HAPPENS
## IF ... ?'
1. Name the world or the assumption (e.g.
   no taxes, perfect markets).
2. Give the result in one line.
3. Explain it with the rule from T (the
   WHAT IF lines of the topic).

## FILL IN THE BLANKS
1. Each blank is a key word of one
   definition.
2. Home A, type the topic words: the card's
   answer and its 'Why' hold the words.
3. Read the whole sentence again with your
   words in: it must make sense.

## TIME
Number parts first, then the 'why' parts.
Do not leave a part blank: the formula and
one line of reasoning still earn marks.]]

PARTC_EXCEL = [[## PART C: EXCEL PARTS
1. Download the question's Excel file.
2. Rename it as the question says (the
   exam details + your student ID).
3. Open it. Type your student ID where it
   asks.
4. Answer BELOW 'Provide your responses to
   this question in the space below', in
   the Part i) / Part ii) areas.
5. Use FORMULAS that point at cells
   (=B5*C5), not numbers typed from your
   calculator: the marker checks the cells.
6. Save often. Upload the renamed file
   before the exam ends.

## A CASH FLOW TABLE (project, replacement)
1. Top row: Year 0, 1, 2, ... across.
2. One row per item, in this order:
   revenue or cost saving
   - operating costs
   - depreciation
   = EBIT (profit before tax)
   - tax = EBIT x Tc
   = after-tax profit
   + depreciation (added back)
   - CapEx (Year 0: the cost)
   - change in NWC
   + after-tax salvage (old asset sold
     now in Year 0; new one at the end)
   = FCF
3. Label every row in column A or B.
4. Replacement: each row is the CHANGE
   (new minus old), e.g. the saving in
   costs; depreciation = new - old (it can
   go negative when the new is used up).
5. A cost that only the OLD machine would
   need (e.g. an overhaul): avoiding it is
   a saving in the year it would happen.
6. Under the table: NPV =
   =NPV(rate, Year 1 to Year n FCF) +
   Year 0 FCF. Only if it is asked.
Solver: home X, 1 (replacement) or 2 (a
new project): the answer IS this table,
T shows it with each cell's formula.

## A DECISION TREE
1. Today: a square = a decision. One
   branch per choice (e.g. book now / wait).
2. A circle = chance. One branch per
   outcome, with its probability.
3. At each end: the cash flow, and WHEN.
4. Work BACK from the ends: a circle = sum
   of probability x value; a square = the
   best branch.
5. Bring each value to today:
   =value/(1+r)^(months/12) with an EAR.
6. Copy the shapes from 'Resources' in the
   file; type the numbers in cells next to
   them (formulas, not typed totals).
7. End with the decision in words, in a
   cell: which choice, and its value.
Solver: home X, 3 (act now or wait) or
4 (chance and decision nodes): one row
per branch, T shows the table.]]
