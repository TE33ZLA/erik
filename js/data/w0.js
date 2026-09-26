/* Basement — the Toolkit: the maths and calculator skills the rest of the tower assumes.
 * Percentages, powers, the TI-Nspire CX CAS, the Finance Solver, nSolve, lists and statistics.
 */
(function (root) {
  'use strict';
  const { FIN, L, T, TI } = root;
  const R = String.raw;
  const P = (r) => +(r * 100).toFixed(8);
  const n6 = (x) => TI.num(x);
  const scr = (v) => root.TIVIEW.screenNum(v); // a result the way the game's TI screens show it

  root.registerPack({
    id: 'w0', floor: 0, week: 'Start here', noExam: true,
    title: 'The Toolkit',
    topic: 'Maths and TI-Nspire skills you need first',
    color: '#6b7a8f', icon: '🧰',
    intro: 'New to finance? Start here. The Basement workshop hands out the tools: percentages, powers, and your TI-Nspire CX CAS. Every floor above uses them.',

    briefing: [
      { h: 'Percentages', points: [
        R`**Per cent** means “out of 100”: \(6\% = \frac{6}{100} = 0.06\).`,
        R`To turn a percentage into a decimal, divide by 100. To go back, multiply by 100.`,
        R`Growing by \(r\) multiplies by \((1 + r)\): \(100\) grown by \(6\%\) is \(100 \times 1.06 = 106\).`,
      ] },
      { h: 'Powers and brackets', points: [
        R`\(1.06^{3} = 1.06 \times 1.06 \times 1.06\). The power says how many times you multiply.`,
        R`A negative power divides: \(1.06^{-3} = \frac{1}{1.06^{3}}\).`,
        R`Order: brackets, then powers, then \(\times\) and \(\div\), then \(+\) and \(-\).`,
      ] },
      { h: 'TI-Nspire CX CAS basics', points: [
        R`Work in a **Calculator** page. Press \(\text{enter}\) to calculate.`,
        R`Use the **(−)** key for a negative number. Use **^** for powers.`,
        R`If you see a fraction, press **ctrl enter** for a decimal (or set Calculation Mode to Approximate).`,
      ] },
      { h: 'The Finance Solver (menu 8 1)', points: [
        R`Boxes: \(N\), \(I(\%)\), \(PV\), \(Pmt\), \(FV\), \(PpY\), \(CpY\), \(PmtAt\).`,
        R`Money you **pay out is negative**, money you **receive is positive**.`,
        R`Type \(6\) for 6% (not 0.06). Fill in what you know, tab to the unknown, press enter.`,
      ] },
      { h: 'nSolve and lists', points: [
        R`\(\text{nSolve}(\text{equation}, x)\) finds the number \(x\) that makes the equation true.`,
        R`A list goes in curly brackets: \(\{0.08, 0.15, -0.12\}\). Type them with ctrl ( and ctrl ).`,
        R`\(\text{mean}(\text{list})\), \(\text{stDevSamp}(\text{list})\) and \(\text{sum}(\text{list})\) do statistics.`,
      ] },
    ],

    topics: {
      pct: 'Percentages and decimals',
      pow: 'Powers and brackets',
      ti: 'Using the TI-Nspire',
      solver: 'The Finance Solver',
      nsolve: 'Solving with nSolve',
      lists: 'Lists and statistics',
    },

    nodes: [
      { id: 'w0-L1', kind: 'lesson', name: 'Percentages and decimals', lesson: 'w0-L1' },
      { id: 'w0-L2', kind: 'lesson', name: 'Powers and brackets', lesson: 'w0-L2' },
      { id: 'w0-m1', kind: 'mini', name: 'Percent Sprint', mini: 'pct-sprint' },
      { id: 'w0-L3', kind: 'lesson', name: 'Meet your TI-Nspire', lesson: 'w0-L3' },
      { id: 'w0-1', kind: 'battle', name: 'The Workbench', topics: ['pct', 'pow', 'ti'], n: 6,
        enemy: { name: 'Percy Cent', title: 'Hides decimals in plain sight', body: 'round', color: '#e7a94b', acc: ['glasses'], mouth: 'grin', item: '%',
          lines: { intro: 'Is 6% equal to 6 or to 0.06? Choose wisely!', hit: ['Correct! Divide by one hundred!', 'You found the decimal point!'],
            taunt: ['Oops! A hundred times too big!', 'Brackets first, my friend.'], win: 'I am just a fraction of myself now…', lose: 'Six per cent of nothing is nothing!' } } },
      { id: 'w0-L4', kind: 'lesson', name: 'The Finance Solver', lesson: 'w0-L4' },
      { id: 'w0-L5', kind: 'lesson', name: 'Solve anything with nSolve', lesson: 'w0-L5' },
      { id: 'w0-L6', kind: 'lesson', name: 'Lists and statistics', lesson: 'w0-L6' },
      { id: 'w0-2', kind: 'battle', name: 'The Calculator Cage', topics: ['solver', 'nsolve', 'lists', 'ti'], n: 6,
        enemy: { name: 'Calcu-Later', title: 'Always one key press behind', body: 'box', color: '#5b8bd6', acc: ['antenna', 'glasses'], mouth: 'flat', item: '🧮',
          lines: { intro: 'I will do the sums… later. You first.', hit: ['Beep! Your Finance Solver works!', 'Negative in, positive out. Correct!'],
            taunt: ['Beep. Check your signs.', 'Did you type 6 or 0.06 into I(%)?'], win: 'Battery… low…', lose: 'Error: intern not found.' } } },
    ],

    minis: {
      'pct-sprint': {
        game: 'rapid', title: 'Percent Sprint', intro: 'Quick! Match each percentage with its decimal, or each decimal with its percentage.',
        gen(rng) {
          const pcts = [0.5, 1, 2.5, 4, 5, 6, 6.5, 7.25, 8, 10, 12, 12.5, 15, 20, 25, 50, 100, 150];
          const p = rng.pick(pcts);
          const toDec = rng.chance(0.5);
          const right = toDec ? p / 100 : p;
          const opts = rng.shuffle([right, right * 10, right / 10].map((x) => +x.toPrecision(6)));
          return toDec
            ? { t: R`\(${L.numT(p, 2)}\%\) as a decimal?`, opts: opts.map((x) => R`\(${L.numT(x, 5)}\)`), a: opts.indexOf(+right.toPrecision(6)), why: R`Divide by 100: \(${L.numT(p, 2)} \div 100 = ${L.numT(right, 5)}\).` }
            : { t: R`\(${L.numT(p / 100, 5)}\) as a percentage?`, opts: opts.map((x) => R`\(${L.numT(x, 3)}\%\)`), a: opts.indexOf(+right.toPrecision(6)), why: R`Multiply by 100: \(${L.numT(p / 100, 5)} \times 100 = ${L.numT(p, 2)}\%\).` };
        },
        rounds: 12, seconds: 12,
      },
    },

    lessons: {
      'w0-L1': {
        title: 'Percentages and decimals',
        goal: R`Switch between percentages and decimals, and grow an amount by a percentage.`,
        topics: ['pct'],
        cards: [
          { kind: 'learn', title: 'What “per cent” means',
            body: R`**Per cent** means “out of 100”. So \(6\%\) means 6 out of every 100.\n\nAs a fraction that is \(\frac{6}{100}\). As a decimal it is \(0.06\).`,
            viz: { type: 'grid100', parts: [{ n: 6, c: 2, label: R`6 out of 100 \(= 6\%\) \(= 0.06\)` }],
              cap: R`The whole is 100 squares. **6** of them are orange: that is \(6\%\).` },
            tip: R`Finance uses rates all the time: interest rates, growth rates, returns. They are all percentages.` },
          { kind: 'learn', title: 'Percentage → decimal',
            body: R`To turn a percentage into a decimal, **divide by 100**. The decimal point moves two places to the left.`,
            viz: { type: 'flow', steps: [{ t: R`\(12.5\%\)`, s: 'a percentage', icon: '💯', c: 1 }, { t: R`\(0.125\)`, s: 'a decimal', c: 3 }], links: [R`\(\div 100\)`],
              cap: R`\(12.5\%\) and \(0.125\) are the **same** number, written two ways.` },
            points: [R`\(6\% = 0.06\)`, R`\(12.5\% = 0.125\)`, R`\(0.5\% = 0.005\)`, R`\(150\% = 1.5\)`],
            tip: R`Formulas like \((1 + r)\) need the **decimal**: \(r = 0.06\), not \(6\).` },
          { kind: 'learn', title: 'Decimal → percentage',
            body: R`To go back, **multiply by 100**. The decimal point moves two places to the right.`,
            viz: { type: 'flow', steps: [{ t: R`\(0.0725\)`, s: 'a decimal', c: 1 }, { t: R`\(7.25\%\)`, s: 'a percentage', icon: '💯', c: 3 }], links: [R`\(\times 100\)`],
              cap: R`The same trip in reverse: the arrow now **multiplies** by 100.` },
            points: [R`\(0.0725 = 7.25\%\)`, R`\(0.4459 = 44.59\%\)`, R`\(1.2 = 120\%\)`] },
          { kind: 'check', q: { kind: 'num', q: R`Write \(8.5\%\) as a decimal.`, answer: 0.085, unit: '', dp: 3,
            mistakes: [{ v: 8.5, why: 'That is still the percentage. Divide by 100.' }, { v: 0.85, why: 'That divides by 10. Divide by 100: move the point two places.' }],
            why: R`\(8.5 \div 100 = 0.085\).` } },
          { kind: 'learn', title: 'A percentage of an amount',
            body: R`To find a percentage **of** something, multiply by the decimal.\n\n\(6\%\) of \(\$2{,}000\) is \(0.06 \times 2{,}000 = \$120\).`,
            viz: { type: 'split', total: R`\(\$2{,}000\)`, fmt: '$', parts: [{ label: R`\(6\%\) of it`, v: 0.06 * 2000, c: 2 }, { label: R`the other \(94\%\)`, v: 0.94 * 2000, c: 1 }],
              cap: R`The orange slice is **6 of every 100** dollars: \(\$120\) of the \(\$2{,}000\).` } },
          { kind: 'learn', title: 'Growing by a percentage',
            body: R`If \(\$2{,}000\) grows by \(6\%\), you keep the \(\$2{,}000\) **and** get \(\$120\) more: \(\$2{,}120\).\n\nA shortcut: multiply by \(1 + 0.06 = 1.06\). So \(2{,}000 \times 1.06 = 2{,}120\).`,
            viz: { type: 'bars', fmt: '$', key: true, bars: [{ label: 'Before', v: 2000, c: 1 }, { label: 'After', parts: [{ v: 2000, c: 1 }, { v: 2000 * 0.06, c: 2 }] }],
              keys: [{ c: 1, label: R`The \(\$2{,}000\) you keep: \(\times 1\)` }, { c: 2, label: R`The extra \(6\%\): \(\times 0.06\)` }],
              cap: R`Blue is kept (\(\times 1\)), orange is the extra (\(\times 0.06\)). Together: \(\times 1.06\).` },
            tip: R`“Grow by \(r\)” always means “multiply by \((1 + r)\)”. This is the heart of the whole unit.` },
          { kind: 'example', title: 'Worked example', q: R`A share price of \(\$40\) rises by \(15\%\). What is the new price?`,
            steps: [R`Turn the percentage into a decimal: \(15\% = 0.15\).`, R`Growing means multiply by \(1 + 0.15 = 1.15\).`, R`\[40 \times 1.15 = 46\]`],
            answer: R`The new price is \(\$46\).`, ti: [TI.line('40*1.15')] },
          { kind: 'check', q: { kind: 'num', q: R`A salary of \(\$60{,}000\) rises by \(3.5\%\). What is the new salary?`, answer: 62100, unit: '$', dp: 2,
            mistakes: [{ v: 2100, why: 'That is only the rise. Add it to the old salary (or multiply by 1.035).' }, { v: 270000, why: 'That used 3.5 instead of 0.035. Divide the percentage by 100 first.' }],
            why: R`\(60{,}000 \times 1.035 = 62{,}100\).`, ti: [TI.line('60000*1.035')] } },
          { kind: 'recap', title: 'Remember', points: [R`Percentage \(\div 100\) = decimal. Decimal \(\times 100\) = percentage.`, R`“Of” means multiply: \(6\%\) of \(X\) is \(0.06X\).`, R`Growing by \(r\) means multiplying by \((1 + r)\).`] },
        ],
      },
      'w0-L2': {
        title: 'Powers and brackets',
        goal: R`Understand what \(1.06^{5}\) means, and do the steps of a calculation in the right order.`,
        topics: ['pow'],
        cards: [
          { kind: 'learn', title: 'Growing again and again',
            body: R`Put \(\$100\) in a bank at \(6\%\) a year. After one year: \(100 \times 1.06 = 106\).\n\nAfter two years you grow the **new** amount: \(106 \times 1.06 = 112.36\). So after two years you have multiplied by \(1.06\) twice.`,
            viz: { type: 'flow', steps: [{ t: R`\(\$100\)`, s: 'today', c: 1 }, { t: R`\(${L.moneyT(100 * 1.06)}\)`, s: 'after 1 year', c: 1 }, { t: R`\(${L.money(100 * 1.06 ** 2)}\)`, s: 'after 2 years', c: 3 }],
              links: [R`\(\times 1.06\)`, R`\(\times 1.06\)`],
              cap: R`The second \(\times 1.06\) grows the **new** amount, \(\$106\), not the first \(\$100\).` } },
          { kind: 'learn', title: 'Powers are short for repeated multiplying',
            body: R`Writing \(1.06 \times 1.06 \times 1.06\) is slow. A **power** is shorthand:`,
            viz: { type: 'flow', op: true, key: true, steps: [{ t: R`\(1.06\)` }, { t: R`\(1.06\)` }, { t: R`\(1.06\)` }, { t: R`\(${L.numT(1.06 ** 3, 6)}\)`, s: R`written \(1.06^{3}\)`, c: 3 }],
              links: [R`\(\times\)`, R`\(\times\)`, R`\(=\)`],
              cap: R`Three copies of \(1.06\) multiplied together. The small **3** counts the copies.` },
            points: [R`\(1.06^{2} = 1.06 \times 1.06 = 1.1236\)`, R`\(1.06^{3} = 1.06 \times 1.06 \times 1.06 = 1.191016\)`, R`\(1.06^{n}\) means \(n\) copies of \(1.06\) multiplied together.`],
            tip: R`The small raised number is the **power** (or exponent). In finance it is usually the number of periods, \(n\).` },
          { kind: 'example', title: 'Worked example', q: R`What is \(\$100\) after 5 years at \(6\%\) a year?`,
            steps: [R`Each year multiplies by \(1.06\). Five years multiplies by \(1.06\) five times.`, R`\[100 \times 1.06^{5}\]`, R`\[1.06^{5} = 1.338226, \text{ so } 100 \times 1.338226 = 133.82\]`],
            answer: R`About \(\$133.82\).`, ti: [TI.line('100*1.06^5')] },
          { kind: 'learn', title: 'Negative powers divide',
            body: R`A negative power means “divide by”: \(1.06^{-5} = \frac{1}{1.06^{5}}\).\n\nYou will use this to go **back** in time: to find what a future amount is worth today, you divide by \(1.06^{5}\).`,
            viz: { type: 'flow', steps: [{ t: R`\(\$100\)`, s: 'today', c: 1 }, { t: R`\(${L.money(100 * 1.06 ** 5)}\)`, s: 'in 5 years', c: 3 }, { t: R`\(\$100\)`, s: 'back to today', c: 1 }],
              links: [R`\(\times 1.06^{5}\)`, R`\(\times 1.06^{-5}\)`],
              cap: R`\(\times 1.06^{-5}\) is the same as \(\div 1.06^{5}\): it **undoes** five years of growth.` } },
          { kind: 'learn', title: 'The order of the steps',
            body: R`A calculator follows a fixed order. Brackets first, then powers, then \(\times\) and \(\div\), then \(+\) and \(-\).`,
            viz: { type: 'flow', steps: [{ icon: '1️⃣', t: 'Brackets', s: R`\(1 + 0.05 = 1.05\)` }, { icon: '2️⃣', t: 'Power', s: R`\(1.05^{3} = 1.157625\)` }, { icon: '3️⃣', t: 'Multiply', s: R`\(1.157625 \times 1{,}000 = 1{,}157.63\)`, c: 3 }],
              cap: R`\(1000 \times (1 + 0.05)^{3}\) is worked from the **inside out**.` },
            points: [R`\(1000 \times (1 + 0.05)^{3}\): first \(1 + 0.05 = 1.05\), then \(1.05^{3} = 1.157625\), then \(\times 1000 = 1{,}157.63\).`, R`Without the brackets, \(1 + 0.05^{3}\) is \(1.000125\), which is wrong.`],
            tip: R`When in doubt, add brackets. They never hurt.` },
          { kind: 'check', q: { kind: 'num', q: R`Work out \(2{,}000 \times 1.08^{3}\).`, answer: 2000 * Math.pow(1.08, 3), unit: '', dp: 2,
            mistakes: [{ v: 2000 * 1.08 * 3, why: 'That multiplies by 3. The power means multiply by 1.08 three times.' }, { v: 2000 * 1.24, why: 'That adds 8% three times (simple growth). The power compounds.' }],
            why: R`\(1.08^{3} = 1.259712\), and \(2{,}000 \times 1.259712 = 2{,}519.42\).`, ti: [TI.line('2000*1.08^3')] } },
          { kind: 'check', q: { kind: 'num', q: R`Work out \(\frac{5{,}000}{1.1^{2}}\) (5,000 divided by 1.1 squared).`, answer: 5000 / 1.21, unit: '', dp: 2,
            mistakes: [{ v: 5000 / 2.2, why: 'That divides by 1.1 × 2. Squaring means 1.1 × 1.1 = 1.21.' }, { v: 5000 * 1.21, why: 'That multiplies. The question divides.' }],
            why: R`\(1.1^{2} = 1.21\), so \(5{,}000 \div 1.21 = 4{,}132.23\).`, ti: [TI.line('5000/1.1^2')] } },
          { kind: 'recap', title: 'Remember', points: [R`\(x^{n}\) means \(n\) copies of \(x\) multiplied together.`, R`Growing for \(n\) years at rate \(r\) multiplies by \((1+r)^{n}\).`, R`A negative power divides: \(x^{-n} = \frac{1}{x^{n}}\).`, R`Brackets first, then powers, then \(\times \div\), then \(+ -\).`] },
        ],
      },
      'w0-L3': {
        title: 'Meet your TI-Nspire CX CAS',
        goal: R`Type calculations on the TI-Nspire and get decimal answers.`,
        topics: ['ti'],
        cards: [
          { kind: 'learn', title: 'Open a Calculator page',
            body: R`Turn the calculator on and press **home**. Start a new document and add a **Calculator** page (or use the **Scratchpad**).\n\nYou type a line at the bottom and press **enter**. The answer appears on the right.`,
            viz: { type: 'flow', steps: [{ t: '[[home]]' }, { t: 'New document' }, { t: 'Add Calculator', s: 'your working page', c: 3 }],
              cap: R`Set up the page once. Then type a line, press [[enter]], and read the answer on the right.` } },
          { kind: 'ti', title: 'Your first line', body: R`Type this line, then press enter. It grows \(\$100\) at \(6\%\) for 5 years.`, ti: [TI.line('100*1.06^5')],
            tip: R`Powers use the **^** key.` },
          { kind: 'learn', title: 'Negative numbers: the (−) key',
            body: R`The calculator has two different minus keys. The **(−)** key makes a number negative, like \(-1000\). The **−** key subtracts.\n\nIn finance you often type negative amounts (money you pay out), so use the **(−)** key for those.`,
            viz: { type: 'compare', key: true, items: [
              { title: 'The [[(−)]] key', big: R`\(-1000\)`, points: ['Makes a number **negative**', 'Use it for money you pay out'], c: 1 },
              { title: 'The [[−]] key', big: R`\(5 - 2\)`, points: ['**Subtracts** one number from another'], c: 2 }],
              cap: R`Two keys that look alike. A negative number always **starts** with [[(−)]].` } },
          { kind: 'learn', title: 'Fractions? Press ctrl enter',
            body: R`The CAS likes exact answers. If you type \(1000 \times (1 + 6/100)^{5}\) it may show a big fraction.\n\nPress **ctrl** then **enter** instead of enter: you get a decimal. Or change it once: **home → Settings → Document Settings → Calculation Mode: Approximate**.`,
            viz: { type: 'tiscreen', lines: [{ in: '1000*(1+6/100)^5', out: '418195493/312500' }, { say: 'Press [[ctrl]] [[enter]] instead of [[enter]]:' }, { in: '1000*(1+6/100)^5', out: scr(1000 * 1.06 ** 5) }],
              cap: R`The same line twice: first an exact fraction, then the decimal you want.` },
            tip: R`Typing a decimal point (like \(1.06\)) also gives a decimal answer.` },
          { kind: 'learn', title: 'Reuse the last answer',
            body: R`The word **ans** means “the last answer”. After \(100 \times 1.06^{5}\), typing \(\text{ans} \times 2\) doubles it.\n\nYou can also store a number with **→** (press **ctrl var**): \(0.06 \to r\) stores \(0.06\) in \(r\). Then \(100(1 + r)^{5}\) works.`,
            viz: { type: 'tiscreen', lines: [{ in: '100*1.06^5', out: scr(100 * 1.06 ** 5) }, { in: 'ans*2', out: scr(2 * 100 * 1.06 ** 5) }],
              cap: R`**ans** picks up the last answer, so you never retype \(133.82\).` },
            ti: [TI.line('0.06→r'), TI.line('100*(1+r)^5')] },
          { kind: 'check', q: { kind: 'mcq', q: R`You want to type \(-2{,}500\) (a payment you make). Which key starts the number?`,
            choices: ['The (−) negative key', 'The − subtract key', 'The ctrl key', 'The ^ key'], answer: 0,
            why: R`The **(−)** key makes a number negative. The subtract key is for taking one number away from another.` } },
          { kind: 'check', q: { kind: 'mcq', q: R`Your TI-Nspire shows an answer as a fraction. What should you do?`,
            choices: ['Press ctrl enter to get a decimal', 'Press del and give up', 'Multiply by 100', 'Press menu 8 1'], answer: 0,
            why: R`**ctrl enter** gives the decimal (approximate) answer.` } },
          { kind: 'check', q: { kind: 'num', q: R`Use your calculator: \(750 \times 1.045^{8}\).`, answer: 750 * Math.pow(1.045, 8), unit: '', dp: 2,
            mistakes: [{ v: 750 * 1.045 * 8, why: 'That multiplied by 8. Use the ^ key for the power.' }],
            why: R`\(1.045^{8} = 1.422101\), so \(750 \times 1.422101 = 1{,}066.58\).`, ti: [TI.line('750*1.045^8')] } },
          { kind: 'recap', title: 'Remember', points: [R`Work in a **Calculator** page; press **enter** to calculate.`, R`**(−)** for negatives, **^** for powers.`, R`**ctrl enter** turns a fraction into a decimal.`, R`**ans** reuses the last answer. **ctrl var** gives → to store a value.`] },
        ],
      },
      'w0-L4': {
        title: 'The Finance Solver',
        goal: R`Use the Finance Solver to move money through time, with the right signs.`,
        topics: ['solver'],
        cards: [
          { kind: 'learn', title: 'A built-in money machine',
            body: R`The **Finance Solver** does time-value-of-money sums for you. Open it in a Calculator page with **menu 8 1** (menu → Finance → Finance Solver).\n\nIt has eight boxes. You fill in what you know, and it works out the one you do not know.`,
            viz: { type: 'flow', steps: [{ t: '[[menu]]', s: 'open the menu' }, { t: '[[8]]', s: 'Finance' }, { t: '[[1]]', s: 'Finance Solver', icon: '🧮', c: 3 }],
              cap: R`Say it as **menu 8 1**. Press it inside a Calculator page.` } },
          { kind: 'learn', title: 'The eight boxes',
            viz: { type: 'tl', n: 3, unit: 'Year', at: { 0: 'PV: start', 3: 'FV: end' }, hi: [0, 3],
              moves: [{ from: 0, to: 3, label: 'grows at I(%) a year', c: 1 }], spans: [{ from: 0, to: 3, label: 'N = 3 periods', c: 'grey' }],
              cap: R`The main boxes on a timeline: **PV** at the start, **FV** at the end, **N** periods between.` },
            points: [R`**N**: number of periods (for example years).`, R`**I(%)**: the interest rate **per year**, as a percentage. Type \(6\) for \(6\%\).`, R`**PV**: present value, the amount at the start.`, R`**Pmt**: a payment made every period (0 if there is none).`, R`**FV**: future value, the amount at the end.`, R`**PpY** and **CpY**: payments and compounding periods per year (1 for yearly).`, R`**PmtAt**: END or BEGIN (when payments happen). Leave it on END for now.`] },
          { kind: 'learn', title: 'Signs: money out is negative',
            body: R`The solver needs to know which way money flows.\n\nMoney **you pay out** (a deposit, an investment) is **negative**. Money **you get back** is **positive**.\n\nIf you deposit \(\$1{,}000\) today, type \(PV = -1000\). The future value then comes out positive: it is money you receive.`,
            viz: { type: 'bars', sign: true, key: true, bars: [{ label: 'PV (today)', v: -1000, note: '−$1,000' }, { label: 'FV (year 5)', v: FIN.fv(1000, 0.06, 5), note: T.money(FIN.fv(1000, 0.06, 5)) }],
              cap: R`Money you pay in sits **below zero** (red). Money you get back sits **above** (green).` },
            tip: R`If the solver says there is no solution, check the signs first. At least one amount must be negative and one positive.` },
          { kind: 'example', title: 'Worked example', q: R`You deposit \(\$1{,}000\) today at \(6\%\) a year. How much will you have in 5 years?`,
            steps: [R`Periods: \(N = 5\). Rate: \(I(\%) = 6\).`, R`You pay \(\$1{,}000\) in, so \(PV = -1000\). No extra payments: \(Pmt = 0\).`, R`Yearly: \(PpY = 1\), \(CpY = 1\). The unknown is \(FV\).`, R`Tab down to \(FV\) and press enter: \(FV = 1{,}338.23\).`],
            answer: R`You will have \(\$1{,}338.23\).`, ti: [TI.solver({ N: 5, I: 6, PV: -1000, Pmt: 0, PpY: 1, CpY: 1 }, 'FV')] },
          { kind: 'learn', title: 'The same sum as one line',
            body: R`Every box has a matching function. \(\text{tvmFV}(N, I, PV, Pmt, PpY, CpY)\) gives the future value in one line.\n\nAlways type \(PpY\) and \(CpY\) at the end. If you leave them out the calculator uses \(CpY = 1\), which is wrong for monthly or quarterly problems.`,
            viz: { type: 'anatomy', tex: R`\text{tvmFV}(\colD{5},\ \colB{6},\ \colA{-1000},\ \colE{0},\ \colC{1, 1})`, parts: [
              { sym: '5', c: 'D', say: R`\(N\): 5 years` },
              { sym: '6', c: 'B', say: R`\(I(\%)\): the rate as a percentage` },
              { sym: '-1000', c: 'A', say: R`\(PV\): the \(\$1{,}000\) you pay in` },
              { sym: '0', c: 'E', say: R`\(Pmt\): no payments` },
              { sym: '1, 1', c: 'C', say: R`\(PpY, CpY\): once a year` }],
              cap: R`Same order as the solver boxes, top to bottom. \(FV\) is left out: it is the answer.` },
            ti: [TI.cmd('tvmFV', [5, 6, -1000, 0, 1, 1])] },
          { kind: 'guided', title: 'Your turn', q: R`You deposit \(\$2{,}500\) today at \(4\%\) a year for 10 years. Set up the Finance Solver.`,
            parts: [
              { ask: R`What goes in \(N\)?`, answer: 10, unit: '', dp: 0, hint: 'Count the years.', why: R`\(N = 10\).` },
              { ask: R`What goes in \(I(\%)\)?`, answer: 4, unit: '', dp: 2, hint: 'Type the percentage itself, not the decimal.', why: R`\(I(\%) = 4\), not \(0.04\).` },
              { ask: R`What goes in \(PV\)?`, answer: -2500, unit: '', dp: 0, hint: 'You pay the money in. Money out is negative.', why: R`\(PV = -2500\): you pay it in.` },
              { ask: R`Solve for \(FV\). What do you get?`, answer: FIN.fv(2500, 0.04, 10), unit: '$', dp: 2, hint: R`Check \(Pmt = 0\), \(PpY = CpY = 1\).`, why: R`\(FV = 3{,}700.61\).` },
            ],
            answer: R`\(\$2{,}500\) grows to \(\$3{,}700.61\).`, ti: [TI.solver({ N: 10, I: 4, PV: -2500, Pmt: 0, PpY: 1, CpY: 1 }, 'FV')] },
          { kind: 'check', q: { kind: 'mcq', q: R`In the Finance Solver, a rate of \(7.5\%\) a year goes into \(I(\%)\) as…`,
            choices: [R`\(7.5\)`, R`\(0.075\)`, R`\(75\)`, R`\(1.075\)`], answer: 0,
            why: R`\(I(\%)\) takes the percentage itself: \(7.5\).` } },
          { kind: 'recap', title: 'Remember', points: [R`**menu 8 1** opens the Finance Solver.`, R`\(I(\%)\) is the yearly rate as a percentage.`, R`Money out is negative, money in is positive.`, R`Tab to the unknown box and press enter.`, R`In a \(\text{tvm}\) line, always finish with \(PpY, CpY\).`] },
        ],
      },
      'w0-L5': {
        title: 'Solve anything with nSolve',
        goal: R`Let the calculator find an unknown number in an equation.`,
        topics: ['nsolve'],
        cards: [
          { kind: 'learn', title: 'Equations with one unknown',
            body: R`Sometimes you know the answer but not one of the inputs. For example: “At what rate does \(\$1{,}000\) grow to \(\$1{,}500\) in 5 years?”\n\nWritten as an equation: \(1000(1 + r)^{5} = 1500\). The unknown is \(r\).`,
            viz: { type: 'anatomy', tex: R`\colA{1000}\,(1 + \colB{r})^{\colD{5}} = \colC{1500}`, parts: [
              { sym: '1000', c: 'A', say: R`the \(\$1{,}000\) you start with: **known**` },
              { sym: 'r', c: 'B', say: R`the yearly rate: **unknown**` },
              { sym: '5', c: 'D', say: R`the number of years: **known**` },
              { sym: '1500', c: 'C', say: R`the \(\$1{,}500\) you end with: **known**` }],
              cap: R`Three numbers are known. Only \(r\) is missing, so the calculator can find it.` } },
          { kind: 'learn', title: 'nSolve does the algebra',
            body: R`You could rearrange the equation by hand. Or type it into \(\text{nSolve}\) and name the unknown letter.\n\n\(\text{nSolve}(\text{equation}, r)\) returns the value of \(r\) that makes both sides equal.`,
            viz: { type: 'balance', tilt: 'level', key: true, left: { icon: '🌱', label: '1000(1 + r)^5', c: 1 }, right: { icon: '🎯', label: '1500', c: 3 },
              note: R`\(r = ${FIN.rate(1000, 1500, 5).toFixed(6)}\) makes both sides equal: about \(${L.pct(FIN.rate(1000, 1500, 5))}\) a year.`,
              cap: R`nSolve tries values of \(r\) until the two sides **balance**.` },
            ti: [TI.line('nSolve(1000*(1+r)^5=1500,r)')] },
          { kind: 'example', title: 'Worked example', q: R`At what yearly rate does \(\$1{,}000\) grow to \(\$1{,}500\) in 5 years?`,
            steps: [R`Write the growth equation: \(1000(1 + r)^{5} = 1500\).`, R`Type \(\text{nSolve}(1000(1+r)^{5} = 1500,\ r)\) in a Calculator page.`, R`The calculator gives \(r = 0.084472\).`, R`As a percentage: \(0.084472 \times 100 = 8.45\%\).`],
            answer: R`About \(8.45\%\) a year.`, ti: [TI.line('nSolve(1000*(1+r)^5=1500,r)')] },
          { kind: 'learn', title: 'solve gives every answer',
            body: R`\(\text{solve}\) (without the n) lists **every** solution. Some equations have a silly negative one too.\n\nAdd \(|r>0\) to keep only positive answers: \(\text{solve}((1+r)^{2}=1.21, r)|r>0\) gives \(r = 0.1\). The **|** means “with”.`,
            viz: { type: 'tiscreen', lines: [{ in: 'solve((1+r)^2=1.21,r)', out: 'r=−2.1 or r=0.1' }, { say: 'Add **|r>0** to keep only the positive one:' }, { in: 'solve((1+r)^2=1.21,r)|r>0', out: 'r=0.1' }],
              cap: R`\(r = -2.1\) would be a rate of \(-210\%\): silly. The condition throws it away.` },
            ti: [TI.line('solve((1+r)^2=1.21,r)|r>0')] },
          { kind: 'check', q: { kind: 'num', q: R`Use nSolve. \(\$500\) grows to \(\$800\) in 6 years. What yearly rate is that? Give it as a percentage.`, answer: P(Math.pow(1.6, 1 / 6) - 1), unit: '%', dp: 2,
            mistakes: [{ v: P(0.6 / 6), why: 'That is simple growth (60% ÷ 6). Compounding needs the equation 500(1 + r)^6 = 800.' }, { v: Math.pow(1.6, 1 / 6) - 1, why: 'That is the decimal. Multiply by 100 for a percentage.' }],
            why: R`\(\text{nSolve}(500(1+r)^{6} = 800, r)\) gives \(r = 0.081484\), which is \(8.15\%\).`,
            ti: [TI.line('nSolve(500*(1+r)^6=800,r)', { pct: true })] } },
          { kind: 'recap', title: 'Remember', points: [R`Write the equation, then \(\text{nSolve}(\text{equation}, \text{letter})\).`, R`The result for a rate is a decimal: multiply by 100 for a percentage.`, R`\(\text{solve}\) lists all answers; add \(|r>0\) to keep positive ones.`] },
        ],
      },
      'w0-L6': {
        title: 'Lists and statistics',
        goal: R`Store a list of numbers and find its mean, sum and standard deviation.`,
        topics: ['lists'],
        cards: [
          { kind: 'learn', title: 'A list is numbers in curly brackets',
            body: R`A **list** holds several numbers at once: \(\{0.08, 0.15, -0.12\}\).\n\nType \(\{\) with **ctrl (** and \(\}\) with **ctrl )**. Separate the numbers with commas.`,
            viz: { type: 'tiscreen', lines: [{ say: '[[ctrl]] [[(]] types {  and  [[ctrl]] [[)]] types }' }, { in: '{0.08,0.15,-0.12}', out: '{0.08,0.15,−0.12}' }],
              cap: R`One pair of curly brackets holds all three numbers. Commas keep them apart.` } },
          { kind: 'learn', title: 'Store it, then use it',
            body: R`Store the list in a letter with **→** (**ctrl var**): \(\{0.08, 0.15, -0.12\} \to x\).\n\nNow \(\text{sum}(x)\) adds them, \(\text{mean}(x)\) averages them, and \(\text{stDevSamp}(x)\) gives the **sample standard deviation** (how spread out they are).`,
            viz: { type: 'flow', steps: [{ t: R`\(\{0.08,\ 0.15,\ -0.12\}\)`, s: 'the list', c: 1 }, { t: R`\(x\)`, s: 'stored in one letter', icon: '📦', c: 1 }, { t: R`\(\text{mean}(x)\)`, s: R`\(= ${scr(FIN.mean([0.08, 0.15, -0.12]))}\)`, c: 3 }],
              links: ['[[ctrl]] [[var]]', ''],
              cap: R`Store once. Then \(\text{sum}\), \(\text{mean}\) and \(\text{stDevSamp}\) all work on the short letter.` },
            ti: [TI.line('{0.08,0.15,-0.12}→x'), TI.line('mean(x)')] },
          { kind: 'example', title: 'Worked example', q: R`A share returned \(10\%\), \(-4\%\), \(7\%\) and \(15\%\) over four years. What is the average return?`,
            steps: [R`As decimals: \(0.10, -0.04, 0.07, 0.15\).`, R`Add them: \(0.28\).`, R`Divide by 4: \(\frac{0.28}{4} = 0.07\), which is \(7\%\).`],
            answer: R`The average (mean) return is \(7\%\).`, ti: [TI.line('mean({0.10,-0.04,0.07,0.15})', { pct: true })] },
          { kind: 'learn', title: 'Lists multiply item by item',
            body: R`Two lists of the same length multiply item by item. \(\{0.5, 0.5\} \times \{0.2, -0.1\} = \{0.1, -0.05\}\).\n\nSo \(\text{sum}(p \times r)\) gives a probability-weighted average. You will use this for expected returns in Week 9.`,
            viz: { type: 'flow', op: true, key: true, steps: [{ t: R`\(\{0.5,\ 0.5\}\)`, s: R`\(p\): chances` }, { t: R`\(\{0.2,\ -0.1\}\)`, s: R`\(r\): returns` }, { t: R`\(\{0.1,\ -0.05\}\)`, s: 'first × first, second × second', c: 3 }],
              links: [R`\(\times\)`, R`\(=\)`],
              cap: R`Items pair up by position. Then \(\text{sum}\) adds the results: \(0.1 - 0.05 = 0.05\).` },
            ti: [TI.line('sum({0.5,0.5}*{0.2,-0.1})')] },
          { kind: 'check', q: { kind: 'num', q: R`Returns were \(12\%\), \(3\%\), \(-6\%\) and \(9\%\). What is the mean return, as a percentage?`, answer: 4.5, unit: '%', dp: 2,
            mistakes: [{ v: 18, why: 'That is the sum. Divide by the 4 returns.' }, { v: 0.045, why: 'That is the decimal. Multiply by 100.' }],
            why: R`\(\frac{0.12 + 0.03 - 0.06 + 0.09}{4} = \frac{0.18}{4} = 0.045 = 4.5\%\).`,
            ti: [TI.line('mean({0.12,0.03,-0.06,0.09})', { pct: true })] } },
          { kind: 'recap', title: 'Remember', points: [R`Lists go in \(\{\,\}\): **ctrl (** and **ctrl )**.`, R`**ctrl var** types → to store a list in a letter.`, R`\(\text{sum}\), \(\text{mean}\), \(\text{stDevSamp}\) work on lists.`, R`Lists multiply item by item: \(\text{sum}(p \times r)\).`] },
        ],
      },
    },

    questions: [
      { id: 'w0-q01', topic: 'pct', kind: 'mcq', level: 1, section: 'A', q: R`Which decimal is the same as \(4.5\%\)?`,
        choices: [R`\(0.045\)`, R`\(0.45\)`, R`\(4.5\)`, R`\(0.0045\)`], answer: 0, why: R`Divide by 100: \(4.5 \div 100 = 0.045\).` },
      { id: 'w0-q02', topic: 'pct', kind: 'mcq', level: 1, section: 'A', q: R`An amount grows by \(r\). What do you multiply it by?`,
        choices: [R`\((1 + r)\)`, R`\(r\)`, R`\((1 - r)\)`, R`\(\frac{1}{r}\)`], answer: 0, why: R`You keep the original amount and add \(r\) of it: \(X + rX = X(1 + r)\).` },
      { id: 'w0-q03', topic: 'pct', kind: 'tf', level: 1, section: 'A', q: R`\(0.25\) and \(25\%\) are the same number.`, answer: true, why: R`\(0.25 \times 100 = 25\%\).` },
      { id: 'w0-q04', topic: 'pow', kind: 'mcq', level: 1, section: 'A', q: R`What does \(1.05^{3}\) mean?`,
        choices: [R`\(1.05 \times 1.05 \times 1.05\)`, R`\(1.05 \times 3\)`, R`\(1.05 + 1.05 + 1.05\)`, R`\(1.05 \div 3\)`], answer: 0, why: R`A power means repeated multiplication.` },
      { id: 'w0-q05', topic: 'pow', kind: 'tf', level: 1, section: 'A', q: R`\(1.08^{-2}\) is the same as \(\frac{1}{1.08^{2}}\).`, answer: true, why: R`A negative power divides.` },
      { id: 'w0-q06', topic: 'pow', kind: 'mcq', level: 2, section: 'A', q: R`In \(500 \times (1 + 0.04)^{6}\), what does the calculator do first?`,
        choices: [R`Adds \(1 + 0.04\) inside the brackets`, R`Multiplies \(500 \times 1\)`, R`Raises \(0.04\) to the power 6`, R`Multiplies \(0.04 \times 6\)`], answer: 0, why: R`Brackets first, then the power, then the multiplication.` },
      { id: 'w0-q07', topic: 'ti', kind: 'mcq', level: 1, section: 'A', q: R`Which key types a negative number on the TI-Nspire?`,
        choices: ['The (−) key', 'The − subtract key', 'The ^ key', 'The del key'], answer: 0, why: R`The **(−)** key makes a number negative; the other minus subtracts.` },
      { id: 'w0-q08', topic: 'ti', kind: 'mcq', level: 1, section: 'A', q: R`The TI-Nspire shows \(\frac{1338226}{1000}\). How do you get a decimal?`,
        choices: ['Press ctrl enter', 'Press menu 8 1', 'Press the (−) key', 'Press tab'], answer: 0, why: R`**ctrl enter** gives the approximate (decimal) answer.` },
      { id: 'w0-q09', topic: 'solver', kind: 'mcq', level: 1, section: 'A', q: R`How do you open the Finance Solver in a Calculator page?`,
        choices: ['menu 8 1', 'menu 1 8', 'ctrl enter', 'home 5 2'], answer: 0, why: R`**menu → 8: Finance → 1: Finance Solver**.` },
      { id: 'w0-q10', topic: 'solver', kind: 'mcq', level: 1, section: 'A', q: R`You invest \(\$3{,}000\) today. In the Finance Solver, \(PV\) is…`,
        choices: [R`\(-3000\)`, R`\(3000\)`, R`\(0\)`, R`\(-0.03\)`], answer: 0, why: R`Money you pay out is negative.` },
      { id: 'w0-q11', topic: 'solver', kind: 'tf', level: 1, section: 'A', q: R`For a rate of \(9\%\) a year, you type \(0.09\) into \(I(\%)\).`, answer: false, why: R`\(I(\%)\) takes the percentage itself: type \(9\).` },
      { id: 'w0-q12', topic: 'solver', kind: 'mcq', level: 2, section: 'A', q: R`A problem has monthly payments and monthly compounding. What goes in \(PpY\) and \(CpY\)?`,
        choices: [R`\(PpY = 12\), \(CpY = 12\)`, R`\(PpY = 1\), \(CpY = 1\)`, R`\(PpY = 12\), \(CpY = 1\)`, R`\(PpY = 1\), \(CpY = 12\)`], answer: 0, why: R`Twelve payments and twelve compounding periods a year.` },
      { id: 'w0-q13', topic: 'nsolve', kind: 'mcq', level: 1, section: 'A', q: R`What does \(\text{nSolve}(200(1+r)^{3} = 250, r)\) give you?`,
        choices: [R`The rate \(r\) that makes \(200(1+r)^{3}\) equal \(250\)`, R`The value of \(200(1+r)^{3}\)`, R`The number of years`, R`An error, because \(r\) is unknown`], answer: 0, why: R`nSolve finds the unknown letter.` },
      { id: 'w0-q14', topic: 'lists', kind: 'mcq', level: 1, section: 'A', q: R`How do you type the curly bracket \(\{\) on the TI-Nspire?`,
        choices: ['ctrl then (', 'shift then (', 'menu then (', 'The ^ key'], answer: 0, why: R`**ctrl (** types \(\{\) and **ctrl )** types \(\}\).` },
      { id: 'w0-q15', topic: 'lists', kind: 'mcq', level: 1, section: 'A', q: R`Which function gives the average of a list?`,
        choices: [R`\(\text{mean}(\text{list})\)`, R`\(\text{sum}(\text{list})\)`, R`\(\text{stDevSamp}(\text{list})\)`, R`\(\text{dim}(\text{list})\)`], answer: 0, why: R`\(\text{mean}\) adds the values and divides by how many there are.` },
    ],

    generators: [
      { id: 'w0-g-todec', topic: 'pct', level: 1, section: 'B',
        make(rng) {
          const p = rng.pick([0.25, 0.5, 1.5, 2.75, 3, 4.25, 5.5, 6, 7.2, 8.5, 9.75, 11, 12.5, 14, 18, 22.5]);
          return {
            q: R`Write \(${L.numT(p, 2)}\%\) as a decimal.`,
            answer: p / 100, unit: '', dp: 4,
            mistakes: [{ v: p, why: 'That is still the percentage. Divide by 100.' }, { v: p / 10, why: 'Divide by 100, not 10.' }, { v: p / 1000, why: 'Divide by 100, not 1,000.' }],
            steps: [R`\[${L.numT(p, 2)}\% = \frac{${L.numT(p, 2)}}{100} = ${L.numT(p / 100, 4)}\]`],
            ti: [TI.line(`${n6(p)}/100`)],
            why: 'Per cent means out of 100, so divide by 100.',
          };
        } },
      { id: 'w0-g-topct', topic: 'pct', level: 1, section: 'B',
        make(rng) {
          const d = rng.pick([0.035, 0.0425, 0.06, 0.0725, 0.085, 0.1, 0.125, 0.1575, 0.2, 0.4459]);
          return {
            q: R`Write \(${L.numT(d, 4)}\) as a percentage.`,
            answer: P(d), unit: '%', dp: 2,
            mistakes: [{ v: d, why: 'Multiply by 100 to get a percentage.' }, { v: P(d) * 10, why: 'Multiply by 100, not 1,000.' }, { v: P(d) / 10, why: 'Multiply by 100, not 10.' }],
            steps: [R`\[${L.numT(d, 4)} \times 100 = ${L.numT(P(d), 2)}\%\]`],
            ti: [TI.line(`${n6(d)}*100`)],
            why: 'Multiply by 100 and add the % sign.',
          };
        } },
      { id: 'w0-g-of', topic: 'pct', level: 1, section: 'B',
        make(rng) {
          const x = rng.step(200, 20000, 50), p = rng.pick([2, 3.5, 4, 5, 6.5, 8, 10, 12.5, 15, 20, 25, 30]);
          const grow = rng.chance(0.5);
          const ans = grow ? x * (1 + p / 100) : x * p / 100;
          return {
            q: grow ? R`An amount of ${T.moneyT(x)} grows by ${L.numT(p, 2)}%. What is the new amount?` : R`What is ${L.numT(p, 2)}% of ${T.moneyT(x)}?`,
            answer: ans, unit: '$', dp: 2,
            mistakes: grow
              ? [{ v: x * p / 100, why: 'That is only the increase. Add it on, or multiply by (1 + r).' }, { v: x * (1 + p), why: 'Turn the percentage into a decimal first.' }]
              : [{ v: x * p, why: 'Turn the percentage into a decimal first (divide by 100).' }, { v: x * (1 + p / 100), why: 'That grows the amount. The question asks for the percentage of it.' }],
            steps: grow ? [R`\[${L.moneyT(x)} \times (1 + ${L.dec(p / 100)}) = ${L.money(ans)}\]`] : [R`\[${L.dec(p / 100)} \times ${L.moneyT(x)} = ${L.money(ans)}\]`],
            ti: [TI.line(grow ? `${n6(x)}*(1+${n6(p / 100)})` : `${n6(p / 100)}*${n6(x)}`)],
            why: grow ? 'Growing by r multiplies by (1 + r).' : '“Of” means multiply by the decimal.',
          };
        } },
      { id: 'w0-g-pow', topic: 'pow', level: 1, section: 'B',
        make(rng) {
          const x = rng.step(100, 10000, 50), r = rng.pick([0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.12]), n = rng.int(2, 12);
          const v = x * Math.pow(1 + r, n);
          return {
            q: R`Work out \(${L.numT(x)} \times ${L.onePlus(r)}^{${n}}\).`,
            answer: v, unit: '', dp: 2,
            mistakes: [{ v: x * (1 + r) * n, why: 'That multiplies by n. The power means multiply by (1 + r) n times.' }, { v: x * (1 + r * n), why: 'That adds r, n times (simple growth). The power compounds.' }],
            steps: [R`\[${L.onePlus(r)}^{${n}} = ${L.numT(Math.pow(1 + r, n), 6)}\]`, R`\[${L.numT(x)} \times ${L.numT(Math.pow(1 + r, n), 6)} = ${L.num(v, 2)}\]`],
            ti: [TI.line(`${n6(x)}*${n6(1 + r)}^${n}`)],
            why: 'Power first, then multiply.',
          };
        } },
      { id: 'w0-g-negpow', topic: 'pow', level: 2, section: 'B',
        make(rng) {
          const x = rng.step(1000, 50000, 500), r = rng.pick([0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.1]), n = rng.int(2, 10);
          const v = x / Math.pow(1 + r, n);
          return {
            q: R`Work out \(\frac{${L.numT(x)}}{${L.onePlus(r)}^{${n}}}\), which is the same as \(${L.numT(x)} \times ${L.onePlus(r)}^{-${n}}\).`,
            answer: v, unit: '', dp: 2,
            mistakes: [{ v: x * Math.pow(1 + r, n), why: 'That multiplies. Dividing by the power makes the number smaller.' }, { v: x / ((1 + r) * n), why: 'That divides by (1 + r) × n. Use the power.' }],
            steps: [R`\[${L.onePlus(r)}^{${n}} = ${L.numT(Math.pow(1 + r, n), 6)}\]`, R`\[\frac{${L.numT(x)}}{${L.numT(Math.pow(1 + r, n), 6)}} = ${L.num(v, 2)}\]`],
            ti: [TI.line(`${n6(x)}/${n6(1 + r)}^${n}`)],
            why: 'A negative power divides.',
          };
        } },
      { id: 'w0-g-solver', topic: 'solver', level: 1, section: 'B', formula: 'fv-lump',
        make(rng) {
          const pv = rng.step(500, 20000, 250), r = rng.step(0.02, 0.10, 0.005), n = rng.int(2, 15);
          const fv = FIN.fv(pv, r, n);
          return {
            q: R`Use the Finance Solver. You invest ${T.moneyT(pv)} today at ${T.pctT(r)} a year for ${n} years. What is the future value?`,
            givens: [['N', String(n)], ['I(\\%)', L.numT(P(r), 2)], ['PV', '-' + L.numT(pv)], ['Pmt', '0']],
            answer: fv, unit: '$', dp: 2,
            mistakes: [{ v: pv * (1 + r * n), why: 'That is simple interest. The solver compounds.' }, { v: FIN.pv(pv, r, n), why: 'That discounts. You want the future value.' }],
            steps: [R`\(N = ${n}\), \(I(\%) = ${L.numT(P(r), 2)}\), \(PV = -${L.numT(pv)}\), \(Pmt = 0\), \(PpY = CpY = 1\). Solve \(FV\).`, R`\[FV = ${L.money(fv)}\]`],
            ti: [TI.solver({ N: n, I: P(r), PV: -pv, Pmt: 0, PpY: 1, CpY: 1 }, 'FV')],
            why: 'Money out (PV) is negative, so the future value you receive is positive.',
          };
        } },
      { id: 'w0-g-nsolve', topic: 'nsolve', level: 2, section: 'B', formula: 'r-solve',
        make(rng) {
          const pv = rng.step(500, 5000, 100), n = rng.int(2, 10), r = rng.step(0.02, 0.12, 0.0025);
          const fv = Math.round(pv * Math.pow(1 + r, n));
          const rr = Math.pow(fv / pv, 1 / n) - 1;
          return {
            q: R`Use nSolve. \(\$${L.numT(pv)}\) grows to \(\$${L.numT(fv)}\) in ${n} years. What yearly rate is that (as a percentage)?`,
            answer: P(rr), unit: '%', dp: 2,
            mistakes: [{ v: P((fv / pv - 1) / n), why: 'That is simple growth. Solve the compound equation.' }, { v: rr, why: 'That is the decimal. Multiply by 100.' }],
            steps: [R`\[${L.numT(pv)}(1 + r)^{${n}} = ${L.numT(fv)}\]`, R`\[r = ${L.numT(rr, 6)} = ${L.pct(rr, 2)}\]`],
            ti: [TI.line(`nSolve(${n6(pv)}*(1+r)^${n}=${n6(fv)},r)`, { pct: true })],
            why: 'nSolve finds the rate; multiply by 100 for a percentage.',
          };
        } },
      { id: 'w0-g-mean', topic: 'lists', level: 1, section: 'B',
        make(rng) {
          const k = rng.int(4, 6);
          let xs, m;
          do { xs = Array.from({ length: k }, () => rng.step(-0.1, 0.2, 0.01)); m = xs.reduce((a, b) => a + b, 0) / k; } while (Math.abs(m) < 0.01);
          return {
            q: R`Returns over ${k} years were ${xs.map((x) => R`\(${L.numT(x * 100, 0)}\%\)`).join(', ')}. What is the mean return, as a percentage?`,
            answer: P(m), unit: '%', dp: 2,
            mistakes: [{ v: P(m * k), why: 'That is the sum. Divide by the number of years.' }, { v: m, why: 'That is the decimal. Multiply by 100.' }],
            steps: [R`\[\bar{R} = \frac{${xs.map((x) => L.numT(x, 2)).join(' + ').replace(/\+ -/g, '- ')}}{${k}} = ${L.numT(m, 4)} = ${L.pct(m, 2)}\]`],
            ti: [TI.line(`mean(${TI.list(xs.map((x) => +x.toFixed(4)))})`, { pct: true })],
            why: 'Add the returns and divide by how many there are.',
          };
        } },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
