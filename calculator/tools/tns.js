/* Build a TI-Nspire document (.tns) from a Lua script: the same file layout as the Luna converter
 * (github.com/ndless-nspire/Luna, MPL 1.1), which the user's v21 solver was built with.
 *   node calculator/tools/tns.js <in.lua> <out.tns>
 *   node calculator/tools/tns.js --extract <in.tns> <out.lua>     (read the Lua back out of a document)
 * A .tns is a zip file with a TI header. Each XML part is compressed ("TIXC" form, closing tags as \x0E + index),
 * deflated, then encrypted with Triple DES in a counter mode using TI's fixed document keys.
 */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

const KEY = Buffer.from([0x16, 0xA7, 0xA7, 0x32, 0x68, 0xA7, 0xBA, 0x73, 0xD9, 0xA8, 0x86, 0xA4, 0x34, 0x45, 0x94, 0x10, 0x3D, 0x80, 0x8C, 0xB5, 0xDF, 0xB3, 0x80, 0x6B]);
const IVEC_BASE = 0x6fe21307;
// encrypted header that goes in front of every encrypted part (it carries the key set above)
const CRYPT_HEADER = Buffer.from('0FCED8D28106865B99DDA23DD9E94BD431BB50B64DB32924706049381C30F899004B9264E458E6BC', 'hex');
// the standard Document.xml part, already processed
const DOCUMENT_XML = Buffer.from(
  '0FCED8D28106865B4A4AC5CEA916F2D51DA82F6E0022F2F0C1A606774D7EA6C03AF05C74BAAA4460CD58E670D740F69C17DCF09477BFCADEF70209C9' +
  '62B15DEF22FA5137A0819148E1834DAD08312DD0D3E32D60AB13C2982BED395B092439922F0C7A4C9574913B0CF460CC7327CB077E7FA91787E2ACA2' +
  '3BCCA0C4E38E89F0C0519FC2BECE2845C3D41190A6EC53A0FB5B466B41ADE953BB97DBB1D268E2F6360F2636759BE91F48ADE929670058' +
  '19C3C01276A04A73F3B1D30918D606DD9724533E22A4FB82507B7C12884E7D4180FE72922987E85C5672FF29168C425B8B9BA7D2086DD398FF91A99EF393A82E1C' +
  'B2A96B6ADFF6CE2D1517CE6EC04F9A9C0EDF198D2DFA699F11D22012E07914044E628F0A2A18725A8B80B33C9BD567594B514DE0C33828C3DCCD3922128C4055', 'hex');
// compressed-XML wrapper for one Lua page (from Luna)
const LUA_HEADER = Buffer.concat([Buffer.from(
  '54495843303130302D312E303F3E3C70726F6220786D6C6E733D2275726E3A54492E50A85F5B1F0A22207665723D22312E302220706' +
  '26E616D653D22223E3C73796D3E0E013C6361726420636C61793D2230222068313D22F10000FF222068323D22F10000FF222077313D22F1' +
  '0000FF222077323D22F10000FF223E3C697344756D6D79436172643E300E033C666C61673E300E043C7764677420786D6C6E733A73633D22' +
  '75726E3A54492E53AC84F22A4170702220747970653D2254492E53AC84F22A41707022207665723D22312E30223E3C73633A6D466C6167733E' +
  '300E063C73633A76616C75653E2D310E073C73633A73637269707420766572' +
  '73696F6E3D22353132222069643D2230223E', 'hex'), Buffer.from('<![CDATA[')]);
const LUA_FOOTER = Buffer.concat([Buffer.from(']]>'), Buffer.from([0x0E, 0x08, 0x0E, 0x05, 0x0E, 0x02, 0x0E, 0x00])]);

function keystream(n) {
  const out = Buffer.alloc(Math.ceil(n / 8) * 8);
  const c = crypto.createCipheriv('des-ede3', KEY, null);
  c.setAutoPadding(false);
  for (let i = 0; i * 8 < n; i++) {
    const blk = Buffer.alloc(8);
    blk.writeUInt32LE((IVEC_BASE + (i % 1024)) >>> 0, 4);
    c.update(blk).copy(out, i * 8);
  }
  return out.subarray(0, n);
}
function crypt(buf) { const k = keystream(buf.length); const o = Buffer.alloc(buf.length); for (let i = 0; i < buf.length; i++) o[i] = buf[i] ^ k[i]; return o; }

/** The Problem1.xml part for a Lua script. */
function luaPart(lua) {
  let src = Buffer.from(lua, 'utf8');
  if (src[0] === 0xEF && src[1] === 0xBB && src[2] === 0xBF) src = src.subarray(3);
  // a "]]>" inside the script would end the CDATA section: split it across two sections
  const fixed = Buffer.from(src.toString('latin1').split(']]>').join(']]]]><![CDATA[>'), 'latin1');
  const xml = Buffer.concat([LUA_HEADER, fixed, LUA_FOOTER]);
  const def = zlib.deflateRawSync(xml, { level: 6, memLevel: 8, windowBits: 15 });
  return Buffer.concat([CRYPT_HEADER, crypt(def)]);
}

function zipTns(parts) {
  const locals = [], central = [];
  let off = 0;
  parts.forEach(([name, data], k) => {
    const nm = Buffer.from(name, 'latin1');
    const crc = zlib.crc32(data) >>> 0;
    const sig = k === 0 ? Buffer.from('*TIMLP0500', 'latin1') : Buffer.from([0x50, 0x4B, 0x03, 0x04]);
    const h = Buffer.alloc(26);
    h.writeUInt16LE(0x14, 0); h.writeUInt16LE(0, 2); h.writeUInt16LE(0x0D, 4); h.writeUInt16LE(0, 6); h.writeUInt16LE(0, 8);
    h.writeUInt32LE(crc, 10); h.writeUInt32LE(data.length, 14); h.writeUInt32LE(data.length, 18); h.writeUInt16LE(nm.length, 22); h.writeUInt16LE(0, 24);
    const loc = Buffer.concat([sig, h, nm, data]);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014B50, 0); c.writeUInt16LE(0, 4); c.writeUInt16LE(0x14, 6); c.writeUInt16LE(0, 8); c.writeUInt16LE(0x0D, 10);
    c.writeUInt16LE(0, 12); c.writeUInt16LE(0, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nm.length, 28); c.writeUInt16LE(0, 30); c.writeUInt16LE(0, 32); c.writeUInt16LE(0, 34); c.writeUInt16LE(0, 36); c.writeUInt32LE(0, 38); c.writeUInt32LE(off, 42);
    central.push(Buffer.concat([c, nm]));
    locals.push(loc);
    off += loc.length;
  });
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  Buffer.from('TIPD', 'latin1').copy(end, 0);
  end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6); end.writeUInt16LE(parts.length, 8); end.writeUInt16LE(parts.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, end]);
}

function buildTns(lua) { return zipTns([['Document.xml', DOCUMENT_XML], ['Problem1.xml', luaPart(lua)]]); }

/** Read the Lua script back out of a .tns (built by Luna or by this tool). */
function extractLua(tns) {
  let p = 0;
  while (p < tns.length) {
    let q;
    if (tns.subarray(p, p + 6).toString('latin1') === '*TIMLP') q = p + 10;
    else if (tns.readUInt32LE(p) === 0x04034B50) q = p + 4;
    else break;
    const method = tns.readUInt16LE(q + 4), csize = tns.readUInt32LE(q + 14), nlen = tns.readUInt16LE(q + 22), xlen = tns.readUInt16LE(q + 24);
    const name = tns.subarray(q + 26, q + 26 + nlen).toString('latin1');
    const data = tns.subarray(q + 26 + nlen + xlen, q + 26 + nlen + xlen + csize);
    if (name === 'Problem1.xml' && method === 0x0D && data.subarray(0, 40).equals(CRYPT_HEADER)) {
      const xml = zlib.inflateRawSync(crypt(data.subarray(40))).toString('latin1');
      const a = xml.indexOf('<![CDATA['), b = xml.lastIndexOf(']]>');
      return Buffer.from(xml.slice(a + 9, b).split(']]]]><![CDATA[>').join(']]>'), 'latin1').toString('utf8');
    }
    p = q + 26 + nlen + xlen + csize;
  }
  throw new Error('no Lua script found');
}

module.exports = { buildTns, extractLua };

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === '--extract') { fs.writeFileSync(a[2], extractLua(fs.readFileSync(a[1]))); console.log('wrote', a[2]); }
  else if (a.length === 2) { const out = buildTns(fs.readFileSync(a[0], 'utf8')); fs.writeFileSync(a[1], out); console.log(`wrote ${a[1]} (${out.length} bytes)`); }
  else console.log('usage: node calculator/tools/tns.js <in.lua> <out.tns> | --extract <in.tns> <out.lua>');
}
