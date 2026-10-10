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

// Pure game rules, kept separate from the SVG controls.
function hackenbushState(edges, grounds, removedIds = [], player = 'blue') {
  const removed = new Set(removedIds);
  const adjacency = new Map();
  edges.forEach(edge => {
    if (removed.has(edge.id)) return;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.from).push(edge.to);
    adjacency.get(edge.to).push(edge.from);
  });

  const connectedNodes = new Set(grounds);
  const queue = [...grounds];
  for (let index = 0; index < queue.length; index++) {
    (adjacency.get(queue[index]) || []).forEach(node => {
      if (!connectedNodes.has(node)) {
        connectedNodes.add(node);
        queue.push(node);
      }
    });
  }
  edges.forEach(edge => {
    if (!connectedNodes.has(edge.from) || !connectedNodes.has(edge.to)) {
      removed.add(edge.id);
    }
  });

  const legalEdges = edges
    .filter(edge => !removed.has(edge.id) && edge.player === player)
    .map(edge => edge.id);
  const winner = legalEdges.length ? null : (player === 'blue' ? 'red' : 'blue');
  return { edges, grounds, removed, connectedNodes, player, legalEdges, winner };
}

function cutHackenbushEdge(state, edgeId) {
  if (state.winner || !state.legalEdges.includes(edgeId)) return state;
  return hackenbushState(
    state.edges,
    state.grounds,
    [...state.removed, edgeId],
    state.player === 'blue' ? 'red' : 'blue'
  );
}

// Generate a fresh position from the illustration without changing its graph vocabulary.
function generateHackenbushPosition(template, rng = Math.random) {
  const grounds = [...template.grounds];
  const grounded = new Set(grounds);
  const initialRemovedIds = [];
  const removed = new Set();
  const pruneCount = Math.floor(rng() * 7);

  // Prune only ungrounded tips, keeping the whole surviving position connected to ground.
  for (let count = 0; count < pruneCount; count++) {
    const degree = new Map();
    template.edges.forEach(edge => {
      if (removed.has(edge.id)) return;
      degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
    });
    const tips = template.edges.filter(edge =>
      !removed.has(edge.id) && !grounded.has(edge.from) && !grounded.has(edge.to) &&
      (degree.get(edge.from) === 1 || degree.get(edge.to) === 1)
    );
    if (!tips.length || template.edges.length - removed.size <= 24) break;
    const edge = tips[Math.floor(rng() * tips.length)];
    removed.add(edge.id);
    initialRemovedIds.push(edge.id);
  }

  const scaleX = .93 + rng() * .1;
  const scaleY = .9 + rng() * .13;
  const shear = (rng() - .5) * .11;
  const sway = (rng() - .5) * 7;
  const mirrored = rng() < .5;
  const round = value => Math.round(value * 100) / 100;
  function transform(x, y) {
    const height = 194 - y;
    let nextX = 200 + (x - 200) * scaleX + height * shear +
      sway * Math.sin(Math.PI * height / 194);
    if (mirrored) nextX = 400 - nextX;
    return { x: round(nextX), y: round(194 - height * scaleY) };
  }
  function transformPath(d) {
    let index = 0;
    const coordinates = d.match(/[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi) || [];
    const transformed = [];
    for (let i = 0; i < coordinates.length; i += 2) {
      const point = transform(Number(coordinates[i]), Number(coordinates[i + 1]));
      transformed.push(point.x, point.y);
    }
    return d.replace(/[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi, () => String(transformed[index++]));
  }

  const edges = template.edges.map(edge => ({
    ...edge,
    player: rng() < .5 ? 'blue' : 'red',
    d: transformPath(edge.d)
  }));
  // Both players retain an independently grounded branch, preventing a one-cut opening win.
  const bases = edges.filter(edge => grounded.has(edge.from) || grounded.has(edge.to));
  if (bases.length >= 2) bases[1].player = bases[0].player === 'blue' ? 'red' : 'blue';
  const nodes = template.nodes.map(node => ({ ...node, ...transform(node.x, node.y) }));
  return { edges, nodes, grounds, initialRemovedIds };
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
  const size = 6;
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
      if (!seen.has(key)) { seen.add(key); orbits.push(orbit); }
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

function initializeHackenbush(widget) {
  if (widget.dataset.gameReady === 'true') return;
  const elements = [...widget.querySelectorAll('g[data-edge]')];
  const nodes = [...widget.querySelectorAll('[data-node]')];
  const status = widget.querySelector('[data-game-status]');
  const reset = widget.querySelector('[data-game-reset]');
  const newGame = widget.querySelector('[data-game-new]');
  const help = widget.querySelector('[data-game-help]');
  const hackenbushBoard = widget.querySelector('[data-hackenbush-board]');
  const domineeringBoard = widget.querySelector('[data-domineering-board]');
  const choices = [...widget.querySelectorAll('[data-game-choice]')];
  if (!elements.length || !status || !reset) return;

  const template = {
    edges: elements.map((element, index) => ({
      id: element.dataset.edge || String(index), from: element.dataset.from, to: element.dataset.to,
      player: element.dataset.player, d: element.querySelector('.hb-edge-core').getAttribute('d')
    })),
    nodes: [...new Map(nodes.map(node => [node.dataset.node, {
      id: node.dataset.node, x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy'))
    }])).values()],
    grounds: (widget.dataset.ground || '0').trim().split(/\s+/)
  };
  let activeGame = 'hackenbush';
  let position;
  let edges;
  let state;
  let dominoGrid;
  const playerName = player => player === 'blue' ? 'Blue' : 'Red';
  const cellPosition = anchor => ({ x: 105 + (anchor % 6) * 32, y: 8 + Math.floor(anchor / 6) * 32 });

  function dominoRectangle(anchor, player, preview = false) {
    const { x, y } = cellPosition(anchor);
    const width = player === 'blue' ? 30 : 62;
    const height = player === 'blue' ? 62 : 30;
    const color = player === 'blue' ? '#99dcee' : '#e9a39b';
    return `<rect x="${x + 1.5}" y="${y + 1.5}" width="${width - 3}" height="${height - 3}" rx="5" fill="${preview ? color : `url(#dm-${player})`}" fill-opacity="${preview ? '.17' : '.88'}" stroke="${color}" stroke-width="${preview ? '1.8' : '.8'}"/>`;
  }

  function renderDomineering() {
    if (!domineeringBoard) return;
    if (!dominoGrid) {
      dominoGrid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      dominoGrid.setAttribute('data-domineering-grid', '');
      domineeringBoard.appendChild(dominoGrid);
    }
    const occupied = new Map();
    state.dominoes.forEach(domino => domino.cells.forEach(cell => occupied.set(cell, domino.player)));
    const blocked = new Set(state.blocked);
    const orientation = state.player === 'blue' ? 'vertical' : 'horizontal';
    let markup = '<defs><linearGradient id="dm-blue" x2="1" y2="1"><stop stop-color="#aadfea"/><stop offset="1" stop-color="#4a8eac"/></linearGradient><linearGradient id="dm-red" x2="1" y2="1"><stop stop-color="#eeb5ab"/><stop offset="1" stop-color="#a76576"/></linearGradient></defs>';
    for (let anchor = 0; anchor < 36; anchor++) {
      const { x, y } = cellPosition(anchor);
      const legal = !state.winner && state.legalMoves.includes(anchor);
      const unavailable = blocked.has(anchor) ? 'blocked' : occupied.has(anchor) ? `occupied by ${playerName(occupied.get(anchor))}` : `place a ${orientation} domino`;
      markup += `<g data-domino-cell="${anchor}" role="button" tabindex="${legal ? 0 : -1}" aria-disabled="${!legal}" aria-label="Row ${Math.floor(anchor / 6) + 1}, column ${anchor % 6 + 1}: ${unavailable}"><rect x="${x}" y="${y}" width="30" height="30" rx="4" fill="${blocked.has(anchor) ? '#14202a' : '#142837'}" fill-opacity="${blocked.has(anchor) ? '.4' : '.68'}" stroke="${blocked.has(anchor) ? '#24313c' : '#416073'}" stroke-width=".7"/>`;
      if (blocked.has(anchor)) markup += `<path d="M${x+12} ${y+12}l6 6m0-6l-6 6" stroke="#50606e" stroke-width=".8"/>`;
      else if (!occupied.has(anchor)) markup += `<circle cx="${x+15}" cy="${y+15}" r=".8" fill="#6d8b9c" opacity=".55"/>`;
      markup += '</g>';
    }
    markup += '<g pointer-events="none">' + state.dominoes.map(domino => dominoRectangle(domino.anchor, domino.player)).join('') + '</g><g data-domino-preview pointer-events="none"></g>';
    markup += '<text x="200" y="217" text-anchor="middle" fill="#a1bbc9" font-family="var(--mono,monospace)" font-size="7.5" letter-spacing="2.7">DOMINEERING</text>';
    dominoGrid.innerHTML = markup;
  }

  function render() {
    if (hackenbushBoard) hackenbushBoard.toggleAttribute('hidden', activeGame !== 'hackenbush');
    if (domineeringBoard) domineeringBoard.toggleAttribute('hidden', activeGame !== 'domineering');
    widget.dataset.activeGame = activeGame;
    choices.forEach(choice => {
      const selected = choice.dataset.gameChoice === activeGame;
      choice.setAttribute('aria-selected', String(selected));
      choice.setAttribute('tabindex', selected ? '0' : '-1');
    });
    if (activeGame === 'hackenbush') {
      elements.forEach((element, index) => {
        const edge = edges[index];
        const isCut = state.removed.has(edge.id);
        const isPlayable = !state.winner && state.legalEdges.includes(edge.id);
        element.classList.toggle('is-cut', isCut);
        element.setAttribute('aria-hidden', String(isCut));
        element.setAttribute('aria-disabled', String(!isPlayable));
        element.setAttribute('tabindex', isPlayable ? '0' : '-1');
      });
      nodes.forEach(node => {
        const isCut = !state.connectedNodes.has(node.dataset.node);
        node.classList.toggle('is-cut', isCut);
        node.setAttribute('aria-hidden', String(isCut));
      });
    } else renderDomineering();
    status.textContent = state.winner ? `${playerName(state.winner)} wins` : activeGame === 'domineering'
      ? `${playerName(state.player)} · ${state.player === 'blue' ? 'vertical' : 'horizontal'}`
      : `${playerName(state.player)} to move`;
    if (help) help.textContent = activeGame === 'hackenbush'
      ? 'Cut your color. Disconnected branches fall.'
      : state.winner ? 'No legal placement remains. New game to play again.'
      : `Place a ${state.player === 'blue' ? 'vertical' : 'horizontal'} domino. Last player to move wins.`;
  }

  function cut(edgeId, keyboard) {
    if (activeGame !== 'hackenbush') return;
    const next = cutHackenbushEdge(state, edgeId);
    if (next === state) return;
    state = next;
    render();
    if (keyboard) {
      const nextIndex = edges.findIndex(edge => state.legalEdges.includes(edge.id));
      (nextIndex === -1 ? reset : elements[nextIndex]).focus({ preventScroll: true });
    }
  }

  function placeDomino(anchor, keyboard) {
    if (activeGame !== 'domineering') return;
    const next = placeDomineeringDomino(state, anchor);
    if (next === state) return;
    state = next;
    render();
    if (keyboard) {
      const target = state.winner ? reset : domineeringBoard.querySelector(`[data-domino-cell="${state.legalMoves[0]}"]`);
      target.focus({ preventScroll: true });
    }
  }

  function previewDomino(anchor) {
    if (!dominoGrid || activeGame !== 'domineering') return;
    const preview = dominoGrid.querySelector('[data-domino-preview]');
    if (preview) preview.innerHTML = !state.winner && state.legalMoves.includes(anchor) ? dominoRectangle(anchor, state.player, true) : '';
  }

  widget.dataset.gameReady = 'true';
  elements.forEach((element, index) => {
    element.addEventListener('click', () => cut(edges[index].id, false));
    element.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      event.preventDefault();
      if (!event.repeat) cut(edges[index].id, true);
    });
  });
  if (domineeringBoard) {
    const cellFrom = event => event.target.closest('[data-domino-cell]');
    domineeringBoard.addEventListener('click', event => {
      const cell = cellFrom(event);
      if (cell) placeDomino(Number(cell.dataset.dominoCell), false);
    });
    domineeringBoard.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      const cell = cellFrom(event);
      if (!cell) return;
      event.preventDefault();
      if (!event.repeat) placeDomino(Number(cell.dataset.dominoCell), true);
    });
    ['pointerover', 'focusin'].forEach(type => domineeringBoard.addEventListener(type, event => {
      const cell = cellFrom(event);
      previewDomino(cell ? Number(cell.dataset.dominoCell) : -1);
    }));
    ['pointerleave', 'focusout'].forEach(type => domineeringBoard.addEventListener(type, () => previewDomino(-1)));
  }

  function startNewGame(game = activeGame) {
    activeGame = game === 'domineering' && domineeringBoard ? 'domineering' : 'hackenbush';
    let seed;
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') seed = crypto.getRandomValues(new Uint32Array(1))[0];
    else seed = Math.floor(Math.random() * 4294967296);
    widget.dataset.seed = String(seed);
    const rng = makeGameRandom(seed);
    if (activeGame === 'domineering') {
      position = generateDomineeringPosition(rng);
      state = domineeringState(position.size, position.blocked);
    } else {
      position = generateHackenbushPosition(template, rng);
      edges = position.edges;
      elements.forEach((element, index) => {
        const edge = edges[index];
        element.dataset.player = edge.player;
        element.setAttribute('aria-label', `Cut ${edge.player} branch ${index + 1}`);
        element.querySelectorAll('path').forEach(path => {
          path.setAttribute('d', edge.d);
          if (!path.classList.contains('hb-hit')) path.setAttribute('stroke', `url(#hb-${edge.player})`);
        });
      });
      const coordinates = new Map(position.nodes.map(node => [node.id, node]));
      nodes.forEach(node => {
        const point = coordinates.get(node.dataset.node);
        node.setAttribute('cx', String(point.x));
        node.setAttribute('cy', String(point.y));
      });
      state = hackenbushState(edges, position.grounds, position.initialRemovedIds);
    }
    render();
  }
  reset.addEventListener('click', () => {
    state = activeGame === 'domineering' ? domineeringState(position.size, position.blocked)
      : hackenbushState(edges, position.grounds, position.initialRemovedIds);
    render();
  });
  if (newGame) newGame.addEventListener('click', () => startNewGame());
  choices.forEach((choice, index) => {
    choice.addEventListener('click', () => startNewGame(choice.dataset.gameChoice));
    choice.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = choices[(index + 1) % choices.length];
      else if (event.key === 'ArrowLeft') target = choices[(index + choices.length - 1) % choices.length];
      else if (event.key === 'Home') target = choices[0];
      else if (event.key === 'End') target = choices[choices.length - 1];
      if (target) { event.preventDefault(); startNewGame(target.dataset.gameChoice); target.focus(); }
    });
  });
  startNewGame();
}

document.querySelectorAll('[data-hackenbush]').forEach(initializeHackenbush);
