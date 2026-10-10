(function (root, factory) {
  const pieces = factory();
  if (typeof module === 'object' && module.exports) module.exports = pieces;
  if (root) root.PackingPieces = pieces;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const bases = {
    I: [[0,0],[1,0],[2,0],[3,0]],
    O: [[0,0],[0,1],[1,0],[1,1]],
    T: [[0,0],[0,1],[0,2],[1,1]],
    L: [[0,0],[1,0],[2,0],[2,1]],
    S: [[0,1],[0,2],[1,0],[1,1]]
  };
  const normalize = cells => {
    const minRow = Math.min(...cells.map(cell => cell[0]));
    const minColumn = Math.min(...cells.map(cell => cell[1]));
    return cells.map(([row,column]) => [row-minRow,column-minColumn]).sort((a,b) => a[0]-b[0] || a[1]-b[1]);
  };
  const variants = [], byFamily = {};
  for (const [kind,base] of Object.entries(bases)) {
    const seen = new Set();
    byFamily[kind] = [];
    for (const reflected of [false,true]) {
      let cells = base.map(([row,column]) => [row,reflected?-column:column]);
      for (let turn = 0; turn < 4; turn++) {
        const normalized = normalize(cells), key = normalized.map(cell => cell.join(',')).join(';');
        if (!seen.has(key)) {
          seen.add(key);
          const [anchorRow,anchorColumn] = normalized[0];
          const anchored = normalized.map(([row,column]) => Object.freeze([row-anchorRow,column-anchorColumn]));
          const variant = Object.freeze({kind,orientation:byFamily[kind].length,cells:Object.freeze(anchored),rotation:turn*90,reflected});
          byFamily[kind].push(variant); variants.push(variant);
        }
        cells = cells.map(([row,column]) => [column,-row]);
      }
    }
    Object.freeze(byFamily[kind]);
  }
  function offsets(kind,orientation) {
    return (byFamily[kind]?.[Number(orientation)]?.cells || []).map(cell => [...cell]);
  }
  function orientations(kind) { return (byFamily[kind] || []).map(variant => variant.orientation); }
  function description(kind,orientation) {
    const variant = byFamily[kind]?.[Number(orientation)];
    if (!variant) return 'four-square piece';
    const details = [variant.reflected ? 'mirrored' : '',variant.rotation ? `rotated ${variant.rotation} degrees` : ''].filter(Boolean);
    return `${kind} tetromino${details.length ? ', '+details.join(', ') : ''}`;
  }
  return Object.freeze({families:Object.freeze(Object.keys(bases)),variants:Object.freeze(variants),offsets,orientations,description});
});
