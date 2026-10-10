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

function initializeHackenbush(widget) {
  if (widget.dataset.gameReady === 'true') return;
  const elements = [...widget.querySelectorAll('g[data-edge]')];
  const nodes = [...widget.querySelectorAll('[data-node]')];
  const status = widget.querySelector('[data-game-status]');
  const reset = widget.querySelector('[data-game-reset]');
  if (!elements.length || !status || !reset) return;

  const edges = elements.map((element, index) => ({
    id: element.dataset.edge || String(index),
    from: element.dataset.from,
    to: element.dataset.to,
    player: element.dataset.player
  }));
  const grounds = (widget.dataset.ground || '0').trim().split(/\s+/);
  let state = hackenbushState(edges, grounds);
  const playerName = player => player === 'blue' ? 'Blue' : 'Red';

  function render() {
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
    status.textContent = state.winner
      ? `${playerName(state.winner)} wins`
      : `${playerName(state.player)} to move`;
  }

  function cut(edgeId, keyboard) {
    const next = cutHackenbushEdge(state, edgeId);
    if (next === state) return;
    state = next;
    render();
    if (keyboard) {
      const nextIndex = edges.findIndex(edge => state.legalEdges.includes(edge.id));
      (nextIndex === -1 ? reset : elements[nextIndex]).focus({ preventScroll: true });
    }
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
  reset.addEventListener('click', () => {
    state = hackenbushState(edges, grounds);
    render();
  });
  render();
}

document.querySelectorAll('[data-hackenbush]').forEach(initializeHackenbush);
