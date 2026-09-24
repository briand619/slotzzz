/*
 * Feature paytables for the multi-play app, generated from the Wizard of Odds
 * tables (retrieved 2026-09-24):
 *   https://wizardofodds.com/games/video-poker/tables/ultimate-x/
 *   https://wizardofodds.com/games/video-poker/tables/dream-card/
 * Pays are per coin at max bet, as WoO lists them (royal 800 = 4000 for 5
 * coins). Returns are WoO's published figures, shown in the paytable overlay.
 * Omitted: Ultimate X Bonus Deuces (needs hand categories the engine lacks)
 * and Dream Card Deuces 20/11/9/4/4/3 (WoO names it but prints no table).
 */
(function (root, factory) {
  var tables = factory();
  if (typeof module === 'object' && module.exports) module.exports = tables;
  else root.VPM_TABLES = tables;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    ultimateX: [
      { game: "JACKS OR BETTER", variant: "8/6", family: "standard", quadRule: "flat",
        returns: {"3": 0.992978, "5": 0.994008, "10": 0.99422},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 25], ["FULL_HOUSE", 8], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 7, "STRAIGHT_FLUSH": 7, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "JACKS OR BETTER", variant: "8/5", family: "standard", quadRule: "flat",
        returns: {"3": 0.97873, "5": 0.979671, "10": 0.979795},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 25], ["FULL_HOUSE", 8], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 7, "STRAIGHT_FLUSH": 7, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "JACKS OR BETTER", variant: "7/5", family: "standard", quadRule: "flat",
        returns: {"3": 0.967211, "5": 0.968142, "10": 0.968267},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 25], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 7, "STRAIGHT_FLUSH": 7, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "JACKS OR BETTER", variant: "6/5", family: "standard", quadRule: "flat",
        returns: {"3": 0.955694, "5": 0.956615, "10": 0.95674},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 25], ["FULL_HOUSE", 6], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 7, "STRAIGHT_FLUSH": 7, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "BONUS POKER", variant: "7/5", family: "standard", quadRule: "rank-tier",
        returns: {"3": 0.992828, "5": 0.993408, "10": 0.994034},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 80], ["FOUR_LOW", 40], ["FOUR_5_TO_K", 25], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "BONUS POKER", variant: "6/5", family: "standard", quadRule: "rank-tier",
        returns: {"3": 0.981242, "5": 0.981817, "10": 0.982439},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 80], ["FOUR_LOW", 40], ["FOUR_5_TO_K", 25], ["FULL_HOUSE", 6], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "BONUS POKER DELUXE", variant: "8/6", family: "standard", quadRule: "flat",
        returns: {"3": 0.995712, "5": 0.996777, "10": 0.997022},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 80], ["FULL_HOUSE", 8], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 7, "STRAIGHT_FLUSH": 7, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "BONUS POKER DELUXE", variant: "8/5", family: "standard", quadRule: "flat",
        returns: {"3": 0.981052, "5": 0.982014, "10": 0.982169},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 80], ["FULL_HOUSE", 8], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 7, "STRAIGHT_FLUSH": 7, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "BONUS POKER DELUXE", variant: "7/5", family: "standard", quadRule: "flat",
        returns: {"3": 0.969549, "5": 0.970502, "10": 0.970658},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 80], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 7, "STRAIGHT_FLUSH": 7, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "BONUS POKER DELUXE", variant: "6/5", family: "standard", quadRule: "flat",
        returns: {"3": 0.95805, "5": 0.958993, "10": 0.95915},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 80], ["FULL_HOUSE", 6], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 7, "STRAIGHT_FLUSH": 7, "FOUR_OF_A_KIND": 3, "FULL_HOUSE": 12, "FLUSH": 11, "STRAIGHT": 7, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "DOUBLE BONUS", variant: "9/6/5", family: "standard", quadRule: "rank-tier",
        returns: {"3": 0.988866, "5": 0.98959, "10": 0.990359},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 5], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "DOUBLE BONUS", variant: "10/6/4", family: "standard", quadRule: "rank-tier",
        returns: {"3": 0.984517, "5": 0.985227, "10": 0.985987},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 10], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "DOUBLE BONUS", variant: "9/6/4", family: "standard", quadRule: "rank-tier",
        returns: {"3": 0.973059, "5": 0.973764, "10": 0.974517},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "DOUBLE BONUS", variant: "9/5/4", family: "standard", quadRule: "rank-tier",
        returns: {"3": 0.959471, "5": 0.960118, "10": 0.96081},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "DOUBLE DOUBLE BONUS", variant: "9/6", family: "standard", quadRule: "kicker-tier",
        returns: {"3": 0.997261, "5": 0.997928, "10": 0.998663},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 400], ["FOUR_LOW_KICKER", 160], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES_KICKER": 4, "FOUR_LOW_KICKER": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "DOUBLE DOUBLE BONUS", variant: "9/5", family: "standard", quadRule: "kicker-tier",
        returns: {"3": 0.983633, "5": 0.984253, "10": 0.98494},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 400], ["FOUR_LOW_KICKER", 160], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES_KICKER": 4, "FOUR_LOW_KICKER": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "DOUBLE DOUBLE BONUS", variant: "8/5", family: "standard", quadRule: "kicker-tier",
        returns: {"3": 0.972266, "5": 0.972859, "10": 0.973521},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 400], ["FOUR_LOW_KICKER", 160], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 8], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES_KICKER": 4, "FOUR_LOW_KICKER": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "DOUBLE DOUBLE BONUS", variant: "7/5", family: "standard", quadRule: "kicker-tier",
        returns: {"3": 0.960969, "5": 0.961531, "10": 0.962175},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 400], ["FOUR_LOW_KICKER", 160], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_ACES_KICKER": 4, "FOUR_LOW_KICKER": 4, "FOUR_ACES": 4, "FOUR_LOW": 4, "FOUR_5_TO_K": 3, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "TRIPLE DOUBLE BONUS", variant: "9/6", family: "standard", quadRule: "kicker-tier",
        returns: {"3": 0.988242, "5": 0.988071, "10": 0.987928},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 800], ["FOUR_LOW_KICKER", 400], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "TRIPLE DOUBLE BONUS", variant: "9/5", family: "standard", quadRule: "kicker-tier",
        returns: {"3": 0.974181, "5": 0.973985, "10": 0.973828},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 800], ["FOUR_LOW_KICKER", 400], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "TRIPLE DOUBLE BONUS", variant: "8/5", family: "standard", quadRule: "kicker-tier",
        returns: {"3": 0.963012, "5": 0.962783, "10": 0.962598},
        rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 800], ["FOUR_LOW_KICKER", 400], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 8], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_ACES_KICKER": 2, "FOUR_LOW_KICKER": 2, "FOUR_ACES": 2, "FOUR_LOW": 2, "FOUR_5_TO_K": 2, "FULL_HOUSE": 12, "FLUSH": 10, "STRAIGHT": 8, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "JACKS_OR_BETTER": 2}
        } },
      { game: "DEUCES WILD", variant: "25/15/9/4/4/3", family: "deuces",
        returns: {"3": 0.991282, "5": 0.992657, "10": 0.994362},
        rows: [["ROYAL_FLUSH", 800], ["FOUR_DEUCES", 200], ["WILD_ROYAL_FLUSH", 25], ["FIVE_OF_A_KIND", 15], ["STRAIGHT_FLUSH", 9], ["FOUR_OF_A_KIND", 4], ["FULL_HOUSE", 4], ["FLUSH", 3], ["STRAIGHT", 2], ["THREE_OF_A_KIND", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "FOUR_DEUCES": 2, "WILD_ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 2, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2},
          5: {"ROYAL_FLUSH": 2, "FOUR_DEUCES": 2, "WILD_ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 3, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2},
          10: {"ROYAL_FLUSH": 4, "FOUR_DEUCES": 4, "WILD_ROYAL_FLUSH": 4, "FIVE_OF_A_KIND": 3, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2}
        } },
      { game: "DEUCES WILD", variant: "20/12/10/4/4/3", family: "deuces",
        returns: {"3": 0.979863, "5": 0.981217, "10": 0.982817},
        rows: [["ROYAL_FLUSH", 800], ["FOUR_DEUCES", 200], ["WILD_ROYAL_FLUSH", 20], ["FIVE_OF_A_KIND", 12], ["STRAIGHT_FLUSH", 10], ["FOUR_OF_A_KIND", 4], ["FULL_HOUSE", 4], ["FLUSH", 3], ["STRAIGHT", 2], ["THREE_OF_A_KIND", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "FOUR_DEUCES": 2, "WILD_ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 2, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2},
          5: {"ROYAL_FLUSH": 2, "FOUR_DEUCES": 2, "WILD_ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 3, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2},
          10: {"ROYAL_FLUSH": 4, "FOUR_DEUCES": 4, "WILD_ROYAL_FLUSH": 4, "FIVE_OF_A_KIND": 3, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2}
        } },
      { game: "DEUCES WILD", variant: "25/16/13/4/3/2", family: "deuces",
        returns: {"3": 0.969387, "5": 0.970777, "10": 0.972477},
        rows: [["ROYAL_FLUSH", 800], ["FOUR_DEUCES", 200], ["WILD_ROYAL_FLUSH", 25], ["FIVE_OF_A_KIND", 16], ["STRAIGHT_FLUSH", 13], ["FOUR_OF_A_KIND", 4], ["FULL_HOUSE", 3], ["FLUSH", 2], ["STRAIGHT", 2], ["THREE_OF_A_KIND", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "FOUR_DEUCES": 2, "WILD_ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 2, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2},
          5: {"ROYAL_FLUSH": 2, "FOUR_DEUCES": 2, "WILD_ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 3, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2},
          10: {"ROYAL_FLUSH": 4, "FOUR_DEUCES": 4, "WILD_ROYAL_FLUSH": 4, "FIVE_OF_A_KIND": 3, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2}
        } },
      { game: "DEUCES WILD", variant: "20/10/8/4/4/3", family: "deuces",
        returns: {"3": 0.962942, "5": 0.964295, "10": 0.965889},
        rows: [["ROYAL_FLUSH", 800], ["FOUR_DEUCES", 200], ["WILD_ROYAL_FLUSH", 20], ["FIVE_OF_A_KIND", 10], ["STRAIGHT_FLUSH", 8], ["FOUR_OF_A_KIND", 4], ["FULL_HOUSE", 4], ["FLUSH", 3], ["STRAIGHT", 2], ["THREE_OF_A_KIND", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "FOUR_DEUCES": 2, "WILD_ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 2, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2},
          5: {"ROYAL_FLUSH": 2, "FOUR_DEUCES": 2, "WILD_ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 3, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2},
          10: {"ROYAL_FLUSH": 4, "FOUR_DEUCES": 4, "WILD_ROYAL_FLUSH": 4, "FIVE_OF_A_KIND": 3, "STRAIGHT_FLUSH": 12, "FOUR_OF_A_KIND": 7, "FULL_HOUSE": 5, "FLUSH": 5, "STRAIGHT": 3, "THREE_OF_A_KIND": 2}
        } },
      { game: "JOKER POKER", variant: "50/17/7/5/3", family: "jokers", deck: 53,
        returns: {"3": 0.989856, "5": 0.990144, "10": 0.990445},
        rows: [["ROYAL_FLUSH", 800], ["FIVE_OF_A_KIND", 200], ["WILD_ROYAL_FLUSH", 100], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 17], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 3], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["KINGS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 2, "WILD_ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 3, "FIVE_OF_A_KIND": 3, "WILD_ROYAL_FLUSH": 3, "STRAIGHT_FLUSH": 3, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "FIVE_OF_A_KIND": 4, "WILD_ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2}
        } },
      { game: "JOKER POKER", variant: "50/16/7/5/3", family: "jokers", deck: 53,
        returns: {"3": 0.98119, "5": 0.981474, "10": 0.981771},
        rows: [["ROYAL_FLUSH", 800], ["FIVE_OF_A_KIND", 200], ["WILD_ROYAL_FLUSH", 100], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 16], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 3], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["KINGS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 2, "WILD_ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 3, "FIVE_OF_A_KIND": 3, "WILD_ROYAL_FLUSH": 3, "STRAIGHT_FLUSH": 3, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "FIVE_OF_A_KIND": 4, "WILD_ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2}
        } },
      { game: "JOKER POKER", variant: "50/15/7/5/3", family: "jokers", deck: 53,
        returns: {"3": 0.972528, "5": 0.972808, "10": 0.973102},
        rows: [["ROYAL_FLUSH", 800], ["FIVE_OF_A_KIND", 200], ["WILD_ROYAL_FLUSH", 100], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 15], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 3], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["KINGS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 2, "WILD_ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 3, "FIVE_OF_A_KIND": 3, "WILD_ROYAL_FLUSH": 3, "STRAIGHT_FLUSH": 3, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "FIVE_OF_A_KIND": 4, "WILD_ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2}
        } },
      { game: "JOKER POKER", variant: "40/20/5/4/3", family: "jokers", deck: 53,
        returns: {"3": 0.963942, "5": 0.964201, "10": 0.964472},
        rows: [["ROYAL_FLUSH", 800], ["FIVE_OF_A_KIND", 200], ["WILD_ROYAL_FLUSH", 100], ["STRAIGHT_FLUSH", 40], ["FOUR_OF_A_KIND", 20], ["FULL_HOUSE", 5], ["FLUSH", 4], ["STRAIGHT", 3], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["KINGS_OR_BETTER", 1]],
        multipliers: {
          3: {"ROYAL_FLUSH": 2, "FIVE_OF_A_KIND": 2, "WILD_ROYAL_FLUSH": 2, "STRAIGHT_FLUSH": 2, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2},
          5: {"ROYAL_FLUSH": 3, "FIVE_OF_A_KIND": 3, "WILD_ROYAL_FLUSH": 3, "STRAIGHT_FLUSH": 3, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2},
          10: {"ROYAL_FLUSH": 4, "FIVE_OF_A_KIND": 4, "WILD_ROYAL_FLUSH": 4, "STRAIGHT_FLUSH": 4, "FOUR_OF_A_KIND": 2, "FULL_HOUSE": 7, "FLUSH": 6, "STRAIGHT": 5, "THREE_OF_A_KIND": 4, "TWO_PAIR": 3, "KINGS_OR_BETTER": 2}
        } }
    ],
    dreamCard: {
      probability: {"JACKS OR BETTER": 0.505, "BONUS POKER DELUXE": 0.313, "BONUS POKER": 0.467, "DOUBLE BONUS": 0.337, "TRIPLE BONUS": 0.27, "DOUBLE DOUBLE BONUS": 0.31, "TRIPLE DOUBLE BONUS": 0.267, "DEUCES WILD": 0.59},
      tables: [
        { game: "JACKS OR BETTER", variant: "9/6", family: "standard", quadRule: "flat",
          baseReturn: 0.995439, dreamCardReturn: 0.995592,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 25], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]] },
        { game: "JACKS OR BETTER", variant: "8/6", family: "standard", quadRule: "flat",
          baseReturn: 0.983927, dreamCardReturn: 0.983947,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 25], ["FULL_HOUSE", 8], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]] },
        { game: "JACKS OR BETTER", variant: "8/5", family: "standard", quadRule: "flat",
          baseReturn: 0.972984, dreamCardReturn: 0.977344,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 25], ["FULL_HOUSE", 8], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]] },
        { game: "JACKS OR BETTER", variant: "7/5", family: "standard", quadRule: "flat",
          baseReturn: 0.961472, dreamCardReturn: 0.965682,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 25], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]] },
        { game: "BONUS POKER", variant: "8/5", family: "standard", quadRule: "rank-tier",
          baseReturn: 0.99166, dreamCardReturn: 0.992678,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 80], ["FOUR_LOW", 40], ["FOUR_5_TO_K", 25], ["FULL_HOUSE", 8], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]] },
        { game: "BONUS POKER", variant: "7/5", family: "standard", quadRule: "rank-tier",
          baseReturn: 0.980147, dreamCardReturn: 0.98146,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 80], ["FOUR_LOW", 40], ["FOUR_5_TO_K", 25], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]] },
        { game: "BONUS POKER", variant: "6/5", family: "standard", quadRule: "rank-tier",
          baseReturn: 0.968687, dreamCardReturn: 0.970429,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 80], ["FOUR_LOW", 40], ["FOUR_5_TO_K", 25], ["FULL_HOUSE", 6], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 2], ["JACKS_OR_BETTER", 1]] },
        { game: "BONUS POKER DELUXE", variant: "9/6", family: "standard", quadRule: "flat",
          baseReturn: 0.996417, dreamCardReturn: 0.996692,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 80], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "BONUS POKER DELUXE", variant: "9/5", family: "standard", quadRule: "flat",
          baseReturn: 0.985495, dreamCardReturn: 0.990537,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 80], ["FULL_HOUSE", 9], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "BONUS POKER DELUXE", variant: "8/5", family: "standard", quadRule: "flat",
          baseReturn: 0.974009, dreamCardReturn: 0.98113,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 80], ["FULL_HOUSE", 8], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "BONUS POKER DELUXE", variant: "7/5", family: "standard", quadRule: "flat",
          baseReturn: 0.962526, dreamCardReturn: 0.971723,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_OF_A_KIND", 80], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "DOUBLE BONUS", variant: "9/7/5", family: "standard", quadRule: "rank-tier",
          baseReturn: 0.991065, dreamCardReturn: 0.991723,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 7], ["STRAIGHT", 5], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "DOUBLE BONUS", variant: "9/6/5", family: "standard", quadRule: "rank-tier",
          baseReturn: 0.978062, dreamCardReturn: 0.984408,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 5], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "DOUBLE BONUS", variant: "9/6/4", family: "standard", quadRule: "rank-tier",
          baseReturn: 0.963754, dreamCardReturn: 0.972519,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "DOUBLE BONUS", variant: "9/5/4", family: "standard", quadRule: "rank-tier",
          baseReturn: 0.952738, dreamCardReturn: 0.96611,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "TRIPLE BONUS", variant: "10/7", family: "standard", quadRule: "rank-tier", minPair: "kings",
          baseReturn: 0.985192, dreamCardReturn: 0.985421,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 240], ["FOUR_LOW", 120], ["FOUR_5_TO_K", 75], ["FULL_HOUSE", 10], ["FLUSH", 7], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["KINGS_OR_BETTER", 1]] },
        { game: "TRIPLE BONUS", variant: "9/7", family: "standard", quadRule: "rank-tier", minPair: "kings",
          baseReturn: 0.974504, dreamCardReturn: 0.977068,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 240], ["FOUR_LOW", 120], ["FOUR_5_TO_K", 75], ["FULL_HOUSE", 9], ["FLUSH", 7], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["KINGS_OR_BETTER", 1]] },
        { game: "TRIPLE BONUS", variant: "9/6", family: "standard", quadRule: "rank-tier", minPair: "kings",
          baseReturn: 0.958759, dreamCardReturn: 0.968456,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 240], ["FOUR_LOW", 120], ["FOUR_5_TO_K", 75], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["KINGS_OR_BETTER", 1]] },
        { game: "TRIPLE BONUS", variant: "9/5", family: "standard", quadRule: "rank-tier", minPair: "kings",
          baseReturn: 0.945334, dreamCardReturn: 0.960797,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES", 240], ["FOUR_LOW", 120], ["FOUR_5_TO_K", 75], ["FULL_HOUSE", 9], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["KINGS_OR_BETTER", 1]] },
        { game: "DOUBLE DOUBLE BONUS", variant: "9/6", family: "standard", quadRule: "kicker-tier",
          baseReturn: 0.989808, dreamCardReturn: 0.99041,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 400], ["FOUR_LOW_KICKER", 160], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "DOUBLE DOUBLE BONUS", variant: "9/5", family: "standard", quadRule: "kicker-tier",
          baseReturn: 0.978729, dreamCardReturn: 0.984052,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 400], ["FOUR_LOW_KICKER", 160], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "DOUBLE DOUBLE BONUS", variant: "8/5", family: "standard", quadRule: "kicker-tier",
          baseReturn: 0.967861, dreamCardReturn: 0.975154,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 400], ["FOUR_LOW_KICKER", 160], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 8], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "DOUBLE DOUBLE BONUS", variant: "7/5", family: "standard", quadRule: "kicker-tier",
          baseReturn: 0.95712, dreamCardReturn: 0.966554,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 400], ["FOUR_LOW_KICKER", 160], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 3], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "TRIPLE DOUBLE BONUS", variant: "9/6", family: "standard", quadRule: "kicker-tier",
          baseReturn: 0.98154, dreamCardReturn: 0.982082,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 800], ["FOUR_LOW_KICKER", 400], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 9], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "TRIPLE DOUBLE BONUS", variant: "8/6", family: "standard", quadRule: "kicker-tier",
          baseReturn: 0.971088, dreamCardReturn: 0.974347,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 800], ["FOUR_LOW_KICKER", 400], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 8], ["FLUSH", 6], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "TRIPLE DOUBLE BONUS", variant: "7/5", family: "standard", quadRule: "kicker-tier",
          baseReturn: 0.949178, dreamCardReturn: 0.96013,
          rows: [["ROYAL_FLUSH", 800], ["STRAIGHT_FLUSH", 50], ["FOUR_ACES_KICKER", 800], ["FOUR_LOW_KICKER", 400], ["FOUR_ACES", 160], ["FOUR_LOW", 80], ["FOUR_5_TO_K", 50], ["FULL_HOUSE", 7], ["FLUSH", 5], ["STRAIGHT", 4], ["THREE_OF_A_KIND", 2], ["TWO_PAIR", 1], ["JACKS_OR_BETTER", 1]] },
        { game: "DEUCES WILD", variant: "25/15/9/4/4/3", family: "deuces",
          baseReturn: 0.989131, dreamCardReturn: 0.999127,
          rows: [["ROYAL_FLUSH", 800], ["FOUR_DEUCES", 200], ["WILD_ROYAL_FLUSH", 25], ["FIVE_OF_A_KIND", 15], ["STRAIGHT_FLUSH", 9], ["FOUR_OF_A_KIND", 4], ["FULL_HOUSE", 4], ["FLUSH", 3], ["STRAIGHT", 2], ["THREE_OF_A_KIND", 1]] },
        { game: "DEUCES WILD", variant: "20/12/10/4/4/3", family: "deuces",
          baseReturn: 0.975791, dreamCardReturn: 0.980983,
          rows: [["ROYAL_FLUSH", 800], ["FOUR_DEUCES", 200], ["WILD_ROYAL_FLUSH", 20], ["FIVE_OF_A_KIND", 12], ["STRAIGHT_FLUSH", 10], ["FOUR_OF_A_KIND", 4], ["FULL_HOUSE", 4], ["FLUSH", 3], ["STRAIGHT", 2], ["THREE_OF_A_KIND", 1]] },
        { game: "DEUCES WILD", variant: "20/10/8/4/4/3", family: "deuces",
          baseReturn: 0.959638, dreamCardReturn: 0.96016,
          rows: [["ROYAL_FLUSH", 800], ["FOUR_DEUCES", 200], ["WILD_ROYAL_FLUSH", 20], ["FIVE_OF_A_KIND", 10], ["STRAIGHT_FLUSH", 8], ["FOUR_OF_A_KIND", 4], ["FULL_HOUSE", 4], ["FLUSH", 3], ["STRAIGHT", 2], ["THREE_OF_A_KIND", 1]] }
      ]
    }
  };
});
