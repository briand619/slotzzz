/*
 * Monte Carlo verification harness: cross-checks the engine's exact,
 * exhaustive-enumeration EV (analyzeHolds/holdEV) against independent random
 * sampling, for every one of the 8 games.
 *
 * This is a different kind of check than test/engine.test.js: the unit
 * tests assert specific hand-computed values; this harness verifies that
 * the exhaustive-enumeration code path (nested loops over the unseen deck)
 * agrees with a completely independent method of computing the same
 * expectation (drawing many random replacements and averaging the payout).
 * A bug in the enumeration's combinatorics (wrong loop bounds, deck
 * construction, double-counting, wild-feasibility logic) would show up as a
 * systematic gap between the two; a fixed seed keeps the run deterministic
 * so a real regression fails reliably rather than sometimes getting lucky.
 *
 * Two kinds of hands are checked, for every game:
 *   - Random hands (broad coverage of ordinary play).
 *   - Curated hands, hand-picked per game to hit its rare/special
 *     categories (royals, wild royals, five of a kind, four deuces, every
 *     quad-kicker tier) that random dealing would almost never produce
 *     (a pat royal is ~1-in-650,000; kicker-tier quads are rarer still).
 *
 * Run with: node test/simulate.js
 */
'use strict';
const E = require('../js/engine.js');

/* ---------- deterministic RNG (mulberry32) ---------- */

function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Monte Carlo estimate of a single hold's EV ---------- */

/*
 * Draws `trials` independent random replacements for the unheld positions
 * (sampled from the same "unseen" pool analyzeHolds uses) and returns the
 * sample mean payout plus its standard error, via Welford-free running
 * sum/sum-of-squares (fine here: payouts are bounded and trial counts are
 * not astronomical, so naive accumulation doesn't lose meaningful precision).
 */
function monteCarloHoldEV(hand, heldIndices, bet, paytable, evalFn, deck, trials, rng) {
  const heldCount = heldIndices.length;
  const need = 5 - heldCount;
  const h = [0, 0, 0, 0, 0];
  for (let k = 0; k < heldCount; k++) h[k] = hand[heldIndices[k]];

  if (need === 0) {
    const p = E.payout(evalFn(h), bet, paytable);
    return { mean: p, stderr: 0 };
  }

  const pool = deck.slice();
  let sum = 0;
  let sumSq = 0;
  for (let t = 0; t < trials; t++) {
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rng() * (pool.length - i));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      h[heldCount + i] = pool[i];
    }
    const p = E.payout(evalFn(h), bet, paytable);
    sum += p;
    sumSq += p * p;
  }
  const mean = sum / trials;
  const variance = Math.max(0, sumSq / trials - mean * mean);
  return { mean: mean, stderr: Math.sqrt(variance / trials) };
}

/* ---------- verification bookkeeping ---------- */

const results = []; // { game, label, mask, exact, mc, stderr, sigmas, ok }

function verify(gameLabel, handLabel, hand, heldIndices, bet, paytable, exactEV, trials, rng) {
  const evalFn = E.makeEvaluator(paytable);
  const includeJoker = paytable.deck === 53;
  const deck = E.remainingDeck(hand, includeJoker);
  const mc = monteCarloHoldEV(hand, heldIndices, bet, paytable, evalFn, deck, trials, rng);
  const diff = Math.abs(mc.mean - exactEV);
  const tolerance = Math.max(6 * mc.stderr, 1e-6);
  const ok = diff <= tolerance;
  const sigmas = mc.stderr > 0 ? diff / mc.stderr : (diff <= 1e-6 ? 0 : Infinity);
  results.push({ game: gameLabel, label: handLabel, exact: exactEV, mc: mc.mean, stderr: mc.stderr, sigmas: sigmas, ok: ok });
  return ok;
}

/* ---------- curated hands per game ---------- */

const h = E.parseHand; // shorthand

const CURATED = {
  'jacks-or-better-9-6': [
    { label: 'pat royal flush', hand: h('AS KS QS JS 10S'), hold: [0, 1, 2, 3, 4] },
    { label: '4-to-royal draw', hand: h('AS KS QS JS 9S'), hold: [0, 1, 2, 3] },
    { label: 'dealt quad, pat', hand: h('7S 7H 7D 7C KH'), hold: [0, 1, 2, 3, 4] },
    { label: 'low pair', hand: h('6S 6H KD QC 4H'), hold: [0, 1] }
  ],
  'bonus-poker-8-5': [
    { label: '4 aces', hand: h('AS AH AD AC 7H'), hold: [0, 1, 2, 3, 4] },
    { label: '4 low (2-4)', hand: h('3S 3H 3D 3C 7H'), hold: [0, 1, 2, 3, 4] },
    { label: '4 mid/high (5-K)', hand: h('9S 9H 9D 9C 7H'), hold: [0, 1, 2, 3, 4] }
  ],
  'bonus-poker-deluxe-9-6': [
    { label: '4 aces (flat tier)', hand: h('AS AH AD AC 7H'), hold: [0, 1, 2, 3, 4] },
    { label: '4 low (flat tier)', hand: h('3S 3H 3D 3C 7H'), hold: [0, 1, 2, 3, 4] }
  ],
  'double-double-bonus-9-6': [
    { label: '4 aces w/2-4 kicker', hand: h('AS AH AD AC 3H'), hold: [0, 1, 2, 3, 4] },
    { label: '4 aces, other kicker', hand: h('AS AH AD AC 7H'), hold: [0, 1, 2, 3, 4] },
    { label: '4 low w/A-4 kicker', hand: h('3S 3H 3D 3C AH'), hold: [0, 1, 2, 3, 4] },
    { label: '4 low, other kicker', hand: h('3S 3H 3D 3C 7H'), hold: [0, 1, 2, 3, 4] }
  ],
  'triple-double-bonus-9-7': [
    { label: '4 aces w/2-4 kicker', hand: h('AS AH AD AC 3H'), hold: [0, 1, 2, 3, 4] },
    { label: '4 low w/A-4 kicker', hand: h('3S 3H 3D 3C AH'), hold: [0, 1, 2, 3, 4] }
  ],
  'triple-triple-bonus': [
    { label: '4 aces w/2-4 kicker', hand: h('AS AH AD AC 3H'), hold: [0, 1, 2, 3, 4] },
    { label: '4 low w/ACE kicker (signature tier)', hand: h('3S 3H 3D 3C AH'), hold: [0, 1, 2, 3, 4] },
    { label: '4 low w/2-4 kicker (ordinary tier)', hand: h('3S 3H 3D 3C 7H'), hold: [0, 1, 2, 3, 4] }
  ],
  'deuces-wild-nsu-100': [
    { label: 'four deuces', hand: h('2S 2H 2D 2C KH'), hold: [0, 1, 2, 3, 4] },
    { label: 'natural royal flush', hand: h('AS KS QS JS 10S'), hold: [0, 1, 2, 3, 4] },
    { label: 'wild royal flush (1 deuce)', hand: h('AS KS QS JS 2H'), hold: [0, 1, 2, 3, 4] },
    { label: 'five of a kind (2 deuces)', hand: h('7S 7H 7D 2C 2H'), hold: [0, 1, 2, 3, 4] },
    { label: 'wild straight flush', hand: h('3S 4S 5S 6S 2H'), hold: [0, 1, 2, 3, 4] },
    { label: 'one-deuce draw', hand: h('2S 7H 9D 4C KH'), hold: [0] }
  ],
  'jokers-wild-kings-or-better': [
    { label: 'natural royal flush', hand: h('AS KS QS JS 10S'), hold: [0, 1, 2, 3, 4] },
    { label: 'wild royal flush (joker)', hand: h('AS KS QS JS JOKER'), hold: [0, 1, 2, 3, 4] },
    { label: 'five of a kind (joker)', hand: h('7S 7H 7D 7C JOKER'), hold: [0, 1, 2, 3, 4] },
    { label: 'kings or better pair', hand: h('KS KH 7D 4C 2H'), hold: [0, 1] },
    { label: 'jacks pair (pays nothing)', hand: h('JS JH 7D 4C 2H'), hold: [0, 1] },
    { label: 'joker draw', hand: h('KS 7D 4C 2H JOKER'), hold: [0, 4] }
  ]
};

const GAME_LIST = [
  'jacks-or-better-9-6', 'bonus-poker-8-5', 'bonus-poker-deluxe-9-6',
  'double-double-bonus-9-6', 'triple-double-bonus-9-7', 'triple-triple-bonus',
  'deuces-wild-nsu-100', 'jokers-wild-kings-or-better'
];

const SEED = 0xC0FFEE;
const RANDOM_HANDS_PER_GAME = 40;
const RANDOM_TRIALS = 300000;
const CURATED_TRIALS = 400000;

function maskToIndices(mask) {
  const idx = [];
  for (let i = 0; i < 5; i++) if (mask & (1 << i)) idx.push(i);
  return idx;
}

function findByMask(analysis, mask) {
  return analysis.find(function (r) { return r.mask === mask; });
}

/* ---------- run ---------- */

const rng = makeRng(SEED);
const bet = 5;
let rtpSampleSum = 0;
let rtpSampleSumSq = 0;
let rtpSampleCount = 0;

console.log('Monte Carlo EV verification (seed 0x' + SEED.toString(16) + ')');
console.log('='.repeat(72));

GAME_LIST.forEach(function (key) {
  const paytable = E.PAYTABLES[key];
  const includeJoker = paytable.deck === 53;
  const gameStart = Date.now();
  let gamePass = 0, gameTotal = 0;

  // Random hands: verify the best hold, the discard-all hold, and one
  // more hold of whatever size the best hold happened NOT to be (so a run
  // exercises every "cards drawn" branch of holdEV, not just two of them).
  for (let i = 0; i < RANDOM_HANDS_PER_GAME; i++) {
    const hand = E.shuffledDeck([], rng, includeJoker).slice(0, 5);
    const analysis = E.analyzeHolds(hand, bet, paytable);
    const best = analysis[0];
    const worst = findByMask(analysis, 0);

    gameTotal++;
    if (verify(key, 'random#' + i + ' best', hand, best.heldIndices, bet, paytable, best.ev, RANDOM_TRIALS, rng)) gamePass++;
    gameTotal++;
    if (verify(key, 'random#' + i + ' discard-all', hand, [], bet, paytable, worst.ev, RANDOM_TRIALS, rng)) gamePass++;

    // A third, differently-sized hold (skip if it collides with the two above).
    const thirdMask = (best.mask === 0 || best.mask === 31) ? 15 : 31;
    if (thirdMask !== best.mask) {
      const third = findByMask(analysis, thirdMask);
      gameTotal++;
      if (verify(key, 'random#' + i + ' mask=' + thirdMask, hand, third.heldIndices, bet, paytable, third.ev, RANDOM_TRIALS, rng)) gamePass++;
    }

    rtpSampleSum += best.ev / bet;
    rtpSampleSumSq += (best.ev / bet) * (best.ev / bet);
    rtpSampleCount++;
  }

  // Curated hands: exact categories this game is specifically shaped around.
  (CURATED[key] || []).forEach(function (c) {
    const analysis = E.analyzeHolds(c.hand, bet, paytable);
    const mask = c.hold.reduce(function (m, i) { return m | (1 << i); }, 0);
    const item = findByMask(analysis, mask);
    gameTotal++;
    if (verify(key, c.label, c.hand, c.hold, bet, paytable, item.ev, CURATED_TRIALS, rng)) gamePass++;
  });

  const ms = Date.now() - gameStart;
  const status = gamePass === gameTotal ? 'PASS' : 'FAIL';
  console.log(
    status + '  ' + paytable.name.padEnd(22) + gamePass + '/' + gameTotal + ' checks'.padEnd(2) +
    '  (' + (ms / 1000).toFixed(1) + 's)'
  );
});

console.log('='.repeat(72));

const failed = results.filter(function (r) { return !r.ok; });
if (failed.length) {
  console.log(failed.length + ' check(s) exceeded tolerance:\n');
  failed.forEach(function (r) {
    console.log(
      '  [' + r.game + '] ' + r.label + '\n' +
      '    exact=' + r.exact.toFixed(6) + '  monte-carlo=' + r.mc.toFixed(6) +
      '  stderr=' + r.stderr.toFixed(6) + '  (' + r.sigmas.toFixed(1) + 'sigma)'
    );
  });
} else {
  const worstSigma = results.reduce(function (m, r) { return Math.max(m, isFinite(r.sigmas) ? r.sigmas : 0); }, 0);
  console.log('All ' + results.length + ' checks agree with exact EV within tolerance.');
  console.log('(largest observed deviation: ' + worstSigma.toFixed(2) + ' standard errors, tolerance is 6)');
}

// Informational only: average best-hold EV across the random hands sampled
// for each game is itself a (noisy, small-sample) estimator of that game's
// overall RTP under optimal play. Not asserted against anything — printed
// for a sanity glance, with its own standard error so it's not mistaken for
// a precise figure.
console.log('\nApprox. sampled RTP under optimal play (informational, not a pass/fail):');
GAME_LIST.forEach(function (key) {
  // Recompute per-game from the results array's random-hand 'best' entries.
  const evs = results.filter(function (r) { return r.game === key && /^random#\d+ best$/.test(r.label); }).map(function (r) { return r.exact / bet; });
  const n = evs.length;
  const mean = evs.reduce(function (a, b) { return a + b; }, 0) / n;
  const variance = evs.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / n;
  const stderr = Math.sqrt(variance / n);
  console.log(
    '  ' + E.PAYTABLES[key].name.padEnd(22) +
    (mean * 100).toFixed(1) + '%  +/- ' + (stderr * 100 * 2).toFixed(1) + '%  (n=' + n + ', ~95% CI)'
  );
});

console.log('');
process.exit(failed.length ? 1 : 0);
