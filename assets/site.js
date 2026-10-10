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
  const target = 2 * (1 + Math.floor(rng() * 3));
  const seen = new Set();
  const orbits = [];
  // Transpose and half-turn symmetry treat the two starting orientations alike.
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const orbit = [...new Set([
        row * size + column, column * size + row,
        (size - 1 - row) * size + (size - 1 - column),
        (size - 1 - column) * size + (size - 1 - row)
      ])].sort((a, b) => a - b);
      const key = orbit.join(',');
      if (orbit.length > 1 && !seen.has(key)) { seen.add(key); orbits.push(orbit); }
    }
  }
  const blocked = [];
  while (blocked.length < target) {
    const candidates = orbits.filter(orbit => orbit.length <= target - blocked.length && !orbit.some(cell => blocked.includes(cell)));
    if (!candidates.length) break;
    blocked.push(...candidates[Math.floor(rng() * candidates.length)]);
  }
  return { size, blocked: blocked.sort((a, b) => a - b) };
}

function initializeDomineering(widget) {
  if (widget.dataset.gameReady === 'true') return;
  const status = widget.querySelector('[data-game-status]');
  const reset = widget.querySelector('[data-game-reset]');
  const newGame = widget.querySelector('[data-game-new]');
  const help = widget.querySelector('[data-game-help]');
  const board = widget.querySelector('[data-domineering-board]');
  if (!board || !status || !reset) return;

  let position;
  let state;
  const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  grid.setAttribute('data-domineering-grid', '');
  board.appendChild(grid);
  const playerName = player => player === 'blue' ? 'Blue' : 'Red';
  const cellPosition = anchor => ({
    x: (400 - state.size * 32 + 2) / 2 + (anchor % state.size) * 32,
    y: 6 + Math.floor(anchor / state.size) * 32
  });

  function dominoRectangle(anchor, player, preview = false) {
    const { x, y } = cellPosition(anchor);
    const width = player === 'blue' ? 30 : 62;
    const height = player === 'blue' ? 62 : 30;
    const color = player === 'blue' ? '#99dcee' : '#e9a39b';
    return `<rect x="${x + 1.5}" y="${y + 1.5}" width="${width - 3}" height="${height - 3}" rx="5" fill="${preview ? color : `url(#dm-${player})`}" fill-opacity="${preview ? '.17' : '.88'}" stroke="${color}" stroke-width="${preview ? '1.8' : '.8'}"/>`;
  }

  function render() {
    const occupied = new Map();
    state.dominoes.forEach(domino => domino.cells.forEach(cell => occupied.set(cell, domino.player)));
    const blocked = new Set(state.blocked);
    const orientation = state.player === 'blue' ? 'vertical' : 'horizontal';
    let markup = '<defs><linearGradient id="dm-blue" x2="1" y2="1"><stop stop-color="#aadfea"/><stop offset="1" stop-color="#4a8eac"/></linearGradient><linearGradient id="dm-red" x2="1" y2="1"><stop stop-color="#eeb5ab"/><stop offset="1" stop-color="#a76576"/></linearGradient></defs>';
    for (let anchor = 0; anchor < state.size * state.size; anchor++) {
      const { x, y } = cellPosition(anchor);
      const legal = !state.winner && state.legalMoves.includes(anchor);
      const unavailable = blocked.has(anchor) ? 'blocked' : occupied.has(anchor) ? `occupied by ${playerName(occupied.get(anchor))}` : `place a ${orientation} domino`;
      markup += `<g data-domino-cell="${anchor}" role="button" tabindex="${legal ? 0 : -1}" aria-disabled="${!legal}" aria-label="Row ${Math.floor(anchor / state.size) + 1}, column ${anchor % state.size + 1}: ${unavailable}"><rect x="${x}" y="${y}" width="30" height="30" rx="4" fill="${blocked.has(anchor) ? '#14202a' : '#142837'}" fill-opacity="${blocked.has(anchor) ? '.4' : '.68'}" stroke="${blocked.has(anchor) ? '#24313c' : '#416073'}" stroke-width=".7"/>`;
      if (blocked.has(anchor)) markup += `<path d="M${x+12} ${y+12}l6 6m0-6l-6 6" stroke="#50606e" stroke-width=".8"/>`;
      else if (!occupied.has(anchor)) markup += `<circle cx="${x+15}" cy="${y+15}" r=".8" fill="#6d8b9c" opacity=".55"/>`;
      markup += '</g>';
    }
    markup += '<g pointer-events="none">' + state.dominoes.map(domino => dominoRectangle(domino.anchor, domino.player)).join('') + '</g><g data-domino-preview pointer-events="none"></g>';
    grid.innerHTML = markup;
    status.textContent = state.winner ? `${playerName(state.winner)} wins` : `${playerName(state.player)} · ${orientation}`;
    if (help) help.textContent = state.winner ? 'No legal placement remains. New game to play again.'
      : `Place a ${orientation} domino. Last player to move wins.`;
  }

  function placeDomino(anchor, keyboard) {
    const next = placeDomineeringDomino(state, anchor);
    if (next === state) return;
    state = next;
    render();
    if (keyboard) {
      const target = state.winner ? reset : board.querySelector(`[data-domino-cell="${state.legalMoves[0]}"]`);
      target.focus({ preventScroll: true });
    }
  }

  function previewDomino(anchor) {
    const preview = grid.querySelector('[data-domino-preview]');
    if (preview) preview.innerHTML = !state.winner && state.legalMoves.includes(anchor) ? dominoRectangle(anchor, state.player, true) : '';
  }

  widget.dataset.gameReady = 'true';
  const cellFrom = event => event.target.closest('[data-domino-cell]');
  board.addEventListener('click', event => {
    const cell = cellFrom(event);
    if (cell) placeDomino(Number(cell.dataset.dominoCell), false);
  });
  board.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    const cell = cellFrom(event);
    if (!cell) return;
    event.preventDefault();
    if (!event.repeat) placeDomino(Number(cell.dataset.dominoCell), true);
  });
  ['pointerover', 'focusin'].forEach(type => board.addEventListener(type, event => {
    const cell = cellFrom(event);
    previewDomino(cell ? Number(cell.dataset.dominoCell) : -1);
  }));
  ['pointerleave', 'focusout'].forEach(type => board.addEventListener(type, () => previewDomino(-1)));

  function startNewGame() {
    let seed;
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') seed = crypto.getRandomValues(new Uint32Array(1))[0];
    else seed = Math.floor(Math.random() * 4294967296);
    widget.dataset.seed = String(seed);
    position = generateDomineeringPosition(makeGameRandom(seed));
    state = domineeringState(position.size, position.blocked);
    render();
  }
  reset.addEventListener('click', () => {
    state = domineeringState(position.size, position.blocked);
    render();
  });
  if (newGame) newGame.addEventListener('click', startNewGame);
  startNewGame();
}

document.querySelectorAll('[data-domineering]').forEach(initializeDomineering);
