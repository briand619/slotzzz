/*
 * Slot Designer — a live editor over the SlotMathEngine API.
 *
 * The tuning loop this exists for: change a weight or a multiplier, and see the
 * exact RTP, hit frequency, and volatility move immediately. Every number shown
 * comes from the API's exact enumeration, never from arithmetic done here.
 */

const DEFAULT_CONFIG = {
  name: 'New Slot',
  numReels: 3,
  numRows: 1,
  symbols: [
    { id: 'cherry', name: 'Cherry', weight: 5 },
    { id: 'bar', name: 'Bar', weight: 3 },
    { id: 'bell', name: 'Bell', weight: 2 },
    { id: 'seven', name: 'Seven', weight: 1 }
  ],
  paytable: {
    baseWager: 1,
    wagerMode: 'totalBet',
    payLines: [
      {
        id: 0,
        reelPositions: [0, 1, 2],
        rules: [
          { symbolIds: ['seven', 'seven', 'seven'], multiplier: 60 },
          { symbolIds: ['bell', 'bell', 'bell'], multiplier: 30 },
          { symbolIds: ['bar', 'bar', 'bar'], multiplier: 8 },
          { symbolIds: ['cherry', 'cherry', 'cherry'], multiplier: 4 }
        ]
      }
    ]
  }
};

const state = {
  config: structuredClone(DEFAULT_CONFIG),
  analyzeTimer: null,
  requestId: 0
};

/* ────────────────────────────  helpers  ──────────────────────────── */

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) {
    if (child != null) node.append(child);
  }
  return node;
};

const pct = (x) => `${(x * 100).toFixed(2)}%`;
const num = (x, dp = 2) => Number(x).toLocaleString(undefined, {
  minimumFractionDigits: dp, maximumFractionDigits: dp
});

function setStatus(text, statusState) {
  const node = $('#status');
  node.textContent = text;
  node.dataset.state = statusState;
}

/** Binds an input to a config field, re-analyzing (but not re-rendering) on edit. */
function bind(input, target, key, kind = 'text') {
  input.value = target[key] ?? '';
  input.addEventListener('input', () => {
    if (kind === 'number') {
      const parsed = Number(input.value);
      if (input.value === '' || Number.isNaN(parsed)) return;
      target[key] = parsed;
    } else if (kind === 'int') {
      const parsed = parseInt(input.value, 10);
      if (Number.isNaN(parsed)) return;
      target[key] = parsed;
    } else {
      target[key] = input.value;
    }
    onConfigChanged();
  });
  return input;
}

function field(labelText, input) {
  return el('label', { className: 'field' }, [el('span', { textContent: labelText }), input]);
}

function numberInput(target, key, attrs = {}) {
  const input = el('input', Object.assign({ type: 'number' }, attrs));
  return bind(input, target, key, attrs.step === '1' ? 'int' : 'number');
}

function textInput(target, key) {
  return bind(el('input', { type: 'text' }), target, key);
}

/** Comma-separated integer list <-> array, edited as free text. */
function listInput(target, key, placeholder = '0, 1, 2') {
  const input = el('input', {
    type: 'text',
    placeholder,
    value: (target[key] ?? []).join(', ')
  });
  input.addEventListener('input', () => {
    const parts = input.value.split(',').map((t) => t.trim()).filter((t) => t !== '');
    if (parts.some((p) => Number.isNaN(Number(p)))) return;
    target[key] = parts.map(Number);
    onConfigChanged();
  });
  return input;
}

/** Comma-separated symbol ids <-> array. */
function symbolListInput(target, key) {
  const input = el('input', {
    type: 'text',
    placeholder: 'seven, seven, seven',
    value: (target[key] ?? []).join(', ')
  });
  input.addEventListener('input', () => {
    target[key] = input.value.split(',').map((t) => t.trim()).filter((t) => t !== '');
    onConfigChanged();
  });
  return input;
}

function symbolSelect(target, key) {
  const select = el('select');
  for (const symbol of state.config.symbols ?? []) {
    select.append(el('option', { value: symbol.id, textContent: symbol.id }));
  }
  select.value = target[key] ?? '';
  select.addEventListener('change', () => {
    target[key] = select.value;
    onConfigChanged();
  });
  return select;
}

function deleteButton(onClick) {
  const button = el('button', { className: 'btn icon', textContent: '✕', title: 'Remove' });
  button.addEventListener('click', onClick);
  return button;
}

/* ────────────────────────────  rendering  ──────────────────────────── */

function render() {
  renderGame();
  renderSymbols();
  renderStrips();
  renderPaylines();
  renderScatters();
  renderHoldAndSpin();
  renderFreeSpins();
  renderJson();
}

function renderGame() {
  const config = state.config;
  const paytable = config.paytable;

  const wagerMode = el('select');
  wagerMode.append(
    el('option', { value: 'totalBet', textContent: 'Total bet' }),
    el('option', { value: 'betPerLine', textContent: 'Bet per line' })
  );
  wagerMode.value = paytable.wagerMode ?? 'totalBet';
  wagerMode.addEventListener('change', () => {
    paytable.wagerMode = wagerMode.value;
    onConfigChanged();
  });

  $('#game-fields').replaceChildren(
    field('Name', textInput(config, 'name')),
    field('Reels', numberInput(config, 'numReels', { min: 1, step: '1' })),
    field('Rows', numberInput(config, 'numRows', { min: 1, step: '1' })),
    field('Base wager', numberInput(paytable, 'baseWager', { min: 0, step: '0.1' })),
    field('Wager mode', wagerMode)
  );
}

function renderSymbols() {
  const body = $('#symbols-table').querySelector('tbody');
  body.replaceChildren();

  for (const symbol of state.config.symbols) {
    const wild = el('input', { type: 'checkbox', checked: !!symbol.isWild });
    wild.addEventListener('change', () => {
      symbol.isWild = wild.checked;
      onConfigChanged();
    });

    const scatter = el('input', { type: 'checkbox', checked: !!symbol.isScatter });
    scatter.addEventListener('change', () => {
      symbol.isScatter = scatter.checked;
      onConfigChanged();
    });

    body.append(el('tr', {}, [
      el('td', {}, textInput(symbol, 'id')),
      el('td', {}, textInput(symbol, 'name')),
      el('td', { className: 'num' }, numberInput(symbol, 'weight', { min: 0, step: '0.1' })),
      el('td', { className: 'mid' }, wild),
      el('td', { className: 'mid' }, scatter),
      el('td', {}, deleteButton(() => {
        state.config.symbols = state.config.symbols.filter((s) => s !== symbol);
        onConfigChanged(true);
      }))
    ]));
  }

  $('#symbol-count').textContent = `${state.config.symbols.length}`;
}

function stripToText(strip) {
  return (strip.stops ?? [])
    .map((stop) => (Number(stop.weight) === 1 ? stop.symbolId : `${stop.symbolId}:${stop.weight}`))
    .join(', ');
}

function textToStrip(text) {
  const stops = text.split(',').map((token) => token.trim()).filter(Boolean).map((token) => {
    const [id, weight] = token.split(':');
    const parsedWeight = weight === undefined ? 1 : Number(weight);
    return { symbolId: id.trim(), weight: Number.isNaN(parsedWeight) ? 1 : parsedWeight };
  });
  return { stops };
}

function renderStrips() {
  const config = state.config;
  const hasStrips = Array.isArray(config.reels) && config.reels.length > 0;

  const toggle = $('#use-strips');
  toggle.checked = hasStrips;
  toggle.onchange = () => {
    if (toggle.checked) {
      // Seed each reel from the shared catalog so the switch is lossless.
      const stops = config.symbols.map((s) => ({ symbolId: s.id, weight: s.weight ?? 1 }));
      config.reels = Array.from({ length: config.numReels }, () => ({ stops: structuredClone(stops) }));
    } else {
      delete config.reels;
    }
    onConfigChanged(true);
  };

  const container = $('#strips-editor');
  container.replaceChildren();

  if (!hasStrips) {
    $('#strips-mode').textContent = 'shared weights';
    return;
  }
  $('#strips-mode').textContent = `${config.reels.length} strips`;

  config.reels.forEach((strip, index) => {
    const input = el('input', { type: 'text', value: stripToText(strip) });
    input.addEventListener('input', () => {
      config.reels[index] = textToStrip(input.value);
      onConfigChanged();
    });
    container.append(field(`Reel ${index + 1}`, input));
  });

  const sync = el('button', {
    className: 'btn ghost small',
    textContent: `Match strip count to ${config.numReels} reels`
  });
  sync.addEventListener('click', () => {
    const template = config.reels[0] ?? { stops: [] };
    const next = [];
    for (let i = 0; i < config.numReels; i++) {
      next.push(config.reels[i] ? config.reels[i] : structuredClone(template));
    }
    config.reels = next;
    onConfigChanged(true);
  });
  container.append(el('div', { className: 'row-actions' }, sync));
}

function renderPaylines() {
  const paytable = state.config.paytable;
  paytable.payLines ??= [];
  const container = $('#paylines-editor');
  container.replaceChildren();

  paytable.payLines.forEach((line, index) => {
    const block = el('div', { className: 'block' });

    block.append(el('div', { className: 'block-head' }, [
      el('span', { className: 'block-title', textContent: `Line ${line.id ?? index}` }),
      deleteButton(() => {
        paytable.payLines.splice(index, 1);
        onConfigChanged(true);
      })
    ]));

    block.append(el('div', { className: 'grid-2' }, [
      field('Reel positions', listInput(line, 'reelPositions')),
      field('Row positions (optional)', listInput(line, 'rowPositions', 'blank = row 0'))
    ]));

    // Exact-position rules.
    line.rules ??= [];
    block.append(el('div', { className: 'sub-label', textContent: 'Exact-position rules' }));
    line.rules.forEach((rule, ruleIndex) => {
      block.append(el('div', { className: 'rule-row' }, [
        symbolListInput(rule, 'symbolIds'),
        numberInput(rule, 'multiplier', { min: 0, step: '0.1' }),
        deleteButton(() => {
          line.rules.splice(ruleIndex, 1);
          onConfigChanged(true);
        })
      ]));
    });
    const addRule = el('button', { className: 'btn ghost small', textContent: '+ Rule' });
    addRule.addEventListener('click', () => {
      line.rules.push({ symbolIds: [], multiplier: 1 });
      onConfigChanged(true);
    });

    // N-of-a-kind rules.
    line.kindRules ??= [];
    block.append(el('div', { className: 'sub-label', textContent: 'N-of-a-kind rules (symbol / count / pay)' }));
    line.kindRules.forEach((rule, ruleIndex) => {
      block.append(el('div', { className: 'rule-row kind' }, [
        symbolSelect(rule, 'symbolId'),
        numberInput(rule, 'count', { min: 1, step: '1' }),
        numberInput(rule, 'multiplier', { min: 0, step: '0.1' }),
        deleteButton(() => {
          line.kindRules.splice(ruleIndex, 1);
          onConfigChanged(true);
        })
      ]));
    });
    const addKind = el('button', { className: 'btn ghost small', textContent: '+ Kind rule' });
    addKind.addEventListener('click', () => {
      line.kindRules.push({
        symbolId: state.config.symbols[0]?.id ?? '',
        count: Math.min(3, (line.reelPositions ?? []).length || 3),
        multiplier: 1
      });
      onConfigChanged(true);
    });

    block.append(el('div', { className: 'row-actions' }, [addRule, addKind]));
    container.append(block);
  });

  $('#payline-count').textContent = `${paytable.payLines.length}`;
}

function renderScatters() {
  const paytable = state.config.paytable;
  const container = $('#scatter-editor');
  container.replaceChildren();
  const rules = paytable.scatterRules ?? [];

  for (const [index, rule] of rules.entries()) {
    container.append(el('div', { className: 'rule-row kind' }, [
      symbolSelect(rule, 'symbolId'),
      numberInput(rule, 'count', { min: 1, step: '1' }),
      numberInput(rule, 'multiplier', { min: 0, step: '0.1' }),
      deleteButton(() => {
        paytable.scatterRules.splice(index, 1);
        onConfigChanged(true);
      })
    ]));
  }

  if (rules.length === 0) {
    container.append(el('p', {
      className: 'hint',
      textContent: 'No scatter pays. Tiers pay their multiplier on the total stake for an exact count anywhere on the grid.'
    }));
  }

  $('#scatter-count').textContent = rules.length ? `${rules.length} tiers` : '';
}

function renderHoldAndSpin() {
  const config = state.config;
  const toggle = $('#use-has');
  toggle.checked = !!config.holdAndSpin;
  toggle.onchange = () => {
    if (toggle.checked) {
      config.holdAndSpin = {
        coinSymbolId: config.symbols.find((s) => s.isScatter)?.id ?? '',
        triggerCount: 3,
        respinCount: 3,
        coinProbability: 0.06,
        coinValues: [{ value: 1, weight: 10 }, { value: 2, weight: 5 }],
        grandMultiplier: 100
      };
    } else {
      delete config.holdAndSpin;
    }
    onConfigChanged(true);
  };

  const container = $('#has-editor');
  container.replaceChildren();
  const feature = config.holdAndSpin;
  $('#has-state').textContent = feature ? 'on' : '';
  if (!feature) return;

  container.append(el('div', { className: 'grid-2' }, [
    field('Coin symbol', symbolSelect(feature, 'coinSymbolId')),
    field('Trigger count', numberInput(feature, 'triggerCount', { min: 1, step: '1' })),
    field('Respins', numberInput(feature, 'respinCount', { min: 1, step: '1' })),
    field('Coin probability', numberInput(feature, 'coinProbability', { min: 0, max: 1, step: '0.01' })),
    field('Grand (× stake)', numberInput(feature, 'grandMultiplier', { min: 0, step: '1' }))
  ]));

  container.append(el('div', { className: 'sub-label', textContent: 'Coin values (value / weight / label)' }));
  feature.coinValues ??= [];
  feature.coinValues.forEach((coin, index) => {
    const label = textInput(coin, 'label');
    label.placeholder = 'label (optional)';
    container.append(el('div', { className: 'rule-row kind' }, [
      label,
      numberInput(coin, 'value', { min: 0, step: '0.5' }),
      numberInput(coin, 'weight', { min: 0, step: '0.1' }),
      deleteButton(() => {
        feature.coinValues.splice(index, 1);
        onConfigChanged(true);
      })
    ]));
  });

  const addCoin = el('button', { className: 'btn ghost small', textContent: '+ Coin value' });
  addCoin.addEventListener('click', () => {
    feature.coinValues.push({ value: 1, weight: 1 });
    onConfigChanged(true);
  });
  container.append(el('div', { className: 'row-actions' }, addCoin));
}

function renderFreeSpins() {
  const config = state.config;
  const toggle = $('#use-fs');
  toggle.checked = !!config.freeSpins;
  toggle.onchange = () => {
    if (toggle.checked) {
      config.freeSpins = {
        triggerSymbolId: config.symbols.find((s) => s.isScatter)?.id ?? '',
        triggerCount: 3,
        spinsAwarded: 8,
        winMultiplier: 2,
        allowRetrigger: true
      };
    } else {
      delete config.freeSpins;
    }
    onConfigChanged(true);
  };

  const container = $('#fs-editor');
  container.replaceChildren();
  const feature = config.freeSpins;
  $('#fs-state').textContent = feature ? 'on' : '';
  if (!feature) return;

  const retrigger = el('input', { type: 'checkbox', checked: feature.allowRetrigger !== false });
  retrigger.addEventListener('change', () => {
    feature.allowRetrigger = retrigger.checked;
    onConfigChanged();
  });

  container.append(
    el('div', { className: 'grid-2' }, [
      field('Trigger symbol', symbolSelect(feature, 'triggerSymbolId')),
      field('Trigger count', numberInput(feature, 'triggerCount', { min: 1, step: '1' })),
      field('Spins awarded', numberInput(feature, 'spinsAwarded', { min: 1, step: '1' })),
      field('Win multiplier', numberInput(feature, 'winMultiplier', { min: 0, step: '0.5' }))
    ]),
    el('label', { className: 'check' }, [retrigger, el('span', { textContent: 'Allow retriggers' })])
  );
}

function renderJson() {
  $('#json-editor').value = JSON.stringify(state.config, null, 2);
}

/* ────────────────────────────  API  ──────────────────────────── */

async function callApi(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`);
  return payload;
}

const analyzeRtp = (config) => callApi('/api/analysis/rtp', { configuration: config });
const analyzeVolatility = (config) => callApi('/api/analysis/volatility', { configuration: config });

function onConfigChanged(structural = false) {
  if (structural) render();
  else renderJson();
  scheduleAnalyze();
}

function scheduleAnalyze() {
  clearTimeout(state.analyzeTimer);
  setStatus('Computing…', 'busy');
  state.analyzeTimer = setTimeout(analyze, 250);
}

async function analyze() {
  const requestId = ++state.requestId;
  const config = structuredClone(state.config);

  try {
    const [rtp, volatility] = await Promise.all([analyzeRtp(config), analyzeVolatility(config)]);
    if (requestId !== state.requestId) return; // a newer edit superseded this one

    showError(null);
    showMetrics(rtp, volatility);
    setStatus('Exact analysis complete', 'ok');
  } catch (error) {
    if (requestId !== state.requestId) return;
    showError(error.message);
    setStatus('Invalid configuration', 'error');
  }
}

function showMetrics(rtp, volatility) {
  const band = rtp.rtp >= 0.85 && rtp.rtp <= 0.98 ? 'good'
    : (rtp.rtp >= 0.75 && rtp.rtp <= 1.0 ? 'warn' : 'bad');

  const rtpValue = $('#rtp-value');
  rtpValue.textContent = pct(rtp.rtp);
  rtpValue.dataset.band = band;

  const fill = $('#rtp-fill');
  fill.style.width = `${Math.min(100, rtp.rtp * 100)}%`;
  fill.dataset.band = band;

  $('#rtp-note').textContent = band === 'good'
    ? 'Within the typical 85–98% range'
    : (rtp.rtp > 1 ? 'Above 100% — the game loses money' : 'Outside the typical 85–98% range');

  $('#stat-hit').textContent = pct(rtp.hitFrequency);
  $('#stat-vol').textContent = num(volatility.volatilityIndex);
  $('#stat-var').textContent = num(volatility.variance);
  $('#stat-ev').textContent = num(rtp.expectedValue, 4);
}

function showError(message) {
  const box = $('#error-box');
  if (!message) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.textContent = message;
  for (const id of ['#rtp-value', '#stat-hit', '#stat-vol', '#stat-var', '#stat-ev']) {
    $(id).textContent = '—';
  }
  $('#rtp-fill').style.width = '0';
}

/* ── RTP contribution: re-analyze with features stripped ───────────── */

async function computeBreakdown() {
  const container = $('#breakdown');
  container.replaceChildren(el('p', { className: 'hint', textContent: 'Computing…' }));

  const withoutFeatures = (config, { scatters, hold, free }) => {
    const copy = structuredClone(config);
    if (!scatters) copy.paytable.scatterRules = [];
    if (!hold) delete copy.holdAndSpin;
    if (!free) delete copy.freeSpins;
    return copy;
  };

  try {
    const config = state.config;
    const total = await analyzeRtp(config);
    const linesOnly = await analyzeRtp(withoutFeatures(config, {}));
    const withScatters = await analyzeRtp(withoutFeatures(config, { scatters: true }));
    const withHold = await analyzeRtp(withoutFeatures(config, { scatters: true, hold: true }));

    const parts = [
      { label: 'Base line pays', value: linesOnly.rtp, cls: 'c1' },
      { label: 'Scatter pays', value: withScatters.rtp - linesOnly.rtp, cls: 'c2' },
      { label: 'Hold & spin', value: withHold.rtp - withScatters.rtp, cls: 'c3' },
      { label: 'Free spins', value: total.rtp - withHold.rtp, cls: '' }
    ].filter((part) => Math.abs(part.value) > 1e-9);

    container.replaceChildren(...parts.map((part) => el('div', { className: 'bar-row' }, [
      el('div', { className: 'bar-row-head' }, [
        el('span', { textContent: part.label }),
        el('b', { textContent: `${pct(part.value)}  (${pct(part.value / total.rtp)} of RTP)` })
      ]),
      el('div', { className: 'bar-track' }, el('div', {
        className: `bar-piece ${part.cls}`,
        style: `width:${Math.max(0, Math.min(100, (part.value / total.rtp) * 100))}%`
      }))
    ])));
  } catch (error) {
    container.replaceChildren(el('p', { className: 'inline-error', textContent: error.message }));
  }
}

/* ── Simulation ────────────────────────────────────────────────────── */

async function runSimulation() {
  const container = $('#sim-results');
  const spins = Number($('#sim-spins').value);
  container.replaceChildren(el('p', { className: 'hint', textContent: `Running ${spins.toLocaleString()} spins…` }));

  try {
    const [simulation, theory] = await Promise.all([
      callApi('/api/analysis/simulate', { configuration: state.config, numSpins: spins }),
      analyzeRtp(state.config)
    ]);

    const simulatedHit = simulation.winningSpins / simulation.totalSpins;
    const rows = [
      ['Simulated RTP', pct(simulation.actualRTP), `theory ${pct(theory.rtp)}`],
      ['Simulated hit rate', pct(simulatedHit), `theory ${pct(theory.hitFrequency)}`],
      ['Simulated variance', num(simulation.actualVariance), ''],
      ['Largest single win', num(simulation.maxWin), ''],
      ['Total wagered', num(simulation.totalWagered, 0), ''],
      ['Total won', num(simulation.totalWon, 0), '']
    ];

    container.replaceChildren(el('table', { className: 'kv' }, rows.map(([label, value, note]) =>
      el('tr', {}, [
        el('td', {}, [label, note ? el('div', { className: 'delta', textContent: note }) : null]),
        el('td', { textContent: value })
      ])
    )));
  } catch (error) {
    container.replaceChildren(el('p', { className: 'inline-error', textContent: error.message }));
  }
}

/* ────────────────────────────  wiring  ──────────────────────────── */

async function loadExampleList() {
  try {
    const names = await fetch('/api/examples').then((r) => r.json());
    const select = $('#example-select');
    for (const name of names) {
      select.append(el('option', {
        value: name,
        textContent: name.replace(/\.json$/, '').replace(/-/g, ' ')
      }));
    }
  } catch {
    /* examples are optional; the default config still loads */
  }
}

async function loadExample(name) {
  try {
    state.config = await fetch(`/api/examples/${encodeURIComponent(name)}`).then((r) => r.json());
    render();
    scheduleAnalyze();
  } catch (error) {
    showError(`Could not load example: ${error.message}`);
  }
}

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  if (action === 'add-symbol') {
    state.config.symbols.push({ id: `sym${state.config.symbols.length + 1}`, name: 'New symbol', weight: 1 });
    onConfigChanged(true);
  } else if (action === 'add-payline') {
    const lines = state.config.paytable.payLines;
    lines.push({
      id: lines.length,
      reelPositions: Array.from({ length: state.config.numReels }, (_, i) => i),
      rules: [],
      kindRules: []
    });
    onConfigChanged(true);
  } else if (action === 'add-scatter') {
    state.config.paytable.scatterRules ??= [];
    state.config.paytable.scatterRules.push({
      symbolId: state.config.symbols.find((s) => s.isScatter)?.id ?? state.config.symbols[0]?.id ?? '',
      count: 3,
      multiplier: 5
    });
    onConfigChanged(true);
  } else if (action === 'apply-json') {
    try {
      state.config = JSON.parse($('#json-editor').value);
      $('#json-error').textContent = '';
      render();
      scheduleAnalyze();
    } catch (error) {
      $('#json-error').textContent = error.message;
    }
  } else if (action === 'copy-json') {
    navigator.clipboard?.writeText($('#json-editor').value);
  } else if (action === 'breakdown') {
    computeBreakdown();
  } else if (action === 'simulate') {
    runSimulation();
  }
});

$('#example-select').addEventListener('change', (event) => {
  if (event.target.value) loadExample(event.target.value);
});

loadExampleList();
render();
scheduleAnalyze();
