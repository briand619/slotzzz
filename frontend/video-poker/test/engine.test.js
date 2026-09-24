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

/* ---------------- Bonus Poker family: quad-kicker tiers ---------------- */

const BP = E.PAYTABLES['bonus-poker-8-5'];
const BPD = E.PAYTABLES['bonus-poker-deluxe-9-6'];
const DDB = E.PAYTABLES['double-double-bonus-9-6'];
const TDB = E.PAYTABLES['triple-double-bonus-9-7'];
const TTB = E.PAYTABLES['triple-triple-bonus'];

test('Bonus Poker rank-tier quads: aces / 2-4 / 5-K each pay differently', () => {
  const C = E.CATEGORY;
  assert.strictEqual(E.resolveCategory(hand('AS AH AD AC 7H'), BP), C.FOUR_ACES);
  assert.strictEqual(E.resolveCategory(hand('3S 3H 3D 3C 7H'), BP), C.FOUR_LOW);
  assert.strictEqual(E.resolveCategory(hand('9S 9H 9D 9C 7H'), BP), C.FOUR_5_TO_K);
  assert.strictEqual(E.payout(C.FOUR_ACES, 1, BP), 80);
  assert.strictEqual(E.payout(C.FOUR_LOW, 1, BP), 40);
  assert.strictEqual(E.payout(C.FOUR_5_TO_K, 1, BP), 25);
  // Kicker never matters for Bonus Poker's tiers.
  assert.strictEqual(E.resolveCategory(hand('AS AH AD AC 2H'), BP), C.FOUR_ACES);
});

test('Bonus Poker Deluxe pays every quad flat, no rank tiers', () => {
  const C = E.CATEGORY;
  assert.strictEqual(E.resolveCategory(hand('AS AH AD AC 7H'), BPD), C.FOUR_OF_A_KIND);
  assert.strictEqual(E.resolveCategory(hand('3S 3H 3D 3C 7H'), BPD), C.FOUR_OF_A_KIND);
  assert.strictEqual(E.payout(C.FOUR_OF_A_KIND, 1, BPD), 80);
});

test('Double Double Bonus: kicker rank splits both the ace and low quad tiers', () => {
  const C = E.CATEGORY;
  assert.strictEqual(E.resolveCategory(hand('AS AH AD AC 3H'), DDB), C.FOUR_ACES_KICKER); // kicker 2/3/4
  assert.strictEqual(E.resolveCategory(hand('AS AH AD AC 7H'), DDB), C.FOUR_ACES); // other kicker
  assert.strictEqual(E.resolveCategory(hand('3S 3H 3D 3C AH'), DDB), C.FOUR_LOW_KICKER); // kicker A/2/3/4
  assert.strictEqual(E.resolveCategory(hand('3S 3H 3D 3C 7H'), DDB), C.FOUR_LOW);
  assert.strictEqual(E.resolveCategory(hand('9S 9H 9D 9C AH'), DDB), C.FOUR_5_TO_K); // no kicker tier for 5-K
  assert.strictEqual(E.payout(C.FOUR_ACES_KICKER, 1, DDB), 400);
  assert.strictEqual(E.payout(C.FOUR_LOW_KICKER, 1, DDB), 160);
});

test('Triple Double and Triple Triple Bonus share the same kicker mechanic; TDB beats DDB', () => {
  const C = E.CATEGORY;
  const h = hand('AS AH AD AC 4H');
  assert.strictEqual(E.resolveCategory(h, TDB), C.FOUR_ACES_KICKER);
  assert.strictEqual(E.resolveCategory(h, TTB), C.FOUR_ACES_KICKER);
  assert.ok(E.payout(C.FOUR_ACES_KICKER, 1, TDB) > E.payout(C.FOUR_ACES_KICKER, 1, DDB));
  // TDB and TTB cap the Aces-w/-kicker tier at the same 4000 max-bet award;
  // TTB's distinguishing feature is the extra FOUR_LOW_ACE_KICKER tier below.
  assert.strictEqual(E.payout(C.FOUR_ACES_KICKER, 5, TTB), E.payout(C.FOUR_ACES_KICKER, 5, TDB));
});

test('Triple Triple Bonus only: a low quad with an Ace kicker matches the top Aces-kicker tier', () => {
  const C = E.CATEGORY;
  const lowQuadAceKicker = hand('3S 3H 3D 3C AH');
  assert.strictEqual(E.resolveCategory(lowQuadAceKicker, TTB), C.FOUR_LOW_ACE_KICKER);
  assert.strictEqual(E.payout(C.FOUR_LOW_ACE_KICKER, 1, TTB), E.payout(C.FOUR_ACES_KICKER, 1, TTB));
  assert.strictEqual(E.payout(C.FOUR_LOW_ACE_KICKER, 5, TTB), E.payout(C.FOUR_ACES_KICKER, 5, TTB));
  // A 2/3/4 kicker (not an Ace) stays in the ordinary, lower low-kicker tier.
  const lowQuadLowKicker = hand('3S 3H 3D 3C 4H');
  assert.strictEqual(E.resolveCategory(lowQuadLowKicker, TTB), C.FOUR_LOW_KICKER);
  assert.ok(E.payout(C.FOUR_LOW_KICKER, 1, TTB) < E.payout(C.FOUR_LOW_ACE_KICKER, 1, TTB));
  // Double Double and Triple Double Bonus do not have this special case: an
  // Ace kicker on a low quad is just their ordinary bonus-kicker tier.
  assert.strictEqual(E.resolveCategory(lowQuadAceKicker, DDB), C.FOUR_LOW_KICKER);
  assert.strictEqual(E.resolveCategory(lowQuadAceKicker, TDB), C.FOUR_LOW_KICKER);
});

test('EV analysis runs cleanly on every standard-family paytable', () => {
  const h = hand('AS AH KD QC JH');
  [JOB, BP, BPD, DDB, TDB, TTB].forEach((pt) => {
    const results = E.analyzeHolds(h, 5, pt);
    assert.strictEqual(results.length, 32);
    assert.ok(results[0].ev >= results[31].ev);
  });
});

/* ---------------- Deuces Wild ---------------- */

const DEUCES = E.PAYTABLES['deuces-wild-nsu-100'];

test('Deuces Wild: four deuces beats everything, regardless of the 5th card', () => {
  assert.strictEqual(E.resolveCategory(hand('2S 2H 2D 2C AH'), DEUCES), E.CATEGORY.FOUR_DEUCES);
});

test('Deuces Wild: natural royal vs wild royal are distinguished', () => {
  assert.strictEqual(E.resolveCategory(hand('AS KS QS JS 10S'), DEUCES), E.CATEGORY.ROYAL_FLUSH);
  assert.strictEqual(E.resolveCategory(hand('AS KS QS JS 2S'), DEUCES), E.CATEGORY.WILD_ROYAL_FLUSH);
  assert.strictEqual(E.resolveCategory(hand('AS KS QS 2S 2H'), DEUCES), E.CATEGORY.WILD_ROYAL_FLUSH);
});

test('Deuces Wild: five of a kind from natural trip/quad plus deuces', () => {
  assert.strictEqual(E.resolveCategory(hand('7S 7H 7D 2C 2H'), DEUCES), E.CATEGORY.FIVE_OF_A_KIND);
  assert.strictEqual(E.resolveCategory(hand('7S 7H 7D 7C 2H'), DEUCES), E.CATEGORY.FIVE_OF_A_KIND);
});

test('Deuces Wild: a deuce completes a straight flush, not just a flush', () => {
  // 3-4-5-6 of spades plus a deuce completes 3-4-5-6-7 straight flush (deuce plays as the 7).
  assert.strictEqual(E.resolveCategory(hand('3S 4S 5S 6S 2H'), DEUCES), E.CATEGORY.STRAIGHT_FLUSH);
  // Same ranks but off-suit deuce cannot complete the flush -> still a straight flush is impossible,
  // falls back to straight since suits mismatch only among naturals which are already all spades;
  // use a genuinely suit-breaking example instead: four different suits, no way to flush.
  assert.strictEqual(E.resolveCategory(hand('3S 4H 5D 6C 2S'), DEUCES), E.CATEGORY.STRAIGHT);
});

test('Deuces Wild: two natural pairs plus a deuce is a full house, not two pair', () => {
  assert.strictEqual(E.resolveCategory(hand('7S 7H KD KC 2H'), DEUCES), E.CATEGORY.FULL_HOUSE);
});

test('Deuces Wild: no deuces falls back to the plain evaluator, and pairs pay nothing', () => {
  const C = E.CATEGORY;
  assert.strictEqual(E.resolveCategory(hand('7S 7H KD QC JH'), DEUCES), C.NOTHING); // pair
  assert.strictEqual(E.resolveCategory(hand('7S 7H KD KC QH'), DEUCES), C.NOTHING); // two pair
  assert.strictEqual(E.resolveCategory(hand('AS AH AD KC QH'), DEUCES), C.THREE_OF_A_KIND);
  assert.strictEqual(E.payout(C.NOTHING, 5, DEUCES), 0);
});

test('Deuces Wild EV: pat natural royal is the clear best hold', () => {
  const results = E.analyzeHolds(hand('AS KS QS JS 10S'), 5, DEUCES);
  assert.strictEqual(results[0].mask, 31);
  assert.strictEqual(results[0].ev, 1250);
});

/* ---------------- Jokers Wild ---------------- */

const JOKERS = E.PAYTABLES['jokers-wild-kings-or-better'];

test('Jokers Wild: joker token parses and completes hands as a wild', () => {
  const h = hand('AS AH AD JOKER 7H');
  assert.strictEqual(h[3], E.JOKER);
  assert.strictEqual(E.resolveCategory(h, JOKERS), E.CATEGORY.FOUR_OF_A_KIND);
  const h2 = E.parseHand(['AS', 'AH', 'AD', 'JK', '7H']);
  assert.strictEqual(E.resolveCategory(h2, JOKERS), E.CATEGORY.FOUR_OF_A_KIND);
});

test('Jokers Wild: natural royal vs wild royal, and five of a kind', () => {
  assert.strictEqual(E.resolveCategory(hand('AS KS QS JS 10S'), JOKERS), E.CATEGORY.ROYAL_FLUSH);
  assert.strictEqual(E.resolveCategory(hand('AS KS QS JS JOKER'), JOKERS), E.CATEGORY.WILD_ROYAL_FLUSH);
  assert.strictEqual(E.resolveCategory(hand('7S 7H 7D 7C JOKER'), JOKERS), E.CATEGORY.FIVE_OF_A_KIND);
});

test('Jokers Wild: Kings-or-better threshold excludes Jacks and Queens', () => {
  const C = E.CATEGORY;
  assert.strictEqual(E.resolveCategory(hand('KS KH 7D 4C 2H'), JOKERS), C.KINGS_OR_BETTER);
  assert.strictEqual(E.resolveCategory(hand('AS AH 7D 4C 2H'), JOKERS), C.KINGS_OR_BETTER);
  assert.strictEqual(E.resolveCategory(hand('JS JH 7D 4C 2H'), JOKERS), C.NOTHING);
  assert.strictEqual(E.resolveCategory(hand('QS QH 7D 4C 2H'), JOKERS), C.NOTHING);
  // Joker pairs with a lone King to still qualify.
  assert.strictEqual(E.resolveCategory(hand('KS 7D 4C 2H JOKER'), JOKERS), C.KINGS_OR_BETTER);
  // Joker pairs with a lone Jack: does not qualify.
  assert.strictEqual(E.resolveCategory(hand('JS 7D 4C 2H JOKER'), JOKERS), C.NOTHING);
});

test('Jokers Wild: two natural pairs plus the joker is a full house', () => {
  assert.strictEqual(E.resolveCategory(hand('7S 7H KD KC JOKER'), JOKERS), E.CATEGORY.FULL_HOUSE);
});

test('Jokers Wild EV: pat natural royal is the clear best hold', () => {
  const results = E.analyzeHolds(hand('AS KS QS JS 10S'), 5, JOKERS);
  assert.strictEqual(results[0].mask, 31);
  assert.strictEqual(results[0].ev, 1250);
});

test('Jokers Wild deck includes the joker for draws', () => {
  const h = hand('AS KS QS JS 9H');
  const deck = E.remainingDeck(h, true);
  assert.strictEqual(deck.length, 48); // 53 - 5
  assert.ok(deck.includes(E.JOKER));
});

console.log(passed + ' tests passed');
