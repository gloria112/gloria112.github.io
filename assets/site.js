document.documentElement.classList.remove('no-js');

const research = document.querySelector('[data-research]');
if (research) {
  const input = document.querySelector('#paper-search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const papers = [...research.querySelectorAll('[data-paper]')];
  const groups = [...research.querySelectorAll('[data-group]')];
  const empty = document.querySelector('#empty-results');
  const status = document.querySelector('#search-status');
  let active = 'all';
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function update() {
    const query = normalize(input.value.trim());
    let visible = 0;
    papers.forEach(paper => {
      const matches = (active === 'all' || paper.dataset.kind === active) && normalize(paper.textContent).includes(query);
      paper.hidden = !matches;
      if (matches) visible++;
    });
    groups.forEach(group => {
      const count = [...group.querySelectorAll('[data-paper]')].filter(paper => !paper.hidden).length;
      group.hidden = count === 0;
      const badge = group.querySelector('.count');
      badge.textContent = count;
      badge.setAttribute('aria-label', `${count} ${count === 1 ? 'paper' : 'papers'}`);
    });
    empty.hidden = visible !== 0;
    status.textContent = `${visible} ${visible === 1 ? 'paper' : 'papers'} shown`;
  }
  filters.forEach(button => button.addEventListener('click', () => {
    active = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    update();
  }));
  input.addEventListener('input', update);
}

// Mulberry32 keeps a generated starting position reproducible from its seed.
function makeGameRandom(seed) {
  let value = Number(seed) >>> 0;
  return function random() {
    value = (value + 0x6D2B79F5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function generateDomineeringPosition(rng = Math.random, size = 13) {
  const ranges = {7:[2,4],9:[4,6],11:[6,9],13:[8,12]};
  if (!ranges[size]) size = 13;
  const [minimum,maximum] = ranges[size];
  const count = minimum + Math.floor(rng() * (maximum - minimum + 1));
  const cells = Array.from({ length: size * size }, (_, index) => index);
  // A partial Fisher–Yates shuffle samples distinct blocked squares uniformly.
  for (let index = 0; index < count; index++) {
    const selected = index + Math.floor(rng() * (cells.length - index));
    [cells[index], cells[selected]] = [cells[selected], cells[index]];
  }
  return { size, blocked: cells.slice(0, count).sort((a, b) => a - b) };
}

// The browser and optimizer use the same complete pentomino geometry.
function shapeOffsets(kind, orientation) {
  return PackingPieces.offsets(kind, orientation);
}

function shapeCells(kind, player, anchor, size) {
  if (!Number.isInteger(anchor) || anchor < 0 || anchor >= size * size) return null;
  const offsets = shapeOffsets(kind, player);
  if (!offsets.length) return null;
  const row = Math.floor(anchor / size), column = anchor % size;
  const cells = [];
  for (const [dr, dc] of offsets) {
    if (row + dr < 0 || row + dr >= size || column + dc < 0 || column + dc >= size) return null;
    cells.push((row + dr) * size + column + dc);
  }
  return cells;
}

function generatePackingPosition(seed, options = {}) {
  const normalizedSeed = Number(seed) >>> 0;
  const position = generateDomineeringPosition(makeGameRandom(normalizedSeed), options.size || 13);
  const rng = makeGameRandom(normalizedSeed ^ 0x9e3779b9);
  const kinds = PackingPieces.families;
  const sequence = Array.from({ length: 64 }, () => {
    const kind = kinds[Math.floor(rng() * kinds.length)];
    const orientations = PackingPieces.orientations(kind);
    return { kind, orientation: orientations[Math.floor(rng() * orientations.length)] };
  });
  return { ...position, seed: normalizedSeed, sequence };
}

function packingState(position, placements = []) {
  const occupied = new Set(position.blocked);
  placements.forEach(piece => piece.cells.forEach(cell => occupied.add(cell)));
  const index = placements.length;
  const currentPiece = position.sequence[index];
  const legalMoves = [];
  if (currentPiece) {
    for (let anchor = 0; anchor < position.size * position.size; anchor++) {
      const cells = shapeCells(currentPiece.kind, currentPiece.orientation, anchor, position.size);
      if (cells && cells.every(cell => !occupied.has(cell))) legalMoves.push(anchor);
    }
  }
  return {
    size: position.size, blocked: [...position.blocked], seed: position.seed, sequence: position.sequence,
    placements: [...placements], index, currentPiece, queue: position.sequence.slice(index, index + 2),
    legalMoves, coveredTiles: placements.reduce((sum,piece) => sum + piece.cells.length, 0),
    finished: legalMoves.length === 0
  };
}

function placePackingPiece(state, anchor) {
  if (state.finished || !state.legalMoves.includes(anchor)) return state;
  const piece = {
    index: state.index, ...state.currentPiece, anchor,
    cells: shapeCells(state.currentPiece.kind, state.currentPiece.orientation, anchor, state.size)
  };
  return packingState(state, [...state.placements, piece]);
}

// A square can be used whenever some legal placement covers it.
function resolvePackingAnchor(state, hoveredCell) {
  if (!state || state.finished || !state.currentPiece || !Number.isInteger(hoveredCell)
    || hoveredCell < 0 || hoveredCell >= state.size * state.size) return -1;
  if (state.legalMoves.includes(hoveredCell)) return hoveredCell;
  const row = Math.floor(hoveredCell / state.size), column = hoveredCell % state.size;
  const offsets = shapeOffsets(state.currentPiece.kind, state.currentPiece.orientation);
  let best = -1, distance = Infinity;
  for (const anchor of state.legalMoves) {
    const dr = row - Math.floor(anchor / state.size), dc = column - anchor % state.size;
    if (!offsets.some(offset => offset[0] === dr && offset[1] === dc)) continue;
    const candidateDistance = dr * dr + dc * dc;
    if (candidateDistance < distance || (candidateDistance === distance && anchor < best)) {
      best = anchor; distance = candidateDistance;
    }
  }
  return best;
}

// Full-cell pointer routing uses the same anchor for preview and placement.
function packingAnchorAtPoint(size, svgX, svgY) {
  if (!Number.isFinite(svgX) || !Number.isFinite(svgY)) return -1;
  const left = (400 - size * 32) / 2, top = 5;
  const column = Math.floor((svgX - left) / 32), row = Math.floor((svgY - top) / 32);
  if (row < 0 || row >= size || column < 0 || column >= size) return -1;
  return row * size + column;
}

// Trace the boundary of a polyomino so every piece reads as one connected shape.
function shapeOutline(kind, player, unit, inset, originX, originY) {
  const offsets = shapeOffsets(kind, player);
  const occupied = new Set(offsets.map(([row, column]) => `${column},${row}`));
  const edges = new Map();
  const add = (x1,y1,x2,y2) => edges.set(`${x1},${y1}`, [x2,y2]);
  offsets.forEach(([row,column]) => {
    if (!occupied.has(`${column},${row-1}`)) add(column,row,column+1,row);
    if (!occupied.has(`${column+1},${row}`)) add(column+1,row,column+1,row+1);
    if (!occupied.has(`${column},${row+1}`)) add(column+1,row+1,column,row+1);
    if (!occupied.has(`${column-1},${row}`)) add(column,row+1,column,row);
  });
  const first = [...edges.keys()][0].split(',').map(Number);
  const points = [first];
  let next = edges.get(first.join(','));
  while (next.join(',') !== first.join(',')) { points.push(next); next = edges.get(next.join(',')); }
  const corners = points.filter((point,index) => {
    const previous = points[(index+points.length-1)%points.length], following = points[(index+1)%points.length];
    return (point[0]-previous[0])*(following[1]-point[1]) !== (point[1]-previous[1])*(following[0]-point[0]);
  });
  const inner = corners.map((point,index) => {
    const previous = corners[(index+corners.length-1)%corners.length], following = corners[(index+1)%corners.length];
    const dx1=Math.sign(point[0]-previous[0]),dy1=Math.sign(point[1]-previous[1]);
    const dx2=Math.sign(following[0]-point[0]),dy2=Math.sign(following[1]-point[1]);
    return [originX+point[0]*unit-inset*(dy1+dy2),originY+point[1]*unit+inset*(dx1+dx2)];
  });
  const radius = Math.min(3, unit*.14);
  const round = value => Math.round(value*100)/100;
  let path = '';
  inner.forEach((point,index) => {
    const previous=inner[(index+inner.length-1)%inner.length],following=inner[(index+1)%inner.length];
    const before=[point[0]+Math.sign(previous[0]-point[0])*radius,point[1]+Math.sign(previous[1]-point[1])*radius];
    const after=[point[0]+Math.sign(following[0]-point[0])*radius,point[1]+Math.sign(following[1]-point[1])*radius];
    path += `${index ? 'L' : 'M'}${before.map(round).join(' ')}Q${point.map(round).join(' ')} ${after.map(round).join(' ')}`;
  });
  return path+'Z';
}

function shapeDescription(kind, orientation) {
  return PackingPieces.description(kind, orientation);
}

function initializeDomineering(widget) {
  if (widget.dataset.gameReady === 'true') return;
  const status=widget.querySelector('[data-game-status]'),reset=widget.querySelector('[data-game-reset]');
  const newGame=widget.querySelector('[data-game-new]'),help=widget.querySelector('[data-game-help]');
  const board=widget.querySelector('[data-domineering-board]'),queues=widget.querySelector('[data-piece-queues]');
  const score=widget.querySelector('[data-game-score]'),results=widget.querySelector('[data-game-results]');
  const viewButtons=[...widget.querySelectorAll('[data-game-view]')];
  const setup=widget.querySelector('[data-game-setup]'),play=widget.querySelector('[data-game-play]'),start=widget.querySelector('[data-game-start]');
  const sizeButtons=[...widget.querySelectorAll('[data-game-size]')];
  if (!board || !status || !reset) return;
  let position=null, state=null, solution=null, solverError=false, worker=null, gameToken=0, currentView='player', preparing=false, selectedSize=9, lastPointer=null;
  const sourceURL=document.currentScript?.src || new URL('assets/site.js',document.baseURI).href;
  const workerURL=new URL('packing-worker.js',sourceURL);
  workerURL.search=new URL(sourceURL).search;
  const grid=document.createElementNS('http://www.w3.org/2000/svg','g');
  grid.setAttribute('data-domineering-grid','');
  board.appendChild(grid);
  const cellPosition=anchor=>({x:(400-state.size*32+2)/2+(anchor%state.size)*32,y:6+Math.floor(anchor/state.size)*32});

  function pieceDrawing(piece,preview=false) {
    const {x,y}=cellPosition(piece.anchor);
    const d=shapeOutline(piece.kind,piece.orientation,32,2.5,x-1,y-1);
    return `<path data-placed-shape="${piece.kind}" data-placement-anchor="${piece.anchor}" d="${d}" fill="${preview?'#99dcee':'url(#dm-piece)'}" fill-opacity="${preview?'.17':'.88'}" stroke="#99dcee" stroke-width="${preview?'1.8':'.8'}" stroke-linejoin="round"/>`;
  }

  function renderQueue() {
    if (!queues) return;
    queues.innerHTML=`<div class="piece-queue is-active" data-player="solo"><span class="piece-label">Your pieces</span><div class="piece-slots">${state.queue.map((piece,index)=>{
      const offsets=shapeOffsets(piece.kind,piece.orientation);
      const minColumn=Math.min(...offsets.map(offset=>offset[1])),minRow=Math.min(...offsets.map(offset=>offset[0]));
      const width=1+Math.max(...offsets.map(offset=>offset[1]))-minColumn,height=1+Math.max(...offsets.map(offset=>offset[0]))-minRow;
      const unit=Math.min(10,36/Math.max(width,height));
      const d=shapeOutline(piece.kind,piece.orientation,unit,unit*.08,(40-width*unit)/2-minColumn*unit,(40-height*unit)/2-minRow*unit);
      const label=['Now','Next'][index];
      return `<div class="piece-slot${index===0?' is-current':''}" data-piece-kind="${piece.kind}" data-piece-orientation="${piece.orientation}"><div class="piece-preview"><svg viewBox="0 0 40 40" role="img" aria-label="${label}: ${shapeDescription(piece.kind,piece.orientation)}"><path d="${d}" fill="#99dcee" fill-opacity="${index===0?'.95':'.62'}"/></svg></div><span>${label}</span></div>`;
    }).join('')}</div></div>`;
  }

  function updateSummary() {
    if(!state||preparing)return;
    if(help)help.textContent='Cover as many squares as you can.';
    if(queues)queues.toggleAttribute('hidden',state.finished);
    if(results)results.toggleAttribute('hidden',!state.finished);
    if(score) {
      score.toggleAttribute('hidden',!state.finished);
      if(state.finished) {
        if(solution?.exact) {
          const percentage=solution.optimalTiles ? state.coveredTiles/solution.optimalTiles*100 : 100;
          score.innerHTML=`<strong>${percentage.toFixed(1).replace(/\.0$/,'')}%</strong><span>${state.coveredTiles} / ${solution.optimalTiles} squares</span>`;
        } else score.textContent=solverError?'Optimal solution unavailable.':'Finding optimal solution…';
      }
    }
    viewButtons.forEach(button=>{
      const selected=button.dataset.gameView===currentView;
      button.setAttribute('aria-pressed',String(selected));
      button.disabled=!state.finished||(button.dataset.gameView==='optimal'&&!solution?.exact);
    });
    status.textContent=currentView==='optimal'&&solution?.exact?`Optimal: ${solution.optimalTiles} squares`:`${state.coveredTiles} squares covered`;
  }

  function render() {
    if(!state||preparing)return;
    const placements=currentView==='optimal'&&solution?.exact?solution.placements:state.placements;
    const occupied=new Map();
    placements.forEach((piece,index)=>piece.cells.forEach(cell=>occupied.set(cell,index+1)));
    const blocked=new Set(state.blocked);
    let markup='<defs><linearGradient id="dm-piece" x2="1" y2="1"><stop stop-color="#aadfea"/><stop offset="1" stop-color="#4a8eac"/></linearGradient></defs>';
    for(let anchor=0;anchor<state.size*state.size;anchor++) {
      const {x,y}=cellPosition(anchor),legal=currentView==='player'&&resolvePackingAnchor(state,anchor)!==-1;
      const unavailable=blocked.has(anchor)?'blocked':occupied.has(anchor)?(currentView==='optimal'?`covered by piece ${occupied.get(anchor)}`:'covered'):state.finished?'empty':`place ${shapeDescription(state.currentPiece.kind,state.currentPiece.orientation)} covering this square`;
      markup+=`<g data-domino-cell="${anchor}" role="button" tabindex="${legal?0:-1}" aria-disabled="${!legal}" aria-label="Row ${Math.floor(anchor/state.size)+1}, column ${anchor%state.size+1}: ${unavailable}"><rect pointer-events="none" x="${x}" y="${y}" width="30" height="30" rx="4" fill="${blocked.has(anchor)?'#14202a':'#142837'}" fill-opacity="${blocked.has(anchor)?'.4':'.68'}" stroke="${blocked.has(anchor)?'#24313c':'#416073'}" stroke-width=".7"/>`;
      if(blocked.has(anchor))markup+=`<path pointer-events="none" d="M${x+12} ${y+12}l6 6m0-6l-6 6" stroke="#50606e" stroke-width=".8"/>`;
      else if(!occupied.has(anchor))markup+=`<circle pointer-events="none" cx="${x+15}" cy="${y+15}" r=".8" fill="#6d8b9c" opacity=".55"/>`;
      markup+=`<rect class="packing-cell-hit" x="${x-1}" y="${y-1}" width="32" height="32" fill="transparent" stroke-width="0" pointer-events="all"/></g>`;
    }
    markup+='<g pointer-events="none">'+placements.map(piece=>pieceDrawing(piece)).join('')+'</g><g data-domino-preview pointer-events="none"></g>';
    if(currentView==='optimal')markup+='<g data-solution-order pointer-events="none" aria-hidden="true">'+placements.map((piece,index)=>{const {x,y}=cellPosition(piece.anchor);return `<text x="${x+15}" y="${y+18}" text-anchor="middle" fill="#102430" font-family="var(--mono,monospace)" font-size="9" font-weight="600">${index+1}</text>`;}).join('')+'</g>';
    grid.innerHTML=markup;
    widget.dataset.gameView=currentView;
    renderQueue();updateSummary();refreshPointerPreview();
  }

  function placePiece(hoveredCell,keyboard) {
    if(!state||preparing||currentView!=='player')return;
    const anchor=resolvePackingAnchor(state,hoveredCell);
    if(anchor===-1)return;
    const next=placePackingPiece(state,anchor);
    if(next===state)return;
    state=next;render();
    if(keyboard) {
      const target=state.finished?(viewButtons.find(button=>button.dataset.gameView==='player')||newGame||reset):board.querySelector(`[data-domino-cell="${state.legalMoves[0]}"]`);
      target.focus({preventScroll:true});
    }
  }
  function previewPiece(hoveredCell) {
    const preview=grid.querySelector('[data-domino-preview]');
    const anchor=!preparing&&currentView==='player'?resolvePackingAnchor(state,hoveredCell):-1;
    if(preview)preview.innerHTML=anchor!==-1?pieceDrawing({anchor,...state.currentPiece},true):'';
  }

  function pointerAnchor(event) {
    if(!state||preparing)return -1;
    if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return -1;
    const matrix=board.getScreenCTM();
    if(!matrix)return -1;
    const point=board.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    const local=point.matrixTransform(matrix.inverse());
    return packingAnchorAtPoint(state.size,local.x,local.y);
  }
  function refreshPointerPreview() {
    if(lastPointer)previewPiece(pointerAnchor(lastPointer));
  }
  function trackPointer(event) {
    if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
    lastPointer={clientX:event.clientX,clientY:event.clientY};
    refreshPointerPreview();
  }

  function showPreparation(message='Preparing board…',busy=true) {
    grid.innerHTML='';
    if(queues){queues.innerHTML='';queues.toggleAttribute('hidden',true);}
    if(score){score.textContent='';score.toggleAttribute('hidden',true);}
    if(results)results.toggleAttribute('hidden',true);
    viewButtons.forEach(button=>{button.disabled=true;button.setAttribute('aria-pressed',String(button.dataset.gameView==='player'));});
    reset.disabled=true;
    board.setAttribute('aria-busy',String(busy));
    widget.dataset.preparing=String(busy);
    widget.dataset.gameView='player';
    status.textContent=message;
    if(help)help.textContent='Cover as many squares as you can.';
  }

  function preparePuzzle(seed,size) {
    if(worker)worker.terminate();
    worker=null;position=null;state=null;solution=null;solverError=false;preparing=true;currentView='player';lastPointer=null;
    const extent=size*32+16;
    board.setAttribute('viewBox',`${(400-size*32)/2-8} 0 ${extent} ${extent}`);
    widget.dataset.size=String(size);
    const token=++gameToken;
    showPreparation();
    function fail() {
      if(token!==gameToken)return;
      solverError=true;preparing=false;
      if(worker)worker.terminate();worker=null;
      showPreparation('Could not prepare a puzzle. Try New game.',false);
    }
    try {
      const activeWorker=new Worker(workerURL);
      worker=activeWorker;
      activeWorker.onmessage=event=>{
        const data=event.data;
        if(!data||token!==gameToken||data.id!==token)return;
        if(data.type==='generated'&&data.solution?.exact===true&&Number.isFinite(data.solution.optimalTiles)
          &&Array.isArray(data.solution.placements)&&data.position?.seed===seed&&data.position.size===size
          &&Array.isArray(data.position.sequence)&&Array.isArray(data.position.blocked)) {
          position=data.position;
          solution={optimalTiles:data.solution.optimalTiles,placements:data.solution.placements,exact:true};
          state=packingState(position);preparing=false;solverError=false;currentView='player';
          reset.disabled=false;board.setAttribute('aria-busy','false');widget.dataset.preparing='false';
          render();
          activeWorker.terminate();if(worker===activeWorker)worker=null;
        } else if(data.type==='error')fail();
      };
      activeWorker.onerror=fail;
      activeWorker.postMessage({id:token,type:'generate',seed,size});
    } catch(error) {fail();}
  }

  widget.dataset.gameReady='true';
  const cellFrom=event=>event.target?.closest?.('[data-domino-cell]');
  board.addEventListener('click',event=>{
    const cell=cellFrom(event);
    // Assistive-technology clicks have no pointer coordinates; use the focused cell.
    if(event.detail===0||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY)) {
      if(cell)placePiece(Number(cell.dataset.dominoCell),event.detail===0);
      return;
    }
    trackPointer(event);
    placePiece(pointerAnchor(event),false);
  });
  board.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' '&&event.key!=='Spacebar')return;
    const cell=cellFrom(event);if(!cell)return;event.preventDefault();
    if(!event.repeat)placePiece(Number(cell.dataset.dominoCell),true);
  });
  ['pointerover','pointermove'].forEach(type=>board.addEventListener(type,trackPointer));
  board.addEventListener('pointerleave',()=>{lastPointer=null;previewPiece(-1);});
  board.addEventListener('focusin',event=>{const cell=cellFrom(event);previewPiece(cell?Number(cell.dataset.dominoCell):-1);});
  board.addEventListener('focusout',()=>{previewPiece(-1);refreshPointerPreview();});

  function updateSizeChoice() {
    sizeButtons.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.gameSize)===selectedSize)));
    widget.dataset.selectedSize=String(selectedSize);
  }
  function showSetup(focusChoice=false) {
    if(worker)worker.terminate();worker=null;gameToken++;
    position=null;state=null;solution=null;preparing=false;currentView='player';lastPointer=null;
    showPreparation('',false);
    if(setup)setup.toggleAttribute('hidden',false);
    if(play)play.toggleAttribute('hidden',true);
    updateSizeChoice();
    if(focusChoice)sizeButtons.find(button=>Number(button.dataset.gameSize)===selectedSize)?.focus({preventScroll:true});
  }
  function startSelectedGame() {
    if(setup)setup.toggleAttribute('hidden',true);
    if(play)play.toggleAttribute('hidden',false);
    const seed=typeof crypto!=='undefined'&&typeof crypto.getRandomValues==='function'?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296);
    widget.dataset.seed=String(seed);preparePuzzle(seed,selectedSize);
    const reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    widget.scrollIntoView?.({block:'start',behavior:reducedMotion?'auto':'smooth'});
  }
  sizeButtons.forEach(button=>button.addEventListener('click',()=>{
    const size=Number(button.dataset.gameSize);
    if([7,9,11,13].includes(size)){selectedSize=size;updateSizeChoice();}
  }));
  if(start)start.addEventListener('click',startSelectedGame);
  reset.addEventListener('click',()=>{
    if(!position||preparing)return;
    state=packingState(position);currentView='player';lastPointer=null;render();
  });
  if(newGame)newGame.addEventListener('click',()=>showSetup(true));
  viewButtons.forEach(button=>button.addEventListener('click',()=>{
    if(!state||preparing||!state.finished||(button.dataset.gameView==='optimal'&&!solution?.exact))return;
    currentView=button.dataset.gameView==='optimal'?'optimal':'player';lastPointer=null;render();
  }));
  showSetup();
}

document.querySelectorAll('[data-domineering]').forEach(initializeDomineering);
