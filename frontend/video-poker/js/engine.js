/*
 * Video poker engine: cards, hand evaluation, paytables, and exact
 * expected-value analysis of all 32 hold combinations.
 *
 * Card encoding: an integer 0..51 where rank = card >> 2 (0 = deuce .. 12 = ace)
 * and suit = card & 3 (0 = clubs, 1 = diamonds, 2 = hearts, 3 = spades).
 *
 * Works in the browser (window.VPEngine) and in Node (module.exports).
 */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.VPEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RANK_CHARS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var SUIT_CHARS = ['C', 'D', 'H', 'S'];
  var SUIT_GLYPHS = ['♣', '♦', '♥', '♠'];
  var SUIT_NAMES = ['clubs', 'diamonds', 'hearts', 'spades'];

  var CATEGORY = {
    NOTHING: 0,
    JACKS_OR_BETTER: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9
  };

  var CATEGORY_NAMES = [
    'GAME OVER', 'JACKS OR BETTER', 'TWO PAIR', '3 OF A KIND', 'STRAIGHT',
    'FLUSH', 'FULL HOUSE', '4 OF A KIND', 'STRAIGHT FLUSH', 'ROYAL FLUSH'
  ];

  /* Full-pay 9/6 Jacks or Better. pays[i] is the total coin award at bet i+1. */
  var PAYTABLES = {
    'jacks-or-better-9-6': {
      id: 'jacks-or-better-9-6',
      name: 'JACKS OR BETTER',
      rows: [
        { category: CATEGORY.ROYAL_FLUSH, label: 'ROYAL FLUSH', pays: [250, 500, 750, 1000, 4000] },
        { category: CATEGORY.STRAIGHT_FLUSH, label: 'STRAIGHT FLUSH', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FOUR_OF_A_KIND, label: '4 OF A KIND', pays: [25, 50, 75, 100, 125] },
        { category: CATEGORY.FULL_HOUSE, label: 'FULL HOUSE', pays: [9, 18, 27, 36, 45] },
        { category: CATEGORY.FLUSH, label: 'FLUSH', pays: [6, 12, 18, 24, 30] },
        { category: CATEGORY.STRAIGHT, label: 'STRAIGHT', pays: [4, 8, 12, 16, 20] },
        { category: CATEGORY.THREE_OF_A_KIND, label: '3 OF A KIND', pays: [3, 6, 9, 12, 15] },
        { category: CATEGORY.TWO_PAIR, label: 'TWO PAIR', pays: [2, 4, 6, 8, 10] },
        { category: CATEGORY.JACKS_OR_BETTER, label: 'JACKS OR BETTER', pays: [1, 2, 3, 4, 5] }
      ]
    }
  };

  function makeCard(rank, suit) { return (rank << 2) | suit; }
  function rankOf(card) { return card >> 2; }
  function suitOf(card) { return card & 3; }

  function cardToString(card) {
    return RANK_CHARS[rankOf(card)] + SUIT_CHARS[suitOf(card)];
  }

  function cardToPretty(card) {
    return RANK_CHARS[rankOf(card)] + SUIT_GLYPHS[suitOf(card)];
  }

  var RANK_LOOKUP = {
    '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7,
    '10': 8, 'T': 8, 'J': 9, 'Q': 10, 'K': 11, 'A': 12,
    '11': 9, '12': 10, '13': 11, '14': 12, '1': 12
  };
  var SUIT_LOOKUP = {
    'C': 0, 'CLUB': 0, 'CLUBS': 0, '♣': 0,
    'D': 1, 'DIAMOND': 1, 'DIAMONDS': 1, '♦': 1,
    'H': 2, 'HEART': 2, 'HEARTS': 2, '♥': 2,
    'S': 3, 'SPADE': 3, 'SPADES': 3, '♠': 3
  };

  /*
   * Accepts:
   *  - an integer 0..51 (native encoding)
   *  - a string: "AS", "as", "10H", "Th", "K♥", "10 of hearts"
   *  - an object: { rank: 'A'|'10'|10|14, suit: 'S'|'spades'|'♠' }
   */
  function parseCard(input) {
    if (typeof input === 'number' && Number.isInteger(input)) {
      if (input < 0 || input > 51) throw new Error('Card integer out of range: ' + input);
      return input;
    }
    if (typeof input === 'string') {
      var s = input.trim().toUpperCase().replace(/\s+OF\s+/, '');
      if (s.length < 2) throw new Error('Unrecognized card: "' + input + '"');
      var suitPart = s.slice(-1);
      var rankPart = s.slice(0, -1).trim();
      // Allow suit-first too ("SA", "♠A") as long as it is unambiguous.
      if (!(rankPart in RANK_LOOKUP) && s.slice(0, 1) in SUIT_LOOKUP) {
        suitPart = s.slice(0, 1);
        rankPart = s.slice(1).trim();
      }
      if (!(rankPart in RANK_LOOKUP)) throw new Error('Unrecognized rank in card: "' + input + '"');
      if (!(suitPart in SUIT_LOOKUP)) throw new Error('Unrecognized suit in card: "' + input + '"');
      return makeCard(RANK_LOOKUP[rankPart], SUIT_LOOKUP[suitPart]);
    }
    if (input && typeof input === 'object') {
      var rankKey = String(input.rank).trim().toUpperCase();
      var suitKey = String(input.suit).trim().toUpperCase();
      if (!(rankKey in RANK_LOOKUP)) throw new Error('Unrecognized rank: "' + input.rank + '"');
      if (!(suitKey in SUIT_LOOKUP)) throw new Error('Unrecognized suit: "' + input.suit + '"');
      return makeCard(RANK_LOOKUP[rankKey], SUIT_LOOKUP[suitKey]);
    }
    throw new Error('Unrecognized card: ' + JSON.stringify(input));
  }

  /* Accepts an array of cards, or a single string like "AS KH 10D 2C 7S" / "AS,KH,10D,2C,7S". */
  function parseHand(input) {
    var list = input;
    if (typeof input === 'string') {
      list = input.split(/[\s,;|]+/).filter(function (t) { return t.length > 0; });
    }
    if (!Array.isArray(list)) throw new Error('Hand must be an array or string of cards');
    var cards = list.map(parseCard);
    var seen = {};
    cards.forEach(function (c) {
      if (seen[c]) throw new Error('Duplicate card in hand: ' + cardToString(c));
      seen[c] = true;
    });
    return cards;
  }

  var WHEEL_MASK = 0x100F;  /* A,2,3,4,5 */
  var ROYAL_MASK = 0x1F00;  /* 10,J,Q,K,A */

  var rankCountScratch = new Uint8Array(13);

  /* Evaluate an array of 5 card ints. Returns a CATEGORY value. */
  function evaluate(hand) {
    var rc = rankCountScratch;
    rc.fill(0);
    var firstSuit = hand[0] & 3;
    var flush = true;
    var rankMask = 0;
    var distinct = 0;
    for (var i = 0; i < 5; i++) {
      var c = hand[i];
      var r = c >> 2;
      if (rc[r] === 0) distinct++;
      rc[r]++;
      rankMask |= 1 << r;
      if ((c & 3) !== firstSuit) flush = false;
    }

    if (distinct === 5) {
      var straight = rankMask === WHEEL_MASK;
      if (!straight) {
        for (var s = 0; s <= 8; s++) {
          if (((rankMask >> s) & 31) === 31) { straight = true; break; }
        }
      }
      if (straight && flush) {
        return rankMask === ROYAL_MASK ? CATEGORY.ROYAL_FLUSH : CATEGORY.STRAIGHT_FLUSH;
      }
      if (flush) return CATEGORY.FLUSH;
      if (straight) return CATEGORY.STRAIGHT;
      return CATEGORY.NOTHING;
    }

    var pairs = 0, trips = false, quads = false, highPair = false;
    for (var r2 = 0; r2 < 13; r2++) {
      var n = rc[r2];
      if (n === 2) { pairs++; if (r2 >= 9) highPair = true; }
      else if (n === 3) trips = true;
      else if (n === 4) quads = true;
    }
    if (quads) return CATEGORY.FOUR_OF_A_KIND;
    if (trips && pairs === 1) return CATEGORY.FULL_HOUSE;
    if (trips) return CATEGORY.THREE_OF_A_KIND;
    if (pairs === 2) return CATEGORY.TWO_PAIR;
    if (highPair) return CATEGORY.JACKS_OR_BETTER;
    return CATEGORY.NOTHING;
  }

  /* Total coins returned for a category at a bet of 1..5 coins. */
  function payout(category, bet, paytable) {
    var rows = paytable.rows;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].category === category) return rows[i].pays[bet - 1];
    }
    return 0;
  }

  function buildPayArray(bet, paytable) {
    var pays = new Float64Array(10);
    paytable.rows.forEach(function (row) { pays[row.category] = row.pays[bet - 1]; });
    return pays;
  }

  /*
   * Exact EV (in coins, for the given total bet) of holding `held` out of a
   * dealt hand, drawing replacements from `deck` (the 47 unseen cards).
   */
  function holdEV(held, deck, pays) {
    var need = 5 - held.length;
    var h = [0, 0, 0, 0, 0];
    for (var i = 0; i < held.length; i++) h[i] = held[i];
    var D = deck.length;
    var total = 0;
    var count = 0;
    var a, b, c, d, e;
    switch (need) {
      case 0:
        return pays[evaluate(h)];
      case 1:
        for (a = 0; a < D; a++) {
          h[4] = deck[a];
          total += pays[evaluate(h)]; count++;
        }
        break;
      case 2:
        for (a = 0; a < D - 1; a++) {
          h[3] = deck[a];
          for (b = a + 1; b < D; b++) {
            h[4] = deck[b];
            total += pays[evaluate(h)]; count++;
          }
        }
        break;
      case 3:
        for (a = 0; a < D - 2; a++) {
          h[2] = deck[a];
          for (b = a + 1; b < D - 1; b++) {
            h[3] = deck[b];
            for (c = b + 1; c < D; c++) {
              h[4] = deck[c];
              total += pays[evaluate(h)]; count++;
            }
          }
        }
        break;
      case 4:
        for (a = 0; a < D - 3; a++) {
          h[1] = deck[a];
          for (b = a + 1; b < D - 2; b++) {
            h[2] = deck[b];
            for (c = b + 1; c < D - 1; c++) {
              h[3] = deck[c];
              for (d = c + 1; d < D; d++) {
                h[4] = deck[d];
                total += pays[evaluate(h)]; count++;
              }
            }
          }
        }
        break;
      case 5:
        for (a = 0; a < D - 4; a++) {
          h[0] = deck[a];
          for (b = a + 1; b < D - 3; b++) {
            h[1] = deck[b];
            for (c = b + 1; c < D - 2; c++) {
              h[2] = deck[c];
              for (d = c + 1; d < D - 1; d++) {
                h[3] = deck[d];
                for (e = d + 1; e < D; e++) {
                  h[4] = deck[e];
                  total += pays[evaluate(h)]; count++;
                }
              }
            }
          }
        }
        break;
    }
    return total / count;
  }

  function remainingDeck(hand) {
    var inHand = {};
    hand.forEach(function (c) { inHand[c] = true; });
    var deck = [];
    for (var c = 0; c < 52; c++) if (!inHand[c]) deck.push(c);
    return deck;
  }

  function analyzeMask(hand, deck, mask, pays) {
    var held = [];
    var indices = [];
    for (var i = 0; i < 5; i++) {
      if (mask & (1 << i)) { held.push(hand[i]); indices.push(i); }
    }
    return { mask: mask, heldIndices: indices, heldCards: held, ev: holdEV(held, deck, pays) };
  }

  /*
   * Exact EV of all 32 hold combinations for a dealt hand, sorted best first.
   * `hand` is 5 card ints; EV values are total coins returned for `bet` coins.
   */
  function analyzeHolds(hand, bet, paytable) {
    var deck = remainingDeck(hand);
    var pays = buildPayArray(bet, paytable);
    var results = [];
    for (var mask = 0; mask < 32; mask++) {
      results.push(analyzeMask(hand, deck, mask, pays));
    }
    results.sort(function (x, y) { return y.ev - x.ev; });
    return results;
  }

  /*
   * Same as analyzeHolds but spread across macrotasks (one hold combination per
   * chunk) so the UI never blocks. Returns { promise, cancel }.
   */
  function analyzeHoldsAsync(hand, bet, paytable) {
    var deck = remainingDeck(hand);
    var pays = buildPayArray(bet, paytable);
    var results = [];
    var cancelled = false;
    var promise = new Promise(function (resolve, reject) {
      var mask = 0;
      function step() {
        if (cancelled) { reject(new Error('cancelled')); return; }
        var deadline = Date.now() + 30;
        while (mask < 32 && Date.now() < deadline) {
          results.push(analyzeMask(hand, deck, mask, pays));
          mask++;
        }
        if (mask < 32) {
          setTimeout(step, 0);
        } else {
          results.sort(function (x, y) { return y.ev - x.ev; });
          resolve(results);
        }
      }
      setTimeout(step, 0);
    });
    return { promise: promise, cancel: function () { cancelled = true; } };
  }

  function shuffledDeck(exclude, rng) {
    rng = rng || Math.random;
    var inHand = {};
    (exclude || []).forEach(function (c) { inHand[c] = true; });
    var deck = [];
    for (var c = 0; c < 52; c++) if (!inHand[c]) deck.push(c);
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    return deck;
  }

  return {
    CATEGORY: CATEGORY,
    CATEGORY_NAMES: CATEGORY_NAMES,
    PAYTABLES: PAYTABLES,
    RANK_CHARS: RANK_CHARS,
    SUIT_CHARS: SUIT_CHARS,
    SUIT_GLYPHS: SUIT_GLYPHS,
    SUIT_NAMES: SUIT_NAMES,
    makeCard: makeCard,
    rankOf: rankOf,
    suitOf: suitOf,
    cardToString: cardToString,
    cardToPretty: cardToPretty,
    parseCard: parseCard,
    parseHand: parseHand,
    evaluate: evaluate,
    payout: payout,
    remainingDeck: remainingDeck,
    analyzeHolds: analyzeHolds,
    analyzeHoldsAsync: analyzeHoldsAsync,
    shuffledDeck: shuffledDeck
  };
});
