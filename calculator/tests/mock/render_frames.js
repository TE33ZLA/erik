// Render [[pngPath, svgString], ...] (JSON file) to PNGs, plus a contact sheet <dir>/sheet.png of all frames.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const frames = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const exe = fs.readdirSync('/opt/pw-browsers').find(d => d.startsWith('chromium-'));
  const b = await chromium.launch({ executablePath: `/opt/pw-browsers/${exe}/chrome-linux/chrome` });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  for (const [png, svg] of frames) {
    await p.setContent(`<body style="margin:0">${svg}</body>`);
    const el = await p.$('svg');
    await el.screenshot({ path: png });
  }
  await b.close();
})();
