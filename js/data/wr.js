/* Corporate Ladder — Floor 10: The Writing Room.
 * Exam technique for written answers (setting out working, typing maths in one line, theory answers)
 * and the Excel Lab (building finance tables in Excel). No battles: lessons and written cases.
 */
(function () {
  'use strict';
  const R = String.raw;

  registerPack({
    id: 'wr', floor: 10, week: 'All weeks', noExam: true,
    title: 'The Writing Room',
    topic: 'Written answers and Excel',
    color: '#7a4fb3',
    icon: '✍️',
    intro: 'Most exam marks come from written answers. Here you learn to set out working, type maths in one line, explain theory clearly, and build finance tables in Excel.',
    briefing: [
      { h: 'A calculation answer in four lines', points: [
        R`**1. Formula** in letters, from the formula sheet.`,
        R`**2. Numbers** put into the formula.`,
        R`**3. Answer** rounded to 2 decimal places at the very end, with its unit (a dollar sign or a per cent sign).`,
        R`**4. Meaning**: one sentence that answers the question (accept, reject, buy, which is better).`,
      ] },
      { h: 'Typing maths in one line', points: [
        R`Use * for times, / for divide and ^ for powers.`,
        R`Put brackets around every top and every bottom: \(1/(1 + r)^n\), not \(1/1 + r^n\).`,
        R`Write percentages as decimals inside formulas (0.08), or with a % sign (8%).`,
      ] },
      { h: 'A theory answer', points: [
        R`**Point**: answer the question in the first sentence.`,
        R`**Reason**: say why (because …).`,
        R`**Link**: use the question's own firm or numbers.`,
        R`**Conclusion**: finish with the decision or the result.`,
      ] },
    ],
    topics: {
      method: 'Setting out a calculation',
      typing: 'Typing maths in one line',
      theory: 'Writing theory answers',
      excel: 'Excel for finance',
      mixed: 'Mixed written questions',
    },
    nodes: [
      { id: 'wr-L1', kind: 'lesson', name: 'How written answers earn marks', lesson: 'wr-L1' },
      { id: 'wr-W1', kind: 'case', name: 'Written round: the savings plan', case: 'wr-C1' },
    ],
    lessons: {
      'wr-L1': {
        title: 'How written answers earn marks',
        goal: R`Set out a calculation so a marker can give you every mark.`,
        topics: ['method'],
        cards: [
          { kind: 'learn', title: 'Markers mark the method', body: R`A written answer gets marks for the **method**, not only the final number.\n\nIf your final number is wrong but your formula and numbers are right, you still get most of the marks. If you only write a number, one slip loses everything.`,
            viz: { type: 'flow', steps: [{ icon: '📄', t: 'Formula', s: 'in letters' }, { icon: '🔢', t: 'Numbers', s: 'put in' }, { icon: '✅', t: 'Answer', s: '2 decimal places' }, { icon: '💬', t: 'Meaning', s: 'one sentence' }], cap: 'The four lines of a full-marks calculation.', key: true } },
          { kind: 'example', title: 'Four lines in action', q: R`You invest \(\$5{,}000\) for 3 years at \(6\%\) a year. How much will you have?`,
            steps: [
              R`**Formula** (from the sheet): \(FV_n = PV \times (1 + r)^{n}\)`,
              R`**Numbers**: \(FV_3 = 5000 \times (1 + 0.06)^{3}\)`,
              R`**Answer**: \(FV_3 = \$5{,}955.08\)`,
              R`**Meaning**: after 3 years you will have \(\$5{,}955.08\).`,
            ],
            answer: R`Typed in the exam's text box it looks like this: FV = PV*(1 + r)^n = 5000*(1 + 0.06)^3 = 5955.08`,
            formulas: ['fv-lump'] },
          { kind: 'type', title: 'Type the numbers line', q: R`Type the numbers line for \(FV_3 = 5000 \times (1 + 0.06)^{3}\) in one line.`, answer: 5955.08, model: '5000*(1 + 0.06)^3', placeholder: 'e.g. 5000*(1 + 0.06)^3', why: R`The brackets make sure \(1 + 0.06\) is added **before** the power.`, trap: 'the power must cover the whole bracket (1 + 0.06).' },
          { kind: 'written', title: 'Your turn: write all four lines',
            story: R`A bank pays \(5\%\) a year. You want \(\$20{,}000\) in 4 years.`,
            part: { kind: 'calc', marks: 2, ask: R`How much must you invest today?`, formulas: ['pv-lump'], answer: 16454.05, unit: '$', dp: 2,
              model: ['PV = FVn/(1 + r)^n', '= 20000/(1 + 0.05)^4', '= $16,454.05'],
              meaning: R`So you must invest \(\$16{,}454.05\) today.` } },
          { kind: 'recap', title: 'Remember', points: [
            R`Formula in letters first. It shows the marker your method.`,
            R`Then the numbers, then the answer to 2 decimal places.`,
            R`Round only at the end. Keep full numbers in your calculator.`,
            R`Finish with one sentence that answers the question.`,
          ] },
        ],
      },
    },
    cases: {
      'wr-C1': {
        title: 'The savings plan',
        topics: ['method', 'theory'],
        story: R`Mia saves \(\$400\) at the end of every month for 5 years. Her account pays \(6\%\) a year, compounded monthly.`,
        parts: [
          { kind: 'calc', marks: 2, ask: R`What is the monthly interest rate?`, formulas: ['ear'], pick: ['ear', 'fisher', 'pv-perp', 'fv-lump'],
            answer: 0.5, unit: '%', dp: 2, model: ['r(month) = APR/m', '= 6%/12', '= 0.50%'],
            meaning: R`The rate per month is \(0.50\%\).` },
          { kind: 'calc', marks: 3, ask: R`How much will Mia have after 5 years?`, formulas: ['fv-annuity'],
            answer: 27908.01, unit: '$', dp: 2,
            model: ['FV of an annuity = C/r*((1 + r)^n - 1)', '= 400/0.005*((1 + 0.005)^60 - 1)', '= $27,908.01'],
            meaning: R`After 5 years Mia will have \(\$27{,}908.01\).` },
          { kind: 'theory', marks: 2, ask: R`Explain why Mia ends up with more than \(60 \times \$400 = \$24{,}000\).`,
            points: [
              { t: R`Each deposit earns interest from the month it is paid in.`, ok: true },
              { t: R`The interest also earns interest (compounding).`, ok: true },
              { t: R`The bank adds a bonus deposit at the end.`, ok: false, why: R`No bonus is mentioned. The extra is all interest.` },
              { t: R`Inflation makes the deposits bigger.`, ok: false, why: R`Inflation changes buying power, not the dollars in the account.` },
            ],
            model: R`She has more than \(\$24{,}000\) because each deposit earns interest from the month it goes in. The interest also earns interest each month (compounding). So the account grows to \(\$27{,}908.01\), which is \(\$3{,}908.01\) of interest.`,
            keys: [['interest'], ['compound', 'compounding', 'interest on interest']] },
          { kind: 'blanks', marks: 1, ask: R`Choose the right words.`,
            text: R`If the deposits were made at the {{start|end}} of each month, the account would hold more, because each deposit earns {{one more|one less}} month of interest.`,
            why: R`Deposits at the start of each month make an annuity due: FV of an annuity \(\times (1 + r)\).` },
        ],
      },
    },
    questions: [],
    generators: [],
  });
})();
