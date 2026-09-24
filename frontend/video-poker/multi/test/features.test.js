/* Run with: node frontend/video-poker/multi/test/features.test.js */
'use strict';
const assert = require('assert');
const E = require('../../js/engine.js');
const F = require('../js/features.js');
const T = require('../js/tables.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

const C = E.CATEGORY;
const hand = (s) => E.parseHand(s);
const pay5 = (pt, cat) => pt.rows.find((r) => r.category === cat).pays[4];

test('every feature paytable builds, with the royal jump at max bet only', () => {
  ['ultimate-x', 'dream-card'].forEach((f) => {
    F.paytables(f).forEach((pt) => {
      assert.ok(pt.rows.length >= 9, pt.id);
      pt.rows.forEach((r) => {
        assert.ok(Number.isInteger(r.category) && r.label, pt.id + ' row ' + r.label);
        if (r.category === C.ROYAL_FLUSH) assert.deepStrictEqual(r.pays, [250, 500, 750, 1000, 4000], pt.id);
        else assert.deepStrictEqual(r.pays, [1, 2, 3, 4, 5].map((k) => k * r.pays[0]), pt.id + ' ' + r.label);
      });
      assert.strictEqual(F.paytableById(pt.id), pt);
    });
  });
  assert.strictEqual(F.paytables('ultimate-x').length, 29);
  assert.strictEqual(F.paytables('dream-card').length, 29);
});

test('no-feature games are the classic paytables, unchanged', () => {
  const none = F.paytables('none');
  assert.strictEqual(none.length, 9);
  none.forEach((pt) => assert.deepStrictEqual(pt.rows, E.PAYTABLES[pt.id].rows));
});

test('Ultimate X multipliers match Wizard of Odds, by game and hand count', () => {
  const job = F.paytableById('ux-jacks-or-better-8-6');
  assert.strictEqual(F.uxMultiplier(job, C.FULL_HOUSE, 3), 12);
  assert.strictEqual(F.uxMultiplier(job, C.FLUSH, 3), 11);
  assert.strictEqual(F.uxMultiplier(job, C.FOUR_OF_A_KIND, 3), 2);
  assert.strictEqual(F.uxMultiplier(job, C.FOUR_OF_A_KIND, 5), 3);
  assert.strictEqual(F.uxMultiplier(job, C.ROYAL_FLUSH, 10), 7);
  assert.strictEqual(F.uxMultiplier(job, C.JACKS_OR_BETTER, 10), 2);
  assert.strictEqual(F.uxMultiplier(job, C.NOTHING, 10), 1);
  const ddb = F.paytableById('ux-double-double-bonus-9-6');
  assert.strictEqual(F.uxMultiplier(ddb, C.FOUR_ACES_KICKER, 10), 4);
  assert.strictEqual(F.uxMultiplier(ddb, C.FOUR_5_TO_K, 5), 3);
  assert.strictEqual(pay5(ddb, C.FOUR_ACES_KICKER), 2000);
  const dw = F.paytableById('ux-deuces-wild-25-15-9-4-4-3');
  assert.strictEqual(F.uxMultiplier(dw, C.STRAIGHT_FLUSH, 3), 12);
  assert.strictEqual(pay5(dw, C.WILD_ROYAL_FLUSH), 125);
  assert.strictEqual(F.paytableById('ux-joker-poker-50-17-7-5-3').deck, 53);
});

test('Ultimate X strategy values follow WoO: 2 x win + multiplier - 1 (x5 coins)', () => {
  const job = F.paytableById('ux-jacks-or-better-8-6');
  const s = F.uxStrategyPaytable(job, 3);
  const v = (cat) => s.rows.find((r) => r.category === cat).pays[4];
  assert.strictEqual(v(C.FULL_HOUSE), 5 * (2 * 8 + 12 - 1));
  assert.strictEqual(v(C.JACKS_OR_BETTER), 5 * (2 * 1 + 2 - 1));
  assert.strictEqual(v(C.ROYAL_FLUSH), 2 * 4000 + 5 * (2 - 1));
  // A pat full house must outrank breaking it for anything in this game.
  const ranked = E.analyzeHolds(hand('7S 7H 7D KC KD'), 5, s);
  assert.strictEqual(ranked[0].mask, 31);
});

test('Dream Card trigger rates match Wizard of Odds', () => {
  const p = (id) => F.dreamCardProbability(F.paytableById(id));
  assert.strictEqual(p('dc-jacks-or-better-9-6'), 0.505);
  assert.strictEqual(p('dc-bonus-poker-deluxe-9-6'), 0.313);
  assert.strictEqual(p('dc-triple-double-bonus-9-6'), 0.267);
  assert.strictEqual(p('dc-deuces-wild-25-15-9-4-4-3'), 0.59);
  assert.strictEqual(F.paytableById('dc-deuces-wild-20-11-9-4-4-3'), null);
});

test('Triple Bonus pays kings or better only', () => {
  const tb = F.paytableById('dc-triple-bonus-10-7');
  assert.strictEqual(E.resolveCategory(hand('JS JH 7D 4C 2H'), tb), C.NOTHING);
  assert.strictEqual(E.resolveCategory(hand('KS KH 7D 4C 2H'), tb), C.KINGS_OR_BETTER);
  assert.strictEqual(E.payout(C.KINGS_OR_BETTER, 5, tb), 5);
  assert.strictEqual(pay5(tb, C.FOUR_ACES), 1200);
});

test('Triple Bonus exact EV agrees with random sampling (kings-or-better path)', () => {
  const tb = F.paytableById('dc-triple-bonus-10-7');
  const h = hand('QS QH 7D 4C 2H'); // queens pay nothing here, so the pair's EV comes only from improving
  const exact = E.analyzeHolds(h, 5, tb).find((r) => r.mask === 3).ev;
  let s = 42;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const deck = E.remainingDeck(h);
  const trials = 200000;
  let sum = 0, sumSq = 0;
  for (let t = 0; t < trials; t++) {
    const pool = deck.slice();
    const final = [h[0], h[1]];
    for (let i = 0; i < 3; i++) final.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    const p = E.payout(E.resolveCategory(final, tb), 5, tb);
    sum += p; sumSq += p * p;
  }
  const mean = sum / trials;
  const se = Math.sqrt((sumSq / trials - mean * mean) / trials);
  assert.ok(Math.abs(mean - exact) < 6 * se, 'exact ' + exact + ' vs sampled ' + mean + ' (se ' + se + ')');
});

test('WoO published returns are carried through for display', () => {
  const job = F.paytableById('ux-jacks-or-better-8-6');
  assert.strictEqual(job.returns['10'], 0.99422);
  const dc = F.paytableById('dc-jacks-or-better-9-6');
  assert.strictEqual(dc.dreamCardReturn, 0.995592);
  assert.strictEqual(T.dreamCard.tables.length, 29);
});

console.log(passed + ' tests passed');
