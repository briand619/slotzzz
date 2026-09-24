/*
 * Game catalog and feature rules for the multi-play app: which paytables each
 * feature offers, Ultimate X multipliers and strategy, Dream Card odds.
 * Paytable data comes from tables.js (generated from Wizard of Odds).
 *
 * Works in the browser (after engine.js and tables.js) and in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../../js/engine.js'), require('./tables.js'));
  } else {
    root.VPMFeatures = factory(root.VPEngine, root.VPM_TABLES);
  }
})(typeof self !== 'undefined' ? self : this, function (E, T) {
  'use strict';

  var C = E.CATEGORY;

  var FEATURES = [
    { key: 'none', label: 'NO FEATURE', costMultiplier: 1 },
    // Both features cost double: 10 coins per hand, with wins paid on the 5-coin paytable.
    { key: 'ultimate-x', label: 'ULTIMATE X', costMultiplier: 2 },
    { key: 'dream-card', label: 'DREAM CARD', costMultiplier: 2 }
  ];

  var LABELS = {
    ROYAL_FLUSH: 'ROYAL FLUSH',
    STRAIGHT_FLUSH: 'STRAIGHT FLUSH',
    FOUR_OF_A_KIND: '4 OF A KIND',
    FOUR_ACES_KICKER: '4 ACES W/2-4',
    FOUR_LOW_KICKER: '4 2-4 W/A-4',
    FOUR_ACES: '4 ACES',
    FOUR_LOW: '4 2S, 3S OR 4S',
    FOUR_5_TO_K: '4 5S THRU KS',
    FOUR_DEUCES: '4 DEUCES',
    WILD_ROYAL_FLUSH: 'WILD ROYAL FLUSH',
    FIVE_OF_A_KIND: '5 OF A KIND',
    FULL_HOUSE: 'FULL HOUSE',
    FLUSH: 'FLUSH',
    STRAIGHT: 'STRAIGHT',
    THREE_OF_A_KIND: '3 OF A KIND',
    TWO_PAIR: 'TWO PAIR',
    JACKS_OR_BETTER: 'JACKS OR BETTER',
    KINGS_OR_BETTER: 'KINGS OR BETTER'
  };

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /* WoO lists pays per coin at max bet; the royal's 800 is its 5-coin jump (250 per coin below max). */
  function paysByBet(category, perCoin) {
    if (category === 'ROYAL_FLUSH' && perCoin === 800) return [250, 500, 750, 1000, 4000];
    return [perCoin, perCoin * 2, perCoin * 3, perCoin * 4, perCoin * 5];
  }

  function buildPaytable(feature, t, prefix) {
    return {
      id: prefix + '-' + slug(t.game) + '-' + slug(t.variant),
      name: t.game + ' ' + t.variant,
      game: t.game,
      variant: t.variant,
      feature: feature,
      family: t.family,
      quadRule: t.quadRule,
      minPair: t.minPair,
      deck: t.deck || 52,
      rows: t.rows.map(function (r) {
        return { category: C[r[0]], label: LABELS[r[0]], pays: paysByBet(r[0], r[1]) };
      }),
      multipliers: t.multipliers ? convertMultipliers(t.multipliers) : null,
      returns: t.returns || null,             // Ultimate X: WoO return by hand count
      baseReturn: t.baseReturn || null,       // Dream Card: WoO return without / with the feature
      dreamCardReturn: t.dreamCardReturn || null
    };
  }

  function convertMultipliers(m) {
    var out = {};
    Object.keys(m).forEach(function (n) {
      out[n] = {};
      Object.keys(m[n]).forEach(function (cat) { out[n][C[cat]] = m[n][cat]; });
    });
    return out;
  }

  // The classic app's full-pay tables, played without a feature.
  var CLASSIC = [
    { key: 'jacks-or-better-9-6', game: 'JACKS OR BETTER', variant: '9/6' },
    { key: 'bonus-poker-8-5', game: 'BONUS POKER', variant: '8/5' },
    { key: 'super-aces-bonus-poker', game: 'SUPER ACES BONUS POKER', variant: '' },
    { key: 'bonus-poker-deluxe-9-6', game: 'BONUS POKER DELUXE', variant: '9/6' },
    { key: 'double-double-bonus-9-6', game: 'DOUBLE DOUBLE BONUS', variant: '9/6' },
    { key: 'triple-double-bonus-9-7', game: 'TRIPLE DOUBLE BONUS', variant: '9/7' },
    { key: 'triple-triple-bonus', game: 'TRIPLE TRIPLE BONUS', variant: '' },
    { key: 'deuces-wild-full-pay', game: 'DEUCES WILD', variant: 'FULL PAY' },
    { key: 'jokers-wild-kings-or-better', game: 'JOKERS WILD', variant: '' }
  ];

  var catalog = { none: [], 'ultimate-x': [], 'dream-card': [] };
  var byId = {};

  CLASSIC.forEach(function (c) {
    var src = E.PAYTABLES[c.key];
    var pt = {};
    Object.keys(src).forEach(function (k) { pt[k] = src[k]; });
    pt.game = c.game;
    pt.variant = c.variant;
    pt.feature = 'none';
    catalog.none.push(pt);
  });
  T.ultimateX.forEach(function (t) { catalog['ultimate-x'].push(buildPaytable('ultimate-x', t, 'ux')); });
  T.dreamCard.tables.forEach(function (t) { catalog['dream-card'].push(buildPaytable('dream-card', t, 'dc')); });
  Object.keys(catalog).forEach(function (f) { catalog[f].forEach(function (pt) { byId[pt.id] = pt; }); });

  /* [{ game, paytables: [...] }] for a feature, in menu order. */
  function games(feature) {
    var out = [];
    catalog[feature].forEach(function (pt) {
      var last = out[out.length - 1];
      if (last && last.game === pt.game) last.paytables.push(pt);
      else out.push({ game: pt.game, paytables: [pt] });
    });
    return out;
  }

  function feature(key) {
    return FEATURES.filter(function (f) { return f.key === key; })[0] || null;
  }

  /* Multiplier a win earns for the same hand position's next deal (1 = none). */
  function uxMultiplier(paytable, category, handCount) {
    if (category === C.NOTHING) return 1;
    var m = paytable.multipliers[handCount][category];
    return m || 1;
  }

  /*
   * Wizard of Odds' Ultimate X strategy method: rank holds as if each hand
   * paid 2 x (base win) + (multiplier earned) - 1, per coin. It gives a
   * single strategy per game that he reports as near-optimal, even though
   * truly optimal play shifts with the multipliers already in play. Scaled
   * by 5 here so values read like coins at a 5-coin bet.
   */
  function uxStrategyPaytable(paytable, handCount) {
    return {
      id: paytable.id + '-strategy-' + handCount,
      family: paytable.family,
      quadRule: paytable.quadRule,
      minPair: paytable.minPair,
      deck: paytable.deck,
      rows: paytable.rows.map(function (r) {
        var v = 2 * r.pays[4] + 5 * (uxMultiplier(paytable, r.category, handCount) - 1);
        return { category: r.category, label: r.label, pays: [v, v, v, v, v] };
      })
    };
  }

  function dreamCardProbability(paytable) {
    return T.dreamCard.probability[paytable.game];
  }

  return {
    FEATURES: FEATURES,
    feature: feature,
    games: games,
    paytables: function (f) { return catalog[f].slice(); },
    paytableById: function (id) { return byId[id] || null; },
    defaultPaytable: function (f) { return catalog[f][0]; },
    uxMultiplier: uxMultiplier,
    uxStrategyPaytable: uxStrategyPaytable,
    dreamCardProbability: dreamCardProbability
  };
});
