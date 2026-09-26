/* Build the calculator app: src/main.lua (with --@include lines expanded) -> build/bfc2140_solver.lua
 * and BFC2140_SOLVER.tns (open it on a TI-Nspire CX / CX II, OS 3.2 or later).
 *   node calculator/tools/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { buildTns } = require('./tns');
const DIR = path.join(__dirname, '..');
function expand(file, seen = new Set()) {
  if (seen.has(file)) throw new Error('include loop: ' + file);
  seen.add(file);
  return fs.readFileSync(file, 'utf8').split('\n').map((line) => {
    const m = line.match(/^\s*--@include(\??)\s+(\S+)\s*$/);
    if (!m) return line;
    const f = path.join(path.dirname(file), m[2]);
    if (m[1] === '?' && !fs.existsSync(f)) return `-- (${m[2]} not found: skipped)`;
    return expand(f, seen);
  }).join('\n');
}
const lua = expand(path.join(DIR, 'src', 'main.lua'));
if (/[^\x00-\x7f]/.test(lua)) {
  const i = lua.search(/[^\x00-\x7f]/);
  const line = lua.slice(0, i).split('\n').length;
  throw new Error(`non-ASCII character on line ${line} of the built script: keep the app ASCII-only (the calculator font may lack the glyph)`);
}
fs.mkdirSync(path.join(DIR, 'build'), { recursive: true });
fs.writeFileSync(path.join(DIR, 'build', 'bfc2140_solver.lua'), lua);
const tns = buildTns(lua);
fs.writeFileSync(path.join(DIR, 'BFC2140_SOLVER.tns'), tns);
const ver = (lua.match(/local VERSION = "([^"]+)"/) || [])[1];
console.log(`built ${ver}: ${lua.split('\n').length} lines, ${(lua.length / 1024).toFixed(0)} KB of Lua -> BFC2140_SOLVER.tns (${(tns.length / 1024).toFixed(0)} KB)`);
