// Render [[pngPath, svgString], ...] (JSON file) to PNGs, plus a contact sheet <dir>/sheet.png of all frames.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const frames = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  // the pre-installed Chromium: /opt/pw-browsers/chromium (a link), else the first chromium-* folder (chrome-linux or chrome-linux64)
  let exePath = '/opt/pw-browsers/chromium';
  if (!fs.existsSync(exePath)) {
    const d = fs.readdirSync('/opt/pw-browsers').find(x => x.startsWith('chromium-'));
    exePath = ['chrome-linux64', 'chrome-linux'].map(x => `/opt/pw-browsers/${d}/${x}/chrome`).find(x => fs.existsSync(x));
  }
  const b = await chromium.launch({ executablePath: exePath });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  for (const [png, svg] of frames) {
    await p.setContent(`<body style="margin:0">${svg}</body>`);
    const el = await p.$('svg');
    await el.screenshot({ path: png });
  }
  await b.close();
})();
