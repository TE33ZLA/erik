/* Read-aloud voice choice: the most natural English voice wins, robotic ones lose. Run: node tests/voice.test.js */
'use strict';
require('../js/lib/voice.js');
const V = globalThis.VOICE;
let pass = 0, fail = 0;
function eq(name, got, want) {
  if (got === want) pass++;
  else { fail++; console.log('FAIL', name, '\n  got ', got, '\n  want', want); }
}
const v = (name, lang, extra) => Object.assign({ name, lang, localService: true, default: false }, extra || {});
const pc = { android: false };
const bestName = (list, env) => { const r = list.filter((x) => V.rank(x, env) >= 0).sort((a, b) => V.rank(b, env) - V.rank(a, env) || a.name.localeCompare(b.name)); return r[0] && r[0].name; };

// Microsoft Edge on Windows: the online Natural voices beat the old desktop voices
const edge = [v('Microsoft Catherine - English (Australia)', 'en-AU', { default: true }), v('Microsoft David - English (United States)', 'en-US'),
  v('Microsoft Natasha Online (Natural) - English (Australia)', 'en-AU', { localService: false }), v('Microsoft Aria Online (Natural) - English (United States)', 'en-US', { localService: false }),
  v('Microsoft William Online (Natural) - English (Australia)', 'en-AU', { localService: false })];
eq('edge best', bestName(edge, pc), 'Microsoft Natasha Online (Natural) - English (Australia)');
eq('edge natural', V.rank(edge[2], pc) >= 60, true);
eq('edge desktop not natural', V.rank(edge[0], pc) >= 60, false);

// Chrome on Windows: Google voices beat Microsoft desktop voices, and non-English voices never win
const chrome = [v('Microsoft David - English (United States)', 'en-US', { default: true }), v('Microsoft Zira - English (United States)', 'en-US'),
  v('Google US English', 'en-US', { localService: false }), v('Google UK English Female', 'en-GB', { localService: false }), v('Google UK English Male', 'en-GB', { localService: false }), v('Google Deutsch', 'de-DE', { localService: false })];
eq('chrome best', bestName(chrome, pc), 'Google UK English Female');
eq('german excluded', V.rank(chrome[5], pc) < 0, true);

// A Mac or iPhone with a downloaded Premium voice, plus novelty voices that must never win
const mac = [v('Karen', 'en-AU', { default: true }), v('Samantha', 'en-US'), v('Fred', 'en-US'), v('Albert', 'en-US'), v('Zoe (Enhanced)', 'en-US'), v('Lee (Premium)', 'en-AU'), v('Catherine', 'en-AU')];
eq('mac best', bestName(mac, pc), 'Lee (Premium)');
eq('fred robotic', V.rank(mac[2], pc) < V.rank(mac[0], pc), true);
eq('apple catherine not penalised', V.rank(mac[6], pc) >= V.rank(mac[0], pc) - 1, true);

// iPhone with only the built-in voices: Australian first, but not called natural
const ios = [v('Karen', 'en-AU', { default: true }), v('Samantha', 'en-US'), v('Daniel', 'en-GB')];
eq('ios best', bestName(ios, pc), 'Karen');
eq('ios karen not natural', V.isNatural(ios[0]) && V.rank(ios[0], pc) >= 60, false);

// Android: Google's speech engine voices count as natural
eq('android natural', V.rank(v('English (Australia)', 'en-AU'), { android: true }) >= 60, true);
eq('android network beats local', V.rank(v('en-au-x-aua-network', 'en-AU'), { android: true }) > V.rank(v('en-au-x-aua-local', 'en-AU'), { android: true }), true);
eq('espeak robotic', V.rank(v('eSpeak English', 'en'), pc) < 0 || V.rank(v('eSpeak English', 'en'), pc) < 60, true);

// Friendly labels
eq('label edge', V.label(edge[2]), 'Natasha (Australian, natural)');
eq('label apple', V.label(mac[5]), 'Lee (Australian, premium)');
eq('label google', V.label(chrome[3]), 'Google UK English Female (British, good)');

// Sentence chunks: split at sentence ends, never inside a decimal number
const c = V.chunks('Your $1,338.23 grows at 6.5% a year. After 5 years it is worth more! Is it?');
eq('chunks count', c.length, 3);
eq('chunk 1', c[0], 'Your $1,338.23 grows at 6.5% a year.');
const long = V.chunks('a'.repeat(150) + ', ' + 'b'.repeat(150) + '.', 220);
eq('long sentence split at comma', long.length, 2);
eq('empty', V.chunks('   ').length, 0);

console.log(`${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
