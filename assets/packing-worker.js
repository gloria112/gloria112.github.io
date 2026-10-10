'use strict';
importScripts('./packing-pieces.js?v=tetrominoes-1', './packing-solver.js?v=tetrominoes-1');
self.onmessage = function (event) {
  const {id, position, seed, size, type} = event.data || {};
  try {
    const options={size,onProgress: progress => self.postMessage({id,type:'progress',...progress})};
    if(type==='generate') {
      const generated=PackingSolver.generate(seed,options);
      self.postMessage({id,type:'generated',...generated});
    } else {
      const result=PackingSolver.solve(position,options);
      self.postMessage({id,type:'result',...result});
    }
  } catch(error) {
    self.postMessage({id,type:'error',message:error.message || 'Unable to calculate the hindsight optimum.'});
  }
};
