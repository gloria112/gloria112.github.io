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

function domineeringState(size, blocked, dominoes = [], player = 'blue') {
  const occupied = new Set(blocked);
  dominoes.forEach(domino => domino.cells.forEach(cell => occupied.add(cell)));
  const legalMoves = [];
  for (let anchor = 0; anchor < size * size; anchor++) {
    const row = Math.floor(anchor / size);
    const column = anchor % size;
    if ((player === 'blue' && row === size - 1) || (player === 'red' && column === size - 1)) continue;
    const next = anchor + (player === 'blue' ? size : 1);
    if (!occupied.has(anchor) && !occupied.has(next)) legalMoves.push(anchor);
  }
  return {
    size, blocked: [...blocked], dominoes: [...dominoes], player, legalMoves,
    winner: legalMoves.length ? null : (player === 'blue' ? 'red' : 'blue')
  };
}

function placeDomineeringDomino(state, anchor) {
  if (state.winner || !state.legalMoves.includes(anchor)) return state;
  const domino = {
    anchor, player: state.player,
    cells: [anchor, anchor + (state.player === 'blue' ? state.size : 1)]
  };
  return domineeringState(state.size, state.blocked, [...state.dominoes, domino], state.player === 'blue' ? 'red' : 'blue');
}

function generateDomineeringPosition(rng = Math.random) {
  const size = 7;
  const count = 2 + Math.floor(rng() * 5);
  const cells = Array.from({ length: size * size }, (_, index) => index);
  // A partial Fisher–Yates shuffle samples distinct blocked squares uniformly.
  for (let index = 0; index < count; index++) {
    const selected = index + Math.floor(rng() * (cells.length - index));
    [cells[index], cells[selected]] = [cells[selected], cells[index]];
  }
  return { size, blocked: cells.slice(0, count).sort((a, b) => a - b) };
}

// All placements and previews share these fixed, player-specific shapes.
function shapeOffsets(kind, player) {
  const shapes = {
    domino: { blue: [[0,0],[1,0]], red: [[0,0],[0,1]] },
    straight: { blue: [[0,0],[1,0],[2,0]], red: [[0,0],[0,1],[0,2]] },
    corner: { blue: [[0,0],[1,0],[1,1]], red: [[0,0],[0,1],[1,0]] }
  };
  return (shapes[kind]?.[player] || []).map(offset => [...offset]);
}

function shapeCells(kind, player, anchor, size) {
  if (!Number.isInteger(anchor) || anchor < 0 || anchor >= size * size) return null;
  const offsets = shapeOffsets(kind, player);
  if (!offsets.length) return null;
  const row = Math.floor(anchor / size), column = anchor % size;
  const cells = [];
  for (const [dr, dc] of offsets) {
    if (row + dr >= size || column + dc >= size) return null;
    cells.push((row + dr) * size + column + dc);
  }
  return cells;
}

function generateShapePosition(seed) {
  const normalizedSeed = Number(seed) >>> 0;
  const position = generateDomineeringPosition(makeGameRandom(normalizedSeed));
  const kinds = ['domino', 'straight', 'corner'];
  const sequences = {};
  for (const [player, salt] of [['blue', 0x9e3779b9], ['red', 0x243f6a88]]) {
    const rng = makeGameRandom(normalizedSeed ^ salt);
    // A 7×7 board cannot use this many pieces; the entire future is fixed now.
    sequences[player] = Array.from({ length: 32 }, () => kinds[Math.floor(rng() * kinds.length)]);
  }
  return { ...position, seed: normalizedSeed, sequences };
}

function shapePlacementState(position, pieces = [], draws = { blue: 0, red: 0 }, player = 'blue') {
  const occupied = new Set(position.blocked);
  pieces.forEach(piece => piece.cells.forEach(cell => occupied.add(cell)));
  const currentPiece = position.sequences[player][draws[player]];
  const legalMoves = [];
  for (let anchor = 0; anchor < position.size * position.size; anchor++) {
    const cells = shapeCells(currentPiece, player, anchor, position.size);
    if (cells && cells.every(cell => !occupied.has(cell))) legalMoves.push(anchor);
  }
  return {
    size: position.size, blocked: [...position.blocked], seed: position.seed,
    sequences: position.sequences, pieces: [...pieces], draws: { ...draws }, player, currentPiece,
    queues: {
      blue: position.sequences.blue.slice(draws.blue, draws.blue + 3),
      red: position.sequences.red.slice(draws.red, draws.red + 3)
    },
    legalMoves, winner: legalMoves.length ? null : (player === 'blue' ? 'red' : 'blue')
  };
}

function placeShape(state, anchor) {
  if (state.winner || !state.legalMoves.includes(anchor)) return state;
  const piece = {
    anchor, player: state.player, kind: state.currentPiece,
    cells: shapeCells(state.currentPiece, state.player, anchor, state.size)
  };
  const draws = { ...state.draws, [state.player]: state.draws[state.player] + 1 };
  return shapePlacementState(state, [...state.pieces, piece], draws, state.player === 'blue' ? 'red' : 'blue');
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

function shapeDescription(kind, player) {
  const orientation = player === 'blue' ? 'vertical' : 'horizontal';
  if (kind === 'domino') return `${orientation} domino`;
  if (kind === 'straight') return `${orientation} straight triomino`;
  return player === 'blue' ? 'L triomino, two cells down and one right at the bottom'
    : 'L triomino, two cells across the top and one down at the left';
}

function initializeDomineering(widget) {
  if (widget.dataset.gameReady === 'true') return;
  const status=widget.querySelector('[data-game-status]'),reset=widget.querySelector('[data-game-reset]');
  const newGame=widget.querySelector('[data-game-new]'),help=widget.querySelector('[data-game-help]');
  const board=widget.querySelector('[data-domineering-board]'),queues=widget.querySelector('[data-piece-queues]');
  if (!board || !status || !reset) return;
  let position, state;
  const grid=document.createElementNS('http://www.w3.org/2000/svg','g');
  grid.setAttribute('data-domineering-grid','');
  board.appendChild(grid);
  const playerName=player=>player==='blue'?'Blue':'Red';
  const cellPosition=anchor=>({x:(400-state.size*32+2)/2+(anchor%state.size)*32,y:6+Math.floor(anchor/state.size)*32});
  const pieceColor=player=>player==='blue'?'#99dcee':'#e9a39b';

  function pieceDrawing(piece,preview=false) {
    const {x,y}=cellPosition(piece.anchor),color=pieceColor(piece.player);
    const d=shapeOutline(piece.kind,piece.player,32,2.5,x-1,y-1);
    return `<path data-placed-shape="${piece.kind}" d="${d}" fill="${preview?color:`url(#dm-${piece.player})`}" fill-opacity="${preview?'.17':'.88'}" stroke="${color}" stroke-width="${preview?'1.8':'.8'}" stroke-linejoin="round"/>`;
  }

  function renderQueues() {
    if (!queues) return;
    queues.innerHTML=['blue','red'].map(player=>`<div class="piece-queue${!state.winner&&state.player===player?' is-active':''}" data-player="${player}"><span class="piece-label">${playerName(player)}</span><div class="piece-slots">${state.queues[player].map((kind,index)=>{
      const offsets=shapeOffsets(kind,player),width=1+Math.max(...offsets.map(offset=>offset[1])),height=1+Math.max(...offsets.map(offset=>offset[0]));
      const d=shapeOutline(kind,player,10,.8,(40-width*10)/2,(40-height*10)/2);
      const label=['Now','Next','Then'][index];
      return `<div class="piece-slot${index===0?' is-current':''}" data-piece-kind="${kind}"><div class="piece-preview"><svg viewBox="0 0 40 40" role="img" aria-label="${playerName(player)} ${label.toLowerCase()}: ${shapeDescription(kind,player)}"><path d="${d}" fill="${pieceColor(player)}" fill-opacity="${index===0?'.95':'.62'}"/></svg></div><span>${label}</span></div>`;
    }).join('')}</div></div>`).join('');
  }

  function render() {
    const occupied=new Map();
    state.pieces.forEach(piece=>piece.cells.forEach(cell=>occupied.set(cell,piece.player)));
    const blocked=new Set(state.blocked);
    let markup='<defs><linearGradient id="dm-blue" x2="1" y2="1"><stop stop-color="#aadfea"/><stop offset="1" stop-color="#4a8eac"/></linearGradient><linearGradient id="dm-red" x2="1" y2="1"><stop stop-color="#eeb5ab"/><stop offset="1" stop-color="#a76576"/></linearGradient></defs>';
    for(let anchor=0;anchor<state.size*state.size;anchor++) {
      const {x,y}=cellPosition(anchor),legal=!state.winner&&state.legalMoves.includes(anchor);
      const unavailable=blocked.has(anchor)?'blocked':occupied.has(anchor)?`occupied by ${playerName(occupied.get(anchor))}`:`place ${shapeDescription(state.currentPiece,state.player)}`;
      markup+=`<g data-domino-cell="${anchor}" role="button" tabindex="${legal?0:-1}" aria-disabled="${!legal}" aria-label="Row ${Math.floor(anchor/state.size)+1}, column ${anchor%state.size+1}: ${unavailable}"><rect x="${x}" y="${y}" width="30" height="30" rx="4" fill="${blocked.has(anchor)?'#14202a':'#142837'}" fill-opacity="${blocked.has(anchor)?'.4':'.68'}" stroke="${blocked.has(anchor)?'#24313c':'#416073'}" stroke-width=".7"/>`;
      if(blocked.has(anchor))markup+=`<path d="M${x+12} ${y+12}l6 6m0-6l-6 6" stroke="#50606e" stroke-width=".8"/>`;
      else if(!occupied.has(anchor))markup+=`<circle cx="${x+15}" cy="${y+15}" r=".8" fill="#6d8b9c" opacity=".55"/>`;
      markup+='</g>';
    }
    markup+='<g pointer-events="none">'+state.pieces.map(piece=>pieceDrawing(piece)).join('')+'</g><g data-domino-preview pointer-events="none"></g>';
    grid.innerHTML=markup;
    renderQueues();
    status.textContent=state.winner?`${playerName(state.winner)} wins`:`${playerName(state.player)} to move`;
    if(help)help.textContent=state.winner?`${playerName(state.player)} cannot fit the required piece.`:'Place your Now piece. You can see two ahead.';
  }

  function placePiece(anchor,keyboard) {
    const next=placeShape(state,anchor);
    if(next===state)return;
    state=next;render();
    if(keyboard)(state.winner?reset:board.querySelector(`[data-domino-cell="${state.legalMoves[0]}"]`)).focus({preventScroll:true});
  }
  function previewPiece(anchor) {
    const preview=grid.querySelector('[data-domino-preview]');
    if(preview)preview.innerHTML=!state.winner&&state.legalMoves.includes(anchor)?pieceDrawing({anchor,player:state.player,kind:state.currentPiece},true):'';
  }
  widget.dataset.gameReady='true';
  const cellFrom=event=>event.target.closest('[data-domino-cell]');
  board.addEventListener('click',event=>{const cell=cellFrom(event);if(cell)placePiece(Number(cell.dataset.dominoCell),false);});
  board.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' '&&event.key!=='Spacebar')return;
    const cell=cellFrom(event);if(!cell)return;event.preventDefault();
    if(!event.repeat)placePiece(Number(cell.dataset.dominoCell),true);
  });
  ['pointerover','focusin'].forEach(type=>board.addEventListener(type,event=>{const cell=cellFrom(event);previewPiece(cell?Number(cell.dataset.dominoCell):-1);}));
  ['pointerleave','focusout'].forEach(type=>board.addEventListener(type,()=>previewPiece(-1)));
  function startNewGame() {
    const seed=typeof crypto!=='undefined'&&typeof crypto.getRandomValues==='function'?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296);
    widget.dataset.seed=String(seed);position=generateShapePosition(seed);state=shapePlacementState(position);render();
  }
  reset.addEventListener('click',()=>{state=shapePlacementState(position);render();});
  if(newGame)newGame.addEventListener('click',startNewGame);
  startNewGame();
}

document.querySelectorAll('[data-domineering]').forEach(initializeDomineering);
