/* Run with: node frontend/video-poker/test/engine.test.js */
'use strict';
const assert = require('assert');
const E = require('../js/engine.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  ok - ' + name);
}

const hand = (s) => E.parseHand(s);
const cat = (s) => E.evaluate(hand(s));
const JOB = E.PAYTABLES['jacks-or-better-9-6'];

test('parseCard accepts every documented format', () => {
  const as = E.parseCard('AS');
  assert.strictEqual(E.cardToString(as), 'AS');
  assert.strictEqual(E.parseCard('as'), as);
  assert.strictEqual(E.parseCard({ rank: 'A', suit: 'spades' }), as);
  assert.strictEqual(E.parseCard({ rank: 14, suit: 'S' }), as);
  assert.strictEqual(E.parseCard('A♠'), as);
  assert.strictEqual(E.parseCard(as), as);
  const th = E.parseCard('10H');
  assert.strictEqual(E.parseCard('TH'), th);
  assert.strictEqual(E.parseCard({ rank: 10, suit: 'hearts' }), th);
  assert.strictEqual(E.cardToString(th), '10H');
});

test('parseHand accepts strings and arrays, rejects duplicates', () => {
  const h1 = E.parseHand('AS KH 10D 2C 7S');
  const h2 = E.parseHand(['AS', 'KH', '10D', '2C', '7S']);
  assert.deepStrictEqual(h1, h2);
  assert.throws(() => E.parseHand('AS AS KH QD JC'), /Duplicate/);
  assert.throws(() => E.parseHand('XX KH QD JC 2S'), /Unrecognized/);
});

test('evaluator classifies every category', () => {
  const C = E.CATEGORY;
  assert.strictEqual(cat('AS KS QS JS 10S'), C.ROYAL_FLUSH);
  assert.strictEqual(cat('9H KH QH JH 10H'), C.STRAIGHT_FLUSH);
  assert.strictEqual(cat('KS 2C 3C 9C 5C'), C.NOTHING); // 4-flush, not flush
  assert.strictEqual(cat('AC 2C 3C 4C 5C'), C.STRAIGHT_FLUSH); // wheel SF
  assert.strictEqual(cat('7S 7H 7D 7C KD'), C.FOUR_OF_A_KIND);
  assert.strictEqual(cat('7S 7H 7D KC KD'), C.FULL_HOUSE);
  assert.strictEqual(cat('2H 5H 9H JH KH'), C.FLUSH);
  assert.strictEqual(cat('4S 5H 6D 7C 8D'), C.STRAIGHT);
  assert.strictEqual(cat('AS 2H 3D 4C 5D'), C.STRAIGHT); // wheel
  assert.strictEqual(cat('AS KH QD JC 10D'), C.STRAIGHT); // broadway offsuit
  assert.strictEqual(cat('7S 7H 7D KC QD'), C.THREE_OF_A_KIND);
  assert.strictEqual(cat('7S 7H KD KC QD'), C.TWO_PAIR);
  assert.strictEqual(cat('JS JH KD 4C QD'), C.JACKS_OR_BETTER);
  assert.strictEqual(cat('AS AH KD 4C QD'), C.JACKS_OR_BETTER); // aces count
  assert.strictEqual(cat('10S 10H KD 4C QD'), C.NOTHING); // tens do not
  assert.strictEqual(cat('KS QH 9D 4C 2D'), C.NOTHING);
  assert.strictEqual(cat('QS KH AD 2C 3D'), C.NOTHING); // no wraparound straight
});

test('9/6 payouts, including the 4000-coin max-bet royal', () => {
  const C = E.CATEGORY;
  assert.strictEqual(E.payout(C.ROYAL_FLUSH, 1, JOB), 250);
  assert.strictEqual(E.payout(C.ROYAL_FLUSH, 5, JOB), 4000);
  assert.strictEqual(E.payout(C.FULL_HOUSE, 1, JOB), 9);
  assert.strictEqual(E.payout(C.FLUSH, 5, JOB), 30);
  assert.strictEqual(E.payout(C.JACKS_OR_BETTER, 3, JOB), 3);
  assert.strictEqual(E.payout(C.NOTHING, 5, JOB), 0);
});

test('remainingDeck excludes the hand', () => {
  const h = hand('AS KH 10D 2C 7S');
  const deck = E.remainingDeck(h);
  assert.strictEqual(deck.length, 47);
  h.forEach((c) => assert.ok(!deck.includes(c)));
});

test('EV: pat royal holds all five', () => {
  const results = E.analyzeHolds(hand('AS KS QS JS 10S'), 5, JOB);
  assert.strictEqual(results[0].mask, 31);
  assert.strictEqual(results[0].ev, 4000);
});

test('EV: at max bet, 4-to-royal beats the pat flush', () => {
  const h = hand('AS KS QS JS 9S');
  const results = E.analyzeHolds(h, 5, JOB);
  const best = results[0];
  assert.deepStrictEqual(best.heldIndices, [0, 1, 2, 3]);
  // Exact over the 47 unseen cards: 10♠ -> royal, 7 other spades -> flush,
  // 3 offsuit tens -> straight, 12 A/K/Q/J -> high pair, 24 miss.
  const exact = (1 * 4000 + 7 * 30 + 3 * 20 + 12 * 5) / 47;
  assert.ok(Math.abs(best.ev - exact) < 1e-9, `ev ${best.ev} != ${exact}`);
  const patFlush = results.find((r) => r.mask === 31);
  assert.strictEqual(patFlush.ev, 30);
  assert.ok(best.ev > patFlush.ev);
});

test('EV: low pair beats two random high cards', () => {
  // 6♠6♥ with K,Q,4 offsuit rags: correct play is the pair.
  const h = hand('6S 6H KD QC 4H');
  const results = E.analyzeHolds(h, 1, JOB);
  assert.deepStrictEqual(results[0].heldIndices, [0, 1]);
});

test('EV: jacks-or-better pair beats a low pair when both present', () => {
  const h = hand('JS JH 6D 6C 2H');
  const results = E.analyzeHolds(h, 1, JOB);
  // Holding both pairs (two pair already dealt? no - JJ66 is two pair)
  // JJ66x: correct play is holding the two pair, not one pair.
  const best = results[0];
  assert.deepStrictEqual(best.heldIndices, [0, 1, 2, 3]);
});

test('EV: discard-everything EV matches a garbage hand expectation', () => {
  const h = hand('2S 7H 9D 4C 6H'); // no draw-worthy structure at all
  const results = E.analyzeHolds(h, 1, JOB);
  const drawFive = results.find((r) => r.mask === 0);
  assert.ok(drawFive.ev > 0.3 && drawFive.ev < 0.42, `draw-5 ev ${drawFive.ev}`);
  assert.strictEqual(results[0].mask, 0); // tossing all five is best here
});

test('shuffledDeck excludes dealt cards and covers the rest', () => {
  const h = hand('AS KH 10D 2C 7S');
  const deck = E.shuffledDeck(h);
  assert.strictEqual(deck.length, 47);
  assert.strictEqual(new Set(deck).size, 47);
  h.forEach((c) => assert.ok(!deck.includes(c)));
});

test('analysis of a full hand is fast enough for interactive use', () => {
  const h = hand('2S 7H 9D 4C 6H');
  const t0 = Date.now();
  E.analyzeHolds(h, 5, JOB);
  const ms = Date.now() - t0;
  console.log('    (32-way exact analysis took ' + ms + ' ms)');
  assert.ok(ms < 5000, 'analysis took ' + ms + ' ms');
});

console.log(passed + ' tests passed');
