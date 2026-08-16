/*
 * Video poker engine: cards, hand evaluation, paytables, and exact
 * expected-value analysis of all 32 hold combinations, across eight games:
 * Jacks or Better, Bonus Poker, Bonus Poker Deluxe, Double Double Bonus,
 * Triple Double Bonus, Triple Triple Bonus, Deuces Wild, and Jokers Wild.
 *
 * Card encoding: an integer 0..51 where rank = card >> 2 (0 = deuce .. 12 = ace)
 * and suit = card & 3 (0 = clubs, 1 = diamonds, 2 = hearts, 3 = spades).
 * The Joker (used only by Jokers Wild) is the sentinel integer 52.
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
  var JOKER = 52;
  var DEUCE_RANK = 0;
  var ACE_RANK = 12;
  var KING_RANK = 11;

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
    ROYAL_FLUSH: 9,
    /* Kicker-tiered four-of-a-kind, used by Bonus/DDB/TDB/TTB paytables. */
    FOUR_ACES_KICKER: 10,
    FOUR_ACES: 11,
    FOUR_LOW_KICKER: 12,
    FOUR_LOW: 13,
    FOUR_5_TO_K: 14,
    /* Wild-card games (Deuces Wild, Jokers Wild). */
    FOUR_DEUCES: 15,
    WILD_ROYAL_FLUSH: 16,
    FIVE_OF_A_KIND: 17,
    KINGS_OR_BETTER: 18,
    /* Triple Triple Bonus only: 4 2s/3s/4s with an Ace kicker matches the top Aces-w/-kicker tier. */
    FOUR_LOW_ACE_KICKER: 19
  };

  var CATEGORY_NAMES = [];
  CATEGORY_NAMES[CATEGORY.NOTHING] = 'GAME OVER';
  CATEGORY_NAMES[CATEGORY.JACKS_OR_BETTER] = 'JACKS OR BETTER';
  CATEGORY_NAMES[CATEGORY.TWO_PAIR] = 'TWO PAIR';
  CATEGORY_NAMES[CATEGORY.THREE_OF_A_KIND] = '3 OF A KIND';
  CATEGORY_NAMES[CATEGORY.STRAIGHT] = 'STRAIGHT';
  CATEGORY_NAMES[CATEGORY.FLUSH] = 'FLUSH';
  CATEGORY_NAMES[CATEGORY.FULL_HOUSE] = 'FULL HOUSE';
  CATEGORY_NAMES[CATEGORY.FOUR_OF_A_KIND] = '4 OF A KIND';
  CATEGORY_NAMES[CATEGORY.STRAIGHT_FLUSH] = 'STRAIGHT FLUSH';
  CATEGORY_NAMES[CATEGORY.ROYAL_FLUSH] = 'ROYAL FLUSH';
  CATEGORY_NAMES[CATEGORY.FOUR_ACES_KICKER] = 'FOUR ACES W/KICKER';
  CATEGORY_NAMES[CATEGORY.FOUR_ACES] = 'FOUR ACES';
  CATEGORY_NAMES[CATEGORY.FOUR_LOW_KICKER] = 'FOUR 2S-4S W/KICKER';
  CATEGORY_NAMES[CATEGORY.FOUR_LOW] = 'FOUR 2S, 3S OR 4S';
  CATEGORY_NAMES[CATEGORY.FOUR_5_TO_K] = 'FOUR 5S THRU KINGS';
  CATEGORY_NAMES[CATEGORY.FOUR_DEUCES] = 'FOUR DEUCES';
  CATEGORY_NAMES[CATEGORY.WILD_ROYAL_FLUSH] = 'WILD ROYAL FLUSH';
  CATEGORY_NAMES[CATEGORY.FIVE_OF_A_KIND] = 'FIVE OF A KIND';
  CATEGORY_NAMES[CATEGORY.KINGS_OR_BETTER] = 'KINGS OR BETTER';
  CATEGORY_NAMES[CATEGORY.FOUR_LOW_ACE_KICKER] = 'FOUR 2S-4S W/ACE';

  /*
   * Paytable "family" controls which evaluator resolveCategory() dispatches to:
   *   'standard' - 52-card deck, no wilds. `quadRule` says how four-of-a-kind
   *                is split into pay tiers: 'flat' (one rate for any quad),
   *                'rank-tier' (Aces / 2s-4s / 5s-Ks), or 'kicker-tier'
   *                (also splits each of Aces and 2s-4s by whether the 5th
   *                card is a bonus-eligible kicker).
   *   'deuces'   - 52-card deck, the four 2s are wild.
   *   'jokers'   - 53-card deck (one Joker added), the Joker is wild.
   */
  var PAYTABLES = {
    'jacks-or-better-9-6': {
      id: 'jacks-or-better-9-6',
      name: 'JACKS OR BETTER',
      family: 'standard',
      quadRule: 'flat',
      deck: 52,
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
    },
    'bonus-poker-8-5': {
      id: 'bonus-poker-8-5',
      name: 'BONUS POKER',
      family: 'standard',
      quadRule: 'rank-tier',
      deck: 52,
      rows: [
        { category: CATEGORY.ROYAL_FLUSH, label: 'ROYAL FLUSH', pays: [250, 500, 750, 1000, 4000] },
        { category: CATEGORY.STRAIGHT_FLUSH, label: 'STRAIGHT FLUSH', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FOUR_ACES, label: '4 ACES', pays: [80, 160, 240, 320, 400] },
        { category: CATEGORY.FOUR_LOW, label: '4 2S, 3S OR 4S', pays: [40, 80, 120, 160, 200] },
        { category: CATEGORY.FOUR_5_TO_K, label: '4 5S THRU KS', pays: [25, 50, 75, 100, 125] },
        { category: CATEGORY.FULL_HOUSE, label: 'FULL HOUSE', pays: [8, 16, 24, 32, 40] },
        { category: CATEGORY.FLUSH, label: 'FLUSH', pays: [5, 10, 15, 20, 25] },
        { category: CATEGORY.STRAIGHT, label: 'STRAIGHT', pays: [4, 8, 12, 16, 20] },
        { category: CATEGORY.THREE_OF_A_KIND, label: '3 OF A KIND', pays: [3, 6, 9, 12, 15] },
        { category: CATEGORY.TWO_PAIR, label: 'TWO PAIR', pays: [1, 2, 3, 4, 5] },
        { category: CATEGORY.JACKS_OR_BETTER, label: 'JACKS OR BETTER', pays: [1, 2, 3, 4, 5] }
      ]
    },
    'bonus-poker-deluxe-9-6': {
      id: 'bonus-poker-deluxe-9-6',
      name: 'BONUS POKER DELUXE',
      family: 'standard',
      quadRule: 'flat',
      deck: 52,
      rows: [
        { category: CATEGORY.ROYAL_FLUSH, label: 'ROYAL FLUSH', pays: [250, 500, 750, 1000, 4000] },
        { category: CATEGORY.STRAIGHT_FLUSH, label: 'STRAIGHT FLUSH', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FOUR_OF_A_KIND, label: '4 OF A KIND', pays: [80, 160, 240, 320, 400] },
        { category: CATEGORY.FULL_HOUSE, label: 'FULL HOUSE', pays: [9, 18, 27, 36, 45] },
        { category: CATEGORY.FLUSH, label: 'FLUSH', pays: [6, 12, 18, 24, 30] },
        { category: CATEGORY.STRAIGHT, label: 'STRAIGHT', pays: [4, 8, 12, 16, 20] },
        { category: CATEGORY.THREE_OF_A_KIND, label: '3 OF A KIND', pays: [3, 6, 9, 12, 15] },
        { category: CATEGORY.TWO_PAIR, label: 'TWO PAIR', pays: [1, 2, 3, 4, 5] },
        { category: CATEGORY.JACKS_OR_BETTER, label: 'JACKS OR BETTER', pays: [1, 2, 3, 4, 5] }
      ]
    },
    'double-double-bonus-9-6': {
      id: 'double-double-bonus-9-6',
      name: 'DOUBLE DOUBLE BONUS',
      family: 'standard',
      quadRule: 'kicker-tier',
      deck: 52,
      rows: [
        { category: CATEGORY.ROYAL_FLUSH, label: 'ROYAL FLUSH', pays: [250, 500, 750, 1000, 4000] },
        { category: CATEGORY.STRAIGHT_FLUSH, label: 'STRAIGHT FLUSH', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FOUR_ACES_KICKER, label: '4 ACES W/2-4', pays: [400, 800, 1200, 1600, 2000] },
        { category: CATEGORY.FOUR_LOW_KICKER, label: '4 2-4 W/A-4', pays: [160, 320, 480, 640, 800] },
        { category: CATEGORY.FOUR_ACES, label: '4 ACES', pays: [160, 320, 480, 640, 800] },
        { category: CATEGORY.FOUR_LOW, label: '4 2S, 3S OR 4S', pays: [80, 160, 240, 320, 400] },
        { category: CATEGORY.FOUR_5_TO_K, label: '4 5S THRU KS', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FULL_HOUSE, label: 'FULL HOUSE', pays: [9, 18, 27, 36, 45] },
        { category: CATEGORY.FLUSH, label: 'FLUSH', pays: [6, 12, 18, 24, 30] },
        { category: CATEGORY.STRAIGHT, label: 'STRAIGHT', pays: [4, 8, 12, 16, 20] },
        { category: CATEGORY.THREE_OF_A_KIND, label: '3 OF A KIND', pays: [3, 6, 9, 12, 15] },
        { category: CATEGORY.TWO_PAIR, label: 'TWO PAIR', pays: [1, 2, 3, 4, 5] },
        { category: CATEGORY.JACKS_OR_BETTER, label: 'JACKS OR BETTER', pays: [1, 2, 3, 4, 5] }
      ]
    },
    'triple-double-bonus-9-7': {
      id: 'triple-double-bonus-9-7',
      name: 'TRIPLE DOUBLE BONUS',
      family: 'standard',
      quadRule: 'kicker-tier',
      deck: 52,
      rows: [
        { category: CATEGORY.ROYAL_FLUSH, label: 'ROYAL FLUSH', pays: [250, 500, 750, 1000, 4000] },
        { category: CATEGORY.STRAIGHT_FLUSH, label: 'STRAIGHT FLUSH', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FOUR_ACES_KICKER, label: '4 ACES W/2-4', pays: [800, 1600, 2400, 3200, 4000] },
        { category: CATEGORY.FOUR_LOW_KICKER, label: '4 2-4 W/A-4', pays: [400, 800, 1200, 1600, 2000] },
        { category: CATEGORY.FOUR_ACES, label: '4 ACES', pays: [160, 320, 480, 640, 800] },
        { category: CATEGORY.FOUR_LOW, label: '4 2S, 3S OR 4S', pays: [80, 160, 240, 320, 400] },
        { category: CATEGORY.FOUR_5_TO_K, label: '4 5S THRU KS', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FULL_HOUSE, label: 'FULL HOUSE', pays: [9, 18, 27, 36, 45] },
        { category: CATEGORY.FLUSH, label: 'FLUSH', pays: [7, 14, 21, 28, 35] },
        { category: CATEGORY.STRAIGHT, label: 'STRAIGHT', pays: [4, 8, 12, 16, 20] },
        { category: CATEGORY.THREE_OF_A_KIND, label: '3 OF A KIND', pays: [2, 4, 6, 8, 10] },
        { category: CATEGORY.TWO_PAIR, label: 'TWO PAIR', pays: [1, 2, 3, 4, 5] },
        { category: CATEGORY.JACKS_OR_BETTER, label: 'JACKS OR BETTER', pays: [1, 2, 3, 4, 5] }
      ]
    },
    /*
     * Approximation: real-money Triple Triple Bonus Poker adds a further
     * "kicker suited to the quad" super-tier on top of the rank/kicker tiers
     * modeled here. That suit-matching rule is not faithfully reproduced —
     * this paytable reuses the same kicker-tier mechanic as Double/Triple
     * Double Bonus with its own (higher top-end, lower common-hand) pay
     * amounts, giving it a distinct identity without asserting an exact
     * casino paytable. See the README for details.
     */
    'triple-triple-bonus': {
      id: 'triple-triple-bonus',
      name: 'TRIPLE TRIPLE BONUS',
      family: 'standard',
      quadRule: 'kicker-tier-ttb',
      deck: 52,
      rows: [
        { category: CATEGORY.ROYAL_FLUSH, label: 'ROYAL FLUSH', pays: [250, 500, 750, 1000, 4000] },
        { category: CATEGORY.STRAIGHT_FLUSH, label: 'STRAIGHT FLUSH', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FOUR_ACES_KICKER, label: '4 ACES W/2-4', pays: [800, 1600, 2400, 3200, 4000] },
        { category: CATEGORY.FOUR_LOW_ACE_KICKER, label: '4 2-4 W/ACE', pays: [800, 1600, 2400, 3200, 4000] },
        { category: CATEGORY.FOUR_LOW_KICKER, label: '4 2-4 W/2-4', pays: [400, 800, 1200, 1600, 2000] },
        { category: CATEGORY.FOUR_ACES, label: '4 ACES', pays: [160, 320, 480, 640, 800] },
        { category: CATEGORY.FOUR_LOW, label: '4 2S, 3S OR 4S', pays: [80, 160, 240, 320, 400] },
        { category: CATEGORY.FOUR_5_TO_K, label: '4 5S THRU KS', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FULL_HOUSE, label: 'FULL HOUSE', pays: [9, 18, 27, 36, 45] },
        { category: CATEGORY.FLUSH, label: 'FLUSH', pays: [5, 10, 15, 20, 25] },
        { category: CATEGORY.STRAIGHT, label: 'STRAIGHT', pays: [3, 6, 9, 12, 15] },
        { category: CATEGORY.THREE_OF_A_KIND, label: '3 OF A KIND', pays: [2, 4, 6, 8, 10] },
        { category: CATEGORY.TWO_PAIR, label: 'TWO PAIR', pays: [1, 2, 3, 4, 5] },
        { category: CATEGORY.JACKS_OR_BETTER, label: 'JACKS OR BETTER', pays: [1, 2, 3, 4, 5] }
      ]
    },
    /*
     * Full-pay ("Not So Ugly Ducks") Deuces Wild. Unlike the Jacks-or-Better
     * family, the royal flush and four-deuces awards scale proportionally
     * with bet — there is no disproportionate 5-coin jackpot jump.
     */
    'deuces-wild-nsu-100': {
      id: 'deuces-wild-nsu-100',
      name: 'DEUCES WILD',
      family: 'deuces',
      deck: 52,
      rows: [
        { category: CATEGORY.ROYAL_FLUSH, label: 'ROYAL FLUSH', pays: [250, 500, 750, 1000, 1250] },
        { category: CATEGORY.FOUR_DEUCES, label: '4 DEUCES', pays: [200, 400, 600, 800, 1000] },
        { category: CATEGORY.WILD_ROYAL_FLUSH, label: 'WILD ROYAL FLUSH', pays: [25, 50, 75, 100, 125] },
        { category: CATEGORY.FIVE_OF_A_KIND, label: '5 OF A KIND', pays: [15, 30, 45, 60, 75] },
        { category: CATEGORY.STRAIGHT_FLUSH, label: 'STRAIGHT FLUSH', pays: [9, 18, 27, 36, 45] },
        { category: CATEGORY.FOUR_OF_A_KIND, label: '4 OF A KIND', pays: [5, 10, 15, 20, 25] },
        { category: CATEGORY.FULL_HOUSE, label: 'FULL HOUSE', pays: [3, 6, 9, 12, 15] },
        { category: CATEGORY.FLUSH, label: 'FLUSH', pays: [2, 4, 6, 8, 10] },
        { category: CATEGORY.STRAIGHT, label: 'STRAIGHT', pays: [2, 4, 6, 8, 10] },
        { category: CATEGORY.THREE_OF_A_KIND, label: '3 OF A KIND', pays: [1, 2, 3, 4, 5] }
      ]
    },
    /* Joker Poker, "Kings or Better" — one Joker added to the deck as a wild. */
    'jokers-wild-kings-or-better': {
      id: 'jokers-wild-kings-or-better',
      name: 'JOKERS WILD',
      family: 'jokers',
      deck: 53,
      rows: [
        { category: CATEGORY.ROYAL_FLUSH, label: 'ROYAL FLUSH', pays: [250, 500, 750, 1000, 1250] },
        { category: CATEGORY.FIVE_OF_A_KIND, label: '5 OF A KIND', pays: [200, 400, 600, 800, 1000] },
        { category: CATEGORY.WILD_ROYAL_FLUSH, label: 'WILD ROYAL FLUSH', pays: [100, 200, 300, 400, 500] },
        { category: CATEGORY.STRAIGHT_FLUSH, label: 'STRAIGHT FLUSH', pays: [50, 100, 150, 200, 250] },
        { category: CATEGORY.FOUR_OF_A_KIND, label: '4 OF A KIND', pays: [20, 40, 60, 80, 100] },
        { category: CATEGORY.FULL_HOUSE, label: 'FULL HOUSE', pays: [7, 14, 21, 28, 35] },
        { category: CATEGORY.FLUSH, label: 'FLUSH', pays: [5, 10, 15, 20, 25] },
        { category: CATEGORY.STRAIGHT, label: 'STRAIGHT', pays: [3, 6, 9, 12, 15] },
        { category: CATEGORY.THREE_OF_A_KIND, label: '3 OF A KIND', pays: [2, 4, 6, 8, 10] },
        { category: CATEGORY.TWO_PAIR, label: 'TWO PAIR', pays: [1, 2, 3, 4, 5] },
        { category: CATEGORY.KINGS_OR_BETTER, label: 'KINGS OR BETTER', pays: [1, 2, 3, 4, 5] }
      ]
    }
  };

  function makeCard(rank, suit) { return (rank << 2) | suit; }
  function rankOf(card) { return card === JOKER ? 13 : card >> 2; }
  function suitOf(card) { return card === JOKER ? -1 : card & 3; }
  function isJoker(card) { return card === JOKER; }

  function cardToString(card) {
    if (card === JOKER) return 'JK';
    return RANK_CHARS[rankOf(card)] + SUIT_CHARS[suitOf(card)];
  }

  function cardToPretty(card) {
    if (card === JOKER) return 'JOKER';
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
  var JOKER_TOKENS = { 'JOKER': 1, 'JK': 1, 'WILD': 1, '🃏': 1 };

  /*
   * Accepts:
   *  - an integer 0..52 (native encoding; 52 = Joker)
   *  - a string: "AS", "as", "10H", "Th", "K♥", "10 of hearts", "JOKER"/"JK"
   *  - an object: { rank: 'A'|'10'|10|14, suit: 'S'|'spades'|'♠' },
   *    or { rank: 'JOKER' } / { joker: true } for the Joker
   */
  function parseCard(input) {
    if (typeof input === 'number' && Number.isInteger(input)) {
      if (input < 0 || input > 52) throw new Error('Card integer out of range: ' + input);
      return input;
    }
    if (typeof input === 'string') {
      var s = input.trim().toUpperCase().replace(/\s+OF\s+/, '');
      if (s in JOKER_TOKENS) return JOKER;
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
      if (input.joker) return JOKER;
      var rankKey = String(input.rank).trim().toUpperCase();
      if (rankKey in JOKER_TOKENS) return JOKER;
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

  function fitsAnyStraightWindow(mask) {
    if ((mask & ~WHEEL_MASK) === 0) return true;
    for (var s = 0; s <= 8; s++) {
      if ((mask & ~(31 << s)) === 0) return true;
    }
    return false;
  }

  var rankCountScratch = new Uint8Array(13);

  /*
   * Classify a 5-card, no-wild hand. Returns the base CATEGORY plus, for
   * four-of-a-kind and one-pair hands, the extra rank detail needed to apply
   * a paytable's kicker rules or a non-Jacks-or-Better pair threshold.
   */
  function classifyDetailed(hand) {
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
      var straight = fitsAnyStraightWindow(rankMask);
      if (straight && flush) {
        return { category: rankMask === ROYAL_MASK ? CATEGORY.ROYAL_FLUSH : CATEGORY.STRAIGHT_FLUSH };
      }
      if (flush) return { category: CATEGORY.FLUSH };
      if (straight) return { category: CATEGORY.STRAIGHT };
      return { category: CATEGORY.NOTHING };
    }

    var pairs = 0, trips = false, quadRank = -1, pairRank = -1, highPair = false;
    for (var r2 = 0; r2 < 13; r2++) {
      var n = rc[r2];
      if (n === 2) { pairs++; pairRank = r2; if (r2 >= 9) highPair = true; }
      else if (n === 3) trips = true;
      else if (n === 4) quadRank = r2;
    }
    if (quadRank >= 0) {
      var kickerRank = -1;
      for (var r3 = 0; r3 < 13; r3++) { if (rc[r3] === 1) { kickerRank = r3; break; } }
      return { category: CATEGORY.FOUR_OF_A_KIND, quadRank: quadRank, kickerRank: kickerRank };
    }
    if (trips && pairs === 1) return { category: CATEGORY.FULL_HOUSE };
    if (trips) return { category: CATEGORY.THREE_OF_A_KIND };
    if (pairs === 2) return { category: CATEGORY.TWO_PAIR };
    if (highPair) return { category: CATEGORY.JACKS_OR_BETTER, pairRank: pairRank };
    if (pairs === 1) return { category: CATEGORY.NOTHING, pairRank: pairRank };
    return { category: CATEGORY.NOTHING };
  }

  /* Evaluate a 5-card, no-wild hand. Returns a base CATEGORY value (0-9). */
  function evaluate(hand) {
    return classifyDetailed(hand).category;
  }

  function resolveStandardCategory(hand, paytable) {
    var d = classifyDetailed(hand);
    if (d.category !== CATEGORY.FOUR_OF_A_KIND) return d.category;
    var rule = paytable.quadRule || 'flat';
    if (rule === 'flat') return CATEGORY.FOUR_OF_A_KIND;
    var isAceQuad = d.quadRank === ACE_RANK;
    var isLowQuad = d.quadRank <= 2; /* ranks 2, 3, 4 */
    if (rule === 'rank-tier') {
      if (isAceQuad) return CATEGORY.FOUR_ACES;
      if (isLowQuad) return CATEGORY.FOUR_LOW;
      return CATEGORY.FOUR_5_TO_K;
    }
    var bonusKicker = d.kickerRank === ACE_RANK || d.kickerRank <= 2;
    if (rule === 'kicker-tier-ttb') {
      /* Triple Triple Bonus: a low quad with an Ace kicker matches the top Aces-w/-kicker tier. */
      if (isAceQuad) return bonusKicker ? CATEGORY.FOUR_ACES_KICKER : CATEGORY.FOUR_ACES;
      if (isLowQuad) {
        if (d.kickerRank === ACE_RANK) return CATEGORY.FOUR_LOW_ACE_KICKER;
        return d.kickerRank <= 2 ? CATEGORY.FOUR_LOW_KICKER : CATEGORY.FOUR_LOW;
      }
      return CATEGORY.FOUR_5_TO_K;
    }
    /* 'kicker-tier' (Double Double Bonus, Triple Double Bonus) */
    if (isAceQuad) return bonusKicker ? CATEGORY.FOUR_ACES_KICKER : CATEGORY.FOUR_ACES;
    if (isLowQuad) return bonusKicker ? CATEGORY.FOUR_LOW_KICKER : CATEGORY.FOUR_LOW;
    return CATEGORY.FOUR_5_TO_K;
  }

  /*
   * Shared feasibility info for wild-card evaluation: given the non-wild
   * ("natural") cards left in a hand, compute what's needed to check whether
   * various categories are achievable once wilds are assigned optimally.
   */
  function wildFeasibility(naturals) {
    var rankCounts = new Array(13).fill(0);
    var natMask = 0;
    var sameSuit = true;
    var firstSuit = naturals.length ? suitOf(naturals[0]) : -1;
    naturals.forEach(function (c) {
      var r = rankOf(c);
      rankCounts[r]++;
      natMask |= 1 << r;
      if (suitOf(c) !== firstSuit) sameSuit = false;
    });
    var distinctRanks = [];
    for (var r2 = 0; r2 < 13; r2++) if (rankCounts[r2] > 0) distinctRanks.push(r2);
    var maxCount = 0;
    distinctRanks.forEach(function (r) { if (rankCounts[r] > maxCount) maxCount = rankCounts[r]; });
    return {
      rankCounts: rankCounts,
      distinctRanks: distinctRanks,
      g: distinctRanks.length,
      maxCount: maxCount,
      sameSuit: sameSuit,
      natMask: natMask,
      allDistinctRank: distinctRanks.length === naturals.length
    };
  }

  function canFormTwoGroups(info, sizeA, sizeB) {
    if (info.g > 2) return false;
    var c1 = info.g >= 1 ? info.rankCounts[info.distinctRanks[0]] : 0;
    var c2 = info.g >= 2 ? info.rankCounts[info.distinctRanks[1]] : 0;
    var hi = Math.max(c1, c2), lo = Math.min(c1, c2);
    return hi <= sizeA && lo <= sizeB;
  }

  /* Deuces Wild: the four 2s are wild. Delegates to the plain evaluator when no deuces are held. */
  function evaluateDeuces(hand) {
    var naturals = [], wildCount = 0;
    hand.forEach(function (c) { if (rankOf(c) === DEUCE_RANK) wildCount++; else naturals.push(c); });

    if (wildCount === 4) return CATEGORY.FOUR_DEUCES;

    if (wildCount === 0) {
      var base = evaluate(hand);
      switch (base) {
        case CATEGORY.ROYAL_FLUSH: case CATEGORY.STRAIGHT_FLUSH: case CATEGORY.FOUR_OF_A_KIND:
        case CATEGORY.FULL_HOUSE: case CATEGORY.FLUSH: case CATEGORY.STRAIGHT:
        case CATEGORY.THREE_OF_A_KIND:
          return base;
        default:
          return CATEGORY.NOTHING; /* Deuces Wild pays nothing below three of a kind. */
      }
    }

    var info = wildFeasibility(naturals);
    if (info.allDistinctRank && info.sameSuit && (info.natMask & ~ROYAL_MASK) === 0) {
      return CATEGORY.WILD_ROYAL_FLUSH;
    }
    if (info.g === 1) return CATEGORY.FIVE_OF_A_KIND;
    if (info.allDistinctRank && info.sameSuit && fitsAnyStraightWindow(info.natMask)) {
      return CATEGORY.STRAIGHT_FLUSH;
    }
    if (info.maxCount + wildCount >= 4) return CATEGORY.FOUR_OF_A_KIND;
    if (canFormTwoGroups(info, 3, 2)) return CATEGORY.FULL_HOUSE;
    if (info.sameSuit) return CATEGORY.FLUSH;
    if (info.allDistinctRank && fitsAnyStraightWindow(info.natMask)) return CATEGORY.STRAIGHT;
    if (info.maxCount + wildCount >= 3) return CATEGORY.THREE_OF_A_KIND;
    return CATEGORY.NOTHING;
  }

  /* Jokers Wild ("Kings or Better"): one Joker in a 53-card deck is wild. */
  function evaluateJokersWild(hand) {
    var naturals = [], wildCount = 0;
    hand.forEach(function (c) { if (isJoker(c)) wildCount++; else naturals.push(c); });

    if (wildCount === 0) {
      var d = classifyDetailed(hand);
      if (d.category === CATEGORY.JACKS_OR_BETTER) {
        return d.pairRank >= KING_RANK ? CATEGORY.KINGS_OR_BETTER : CATEGORY.NOTHING;
      }
      return d.category;
    }

    var info = wildFeasibility(naturals);
    if (info.allDistinctRank && info.sameSuit && (info.natMask & ~ROYAL_MASK) === 0) {
      return CATEGORY.WILD_ROYAL_FLUSH;
    }
    if (info.g === 1) return CATEGORY.FIVE_OF_A_KIND;
    if (info.allDistinctRank && info.sameSuit && fitsAnyStraightWindow(info.natMask)) {
      return CATEGORY.STRAIGHT_FLUSH;
    }
    if (info.maxCount + wildCount >= 4) return CATEGORY.FOUR_OF_A_KIND;
    if (canFormTwoGroups(info, 3, 2)) return CATEGORY.FULL_HOUSE;
    if (info.sameSuit) return CATEGORY.FLUSH;
    if (info.allDistinctRank && fitsAnyStraightWindow(info.natMask)) return CATEGORY.STRAIGHT;
    if (info.maxCount + wildCount >= 3) return CATEGORY.THREE_OF_A_KIND;
    if (info.distinctRanks.indexOf(KING_RANK) >= 0 || info.distinctRanks.indexOf(ACE_RANK) >= 0) {
      return CATEGORY.KINGS_OR_BETTER;
    }
    return CATEGORY.NOTHING;
  }

  /* Resolve the paytable-specific category (quad tiers, wild games, etc.) for a 5-card hand. */
  function resolveCategory(hand, paytable) {
    var family = paytable.family || 'standard';
    if (family === 'deuces') return evaluateDeuces(hand);
    if (family === 'jokers') return evaluateJokersWild(hand);
    return resolveStandardCategory(hand, paytable);
  }

  /* A fast, paytable-bound evaluator function for use in hot analysis loops. */
  function makeEvaluator(paytable) {
    var family = paytable.family || 'standard';
    if (family === 'deuces') return evaluateDeuces;
    if (family === 'jokers') return evaluateJokersWild;
    return function (hand) { return resolveStandardCategory(hand, paytable); };
  }

  /* Total coins returned for a category at a bet of 1..5 coins. */
  function payout(category, bet, paytable) {
    var rows = paytable.rows;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].category === category) return rows[i].pays[bet - 1];
    }
    return 0;
  }

  var PAY_ARRAY_SIZE = 32;

  function buildPayArray(bet, paytable) {
    var pays = new Float64Array(PAY_ARRAY_SIZE);
    paytable.rows.forEach(function (row) { pays[row.category] = row.pays[bet - 1]; });
    return pays;
  }

  /*
   * Exact EV (in coins, for the given total bet) of holding `held` out of a
   * dealt hand, drawing replacements from `deck` (the unseen cards).
   */
  function holdEV(held, deck, pays, evalFn) {
    var need = 5 - held.length;
    var h = [0, 0, 0, 0, 0];
    for (var i = 0; i < held.length; i++) h[i] = held[i];
    var D = deck.length;
    var total = 0;
    var count = 0;
    var a, b, c, d, e;
    switch (need) {
      case 0:
        return pays[evalFn(h)];
      case 1:
        for (a = 0; a < D; a++) {
          h[4] = deck[a];
          total += pays[evalFn(h)]; count++;
        }
        break;
      case 2:
        for (a = 0; a < D - 1; a++) {
          h[3] = deck[a];
          for (b = a + 1; b < D; b++) {
            h[4] = deck[b];
            total += pays[evalFn(h)]; count++;
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
              total += pays[evalFn(h)]; count++;
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
                total += pays[evalFn(h)]; count++;
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
                  total += pays[evalFn(h)]; count++;
                }
              }
            }
          }
        }
        break;
    }
    return total / count;
  }

  /* `includeJoker` widens the deck to 53 cards (0..52) for Jokers Wild. */
  function remainingDeck(hand, includeJoker) {
    var inHand = {};
    hand.forEach(function (c) { inHand[c] = true; });
    var deck = [];
    var max = includeJoker ? 52 : 51;
    for (var c = 0; c <= max; c++) if (!inHand[c]) deck.push(c);
    return deck;
  }

  function analyzeMask(hand, deck, mask, pays, evalFn) {
    var held = [];
    var indices = [];
    for (var i = 0; i < 5; i++) {
      if (mask & (1 << i)) { held.push(hand[i]); indices.push(i); }
    }
    return { mask: mask, heldIndices: indices, heldCards: held, ev: holdEV(held, deck, pays, evalFn) };
  }

  /*
   * Exact EV of all 32 hold combinations for a dealt hand, sorted best first.
   * `hand` is 5 card ints; EV values are total coins returned for `bet` coins.
   */
  function analyzeHolds(hand, bet, paytable) {
    var deck = remainingDeck(hand, paytable.deck === 53);
    var pays = buildPayArray(bet, paytable);
    var evalFn = makeEvaluator(paytable);
    var results = [];
    for (var mask = 0; mask < 32; mask++) {
      results.push(analyzeMask(hand, deck, mask, pays, evalFn));
    }
    results.sort(function (x, y) { return y.ev - x.ev; });
    return results;
  }

  /*
   * Same as analyzeHolds but spread across macrotasks (one hold combination per
   * chunk) so the UI never blocks. Returns { promise, cancel }.
   */
  function analyzeHoldsAsync(hand, bet, paytable) {
    var deck = remainingDeck(hand, paytable.deck === 53);
    var pays = buildPayArray(bet, paytable);
    var evalFn = makeEvaluator(paytable);
    var results = [];
    var cancelled = false;
    var promise = new Promise(function (resolve, reject) {
      var mask = 0;
      function step() {
        if (cancelled) { reject(new Error('cancelled')); return; }
        var deadline = Date.now() + 30;
        while (mask < 32 && Date.now() < deadline) {
          results.push(analyzeMask(hand, deck, mask, pays, evalFn));
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

  function shuffledDeck(exclude, rng, includeJoker) {
    rng = rng || Math.random;
    var inHand = {};
    (exclude || []).forEach(function (c) { inHand[c] = true; });
    var deck = [];
    var max = includeJoker ? 52 : 51;
    for (var c = 0; c <= max; c++) if (!inHand[c]) deck.push(c);
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
    JOKER: JOKER,
    makeCard: makeCard,
    rankOf: rankOf,
    suitOf: suitOf,
    isJoker: isJoker,
    cardToString: cardToString,
    cardToPretty: cardToPretty,
    parseCard: parseCard,
    parseHand: parseHand,
    evaluate: evaluate,
    resolveCategory: resolveCategory,
    makeEvaluator: makeEvaluator,
    payout: payout,
    remainingDeck: remainingDeck,
    analyzeHolds: analyzeHolds,
    analyzeHoldsAsync: analyzeHoldsAsync,
    shuffledDeck: shuffledDeck
  };
});
