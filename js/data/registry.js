/* Corporate Ladder — content registry. Floor packs call registerPack({...}). */
(function (root) {
  'use strict';
  root.PACKS = root.PACKS || [];
  root.registerPack = function (pack) {
    root.PACKS = root.PACKS.filter((p) => p.id !== pack.id);
    root.PACKS.push(pack);
    root.PACKS.sort((a, b) => a.floor - b.floor);
  };
})(typeof window !== 'undefined' ? window : globalThis);
