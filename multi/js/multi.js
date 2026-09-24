/*
 * MultiPlayTrainer: IGT Game King-style multi-play (3/5/10-hand) video poker
 * trainer. Sibling of the single-line VideoPokerTrainer (../../js/trainer.js):
 * same engine, same skin, same hint/analysis/grading ideas, laid out like
 * IGT's Triple/Five/Ten Play — mini hands stacked above, the playable hand
 * full-size at the bottom — with optional Ultimate X and Dream Card features.
 *
 * Usage:
 *   var game = MultiPlayTrainer.create(containerElement, { handCount: 5, feature: 'ultimate-x' });
 *   game.dealHand(['AS', 'KS', 'QS', 'JS', '9D']);
 *   game.on('draw', function (e) { console.log(e.hands, e.won); });
 *
 * Requires ../../js/engine.js, then tables.js and features.js.
 */
(function (global) {
  'use strict';

  var E = global.VPEngine;
  var F = global.VPMFeatures;
  if (!E || !F) throw new Error('MultiPlayTrainer requires engine.js, tables.js and features.js to be loaded first');

  var EV_EPSILON = 1e-9; // floating-point floor under the user's tolerance, as in trainer.js
  var DEFAULT_OPTIMAL_TOLERANCE = 1.0;
  var REBUY_AMOUNT = 500;
  var HAND_COUNTS = [3, 5, 10];
  var DEFAULT_HAND_COUNT = 3;
  var DREAM_CARD_SLOT = 4; // which slot shows the Dream Card is cosmetic (see chooseDreamCard in engine.js)

  // Natural (unscaled) geometry, matching gameking.css's card: the page
  // scales the whole widget to fit the screen, so these only set proportions.
  var CARD_H = 250;
  var MINI_AREA_H = 1300; // vertical budget for the stacked mini hands
  var MINI_ROW_GAP = 8;

  var nextInstanceId = 0;

  function resolveHandCount(n) {
    n = Math.round(Number(n));
    return HAND_COUNTS.indexOf(n) !== -1 ? n : DEFAULT_HAND_COUNT;
  }

  /* Accepts a catalog id or a custom paytable object (played with no feature). */
  function resolvePaytable(spec, featureKey) {
    if (typeof spec === 'object' && spec !== null) {
      var custom = {};
      Object.keys(spec).forEach(function (k) { custom[k] = spec[k]; });
      custom.feature = 'none';
      return custom;
    }
    if (spec) {
      var pt = F.paytableById(spec);
      if (!pt) throw new Error('Unknown paytable: ' + spec);
      return pt;
    }
    return F.defaultPaytable(F.feature(featureKey) ? featureKey : 'none');
  }

  /* Mini hands shrink only as far as needed to fit MINI_AREA_H; 3- and 5-play stay full size. */
  function miniScale(handCount) {
    var rows = handCount - 1;
    var rowH = (MINI_AREA_H - MINI_ROW_GAP * (rows - 1)) / rows;
    return Math.min(1, rowH / CARD_H);
  }

  function pct(r) { return (r * 100).toFixed(2) + '%'; }

  function create(container, options) {
    options = options || {};
    var paytable = resolvePaytable(options.paytable, options.feature);
    var instanceId = nextInstanceId++;

    /* ---------- state ---------- */
    var state = {
      phase: 'attract',           // 'attract' | 'dealing' (Dream Card being picked) | 'dealt'
      credits: options.credits != null ? options.credits : 1000,
      bet: Math.min(5, Math.max(1, options.bet || 5)),  // coins per hand toward the paytable; features lock it at 5
      handCount: resolveHandCount(options.handCount),
      win: 0,                     // total across all hands for the last draw
      hand: null,                 // the 5 dealt cards every hand starts from
      held: [false, false, false, false, false],
      hands: null,                // after draw: [{ cards, category, base, multiplier, win }], index 0 = the bottom (playable) hand
      multipliers: null,          // Ultimate X: multiplier waiting on each hand position for its next deal
      dreamCardIndex: null,
      dreamCardJob: null,
      queuedHand: null,
      queuedDraw: null,           // forced replacements for the bottom hand only
      analysis: null,
      analysisJob: null,
      hintUsed: false,
      lastVerdict: null,
      stats: {
        hands: (options.stats && options.stats.hands) || 0,
        optimal: (options.stats && options.stats.optimal) || 0,
        evLost: (options.stats && options.stats.evLost) || 0
      },
      settings: {
        optimalTolerance: options.optimalTolerance != null
          ? Math.max(0, options.optimalTolerance)
          : DEFAULT_OPTIMAL_TOLERANCE
      }
    };

    var listeners = {};
    function emit(name, payload) {
      (listeners[name] || []).forEach(function (cb) { cb(payload); });
    }

    function feature() { return F.feature(paytable.feature); }
    function isUX() { return paytable.feature === 'ultimate-x'; }
    function isDC() { return paytable.feature === 'dream-card'; }
    function coinsPerHand() { return state.bet * feature().costMultiplier; }
    function totalBet() { return coinsPerHand() * state.handCount; }

    function resetMultipliers(saved) {
      state.multipliers = [];
      for (var h = 0; h < state.handCount; h++) {
        state.multipliers.push(isUX() && saved && saved[h] > 1 ? Math.round(saved[h]) : 1);
      }
    }
    if (paytable.feature !== 'none') state.bet = 5;
    resetMultipliers(options.multipliers);

    /* Holds are ranked against this: the paytable itself, or for Ultimate X WoO's strategy values. */
    var strategyCache = {};
    function strategyPaytable() {
      if (!isUX()) return paytable;
      var key = paytable.id + ':' + state.handCount;
      if (!strategyCache[key]) strategyCache[key] = F.uxStrategyPaytable(paytable, state.handCount);
      return strategyCache[key];
    }

    /* ---------- DOM ---------- */
    var root = document.createElement('div');
    root.className = 'vpt vpm';
    root.innerHTML =
      '<div class="vpt-screen">' +
      '  <div class="vpm-setup">' +
      '    <select class="vpm-select vpm-featureselect" aria-label="Feature"></select>' +
      '    <select class="vpm-select vpm-gameselect" aria-label="Game"></select>' +
      '    <select class="vpm-select vpm-payselect" aria-label="Paytable"></select>' +
      '    <select class="vpm-select vpm-countselect" aria-label="Hands"></select>' +
      '  </div>' +
      '  <div class="vpm-minis"></div>' +
      '  <div class="vpt-msgrow"><div class="vpt-message"></div></div>' +
      '  <div class="vpt-cards"><div class="vpm-mult vpm-main-mult"></div><div class="vpm-pill vpm-main-pill"></div></div>' +
      '  <div class="vpt-trainer">' +
      '    <button class="vpt-btn vpt-btn-hint">HINT</button>' +
      '    <div class="vpt-verdict"></div>' +
      '    <div class="vpt-stats"></div>' +
      '  </div>' +
      '  <div class="vpt-status">' +
      '    <span class="vpt-bet"></span>' +
      '    <span class="vpt-win"></span>' +
      '    <span class="vpt-credit"></span>' +
      '  </div>' +
      '</div>' +
      '<div class="vpt-buttons">' +
      '  <button class="vpt-btn vpt-btn-rebuy">Rebuy</button>' +
      '  <button class="vpt-btn vpt-btn-settings">Settings</button>' +
      '  <button class="vpt-btn vpt-btn-analysis">Analysis</button>' +
      '  <button class="vpt-btn vpt-btn-paytoggle">See Pays</button>' +
      '  <button class="vpt-btn vpt-btn-betone">Bet One</button>' +
      '  <button class="vpt-btn vpt-btn-betmax">Bet Max</button>' +
      '  <button class="vpt-btn vpt-btn-deal">Deal</button>' +
      '</div>';
    container.appendChild(root);

    /*
     * Overlays live on <body>, not inside root: the page scales root with a
     * CSS transform to fit the screen, and position:fixed inside a
     * transformed ancestor is positioned against that ancestor, not the
     * viewport (same reason as trainer.js's settings modal).
     */
    function makeModal(extraClass, innerHtml) {
      var m = document.createElement('div');
      m.className = 'vpt-modal-backdrop vpm-overlay';
      m.innerHTML = '<div class="vpt-modal ' + extraClass + '" role="dialog" aria-modal="true">' + innerHtml +
        '<button class="vpt-btn vpm-modal-close">Done</button></div>';
      document.body.appendChild(m);
      m.addEventListener('click', function (ev) { if (ev.target === m) m.classList.remove('vpt-open'); });
      m.querySelector('.vpm-modal-close').addEventListener('click', function () { m.classList.remove('vpt-open'); });
      return m;
    }

    var settingsModal = makeModal('vpm-settings-modal',
      '<h3>SETTINGS</h3>' +
      '<div class="vpt-settings-row">' +
      '  <label for="vpm-tol-input-' + instanceId + '">OPTIMAL HOLD TOLERANCE (COINS)</label>' +
      '  <input type="number" id="vpm-tol-input-' + instanceId + '" class="vpt-tol-input" min="0" step="0.1">' +
      '</div>' +
      '<p class="vpt-settings-hint">A hold within this many coins (per hand) of the best EV is graded OPTIMAL. ' +
      '0 requires an exact match.</p>');

    var paysModal = makeModal('vpm-pays-modal',
      '<h3 class="vpm-pays-title"></h3>' +
      '<table class="vpt-paytable"><colgroup></colgroup><tbody></tbody></table>' +
      '<p class="vpt-settings-hint vpm-pays-note"></p>');

    var analysisModal = makeModal('vpm-analysis-modal',
      '<div class="vpt-analysis vpt-open"><h3 class="vpm-analysis-title"></h3><table>' +
      '<thead><tr><th>#</th><th>HOLD</th><th class="vpm-analysis-col" style="text-align:right">EV</th></tr></thead>' +
      '<tbody></tbody></table><p class="vpt-settings-hint vpm-analysis-note"></p></div>');

    var el = {
      minis: root.querySelector('.vpm-minis'),
      message: root.querySelector('.vpt-message'),
      cards: root.querySelector('.vpt-cards'),
      mainPill: root.querySelector('.vpm-main-pill'),
      mainMult: root.querySelector('.vpm-main-mult'),
      verdict: root.querySelector('.vpt-verdict'),
      stats: root.querySelector('.vpt-stats'),
      featureSelect: root.querySelector('.vpm-featureselect'),
      gameSelect: root.querySelector('.vpm-gameselect'),
      paySelect: root.querySelector('.vpm-payselect'),
      countSelect: root.querySelector('.vpm-countselect'),
      bet: root.querySelector('.vpt-bet'),
      win: root.querySelector('.vpt-win'),
      credit: root.querySelector('.vpt-credit'),
      hint: root.querySelector('.vpt-btn-hint'),
      rebuy: root.querySelector('.vpt-btn-rebuy'),
      settingsBtn: root.querySelector('.vpt-btn-settings'),
      analysisBtn: root.querySelector('.vpt-btn-analysis'),
      paysBtn: root.querySelector('.vpt-btn-paytoggle'),
      betOne: root.querySelector('.vpt-btn-betone'),
      betMax: root.querySelector('.vpt-btn-betmax'),
      deal: root.querySelector('.vpt-btn-deal'),
      settingsModal: settingsModal,
      toleranceInput: settingsModal.querySelector('.vpt-tol-input'),
      paysModal: paysModal,
      paysTitle: paysModal.querySelector('.vpm-pays-title'),
      paysCols: paysModal.querySelector('colgroup'),
      paysBody: paysModal.querySelector('tbody'),
      paysNote: paysModal.querySelector('.vpm-pays-note'),
      analysisModal: analysisModal,
      analysisTitle: analysisModal.querySelector('.vpm-analysis-title'),
      analysisCol: analysisModal.querySelector('.vpm-analysis-col'),
      analysisBody: analysisModal.querySelector('tbody'),
      analysisNote: analysisModal.querySelector('.vpm-analysis-note'),
      slots: [],
      miniRows: []                // miniRows[r] = { row, pill, mult, cards }, r = 0 is hand 2 (nearest the bottom hand)
    };
    el.toleranceInput.value = state.settings.optimalTolerance;

    for (var i = 0; i < 5; i++) {
      var slot = document.createElement('div');
      slot.className = 'vpt-slot';
      slot.innerHTML = '<div class="vpt-heldtag">HELD</div><div class="vpt-card vpt-back"></div>';
      (function (idx) {
        slot.addEventListener('click', function () { api.toggleHold(idx); });
      })(i);
      el.cards.insertBefore(slot, el.mainMult);
      el.slots.push(slot);
    }

    /* ---------- setup selectors ---------- */

    function fillSelect(select, options, value) {
      select.innerHTML = '';
      options.forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        select.appendChild(opt);
      });
      select.value = value;
    }

    function variantLabel(pt) {
      var label = pt.variant || 'STANDARD';
      if (pt.returns) label += ' · ' + pct(pt.returns[state.handCount]);
      else if (pt.dreamCardReturn) label += ' · ' + pct(pt.dreamCardReturn);
      return label;
    }

    function renderSetup() {
      fillSelect(el.featureSelect, F.FEATURES.map(function (f) { return { value: f.key, label: f.label }; }), paytable.feature);
      if (paytable.id && F.paytableById(paytable.id)) {
        var games = F.games(paytable.feature);
        fillSelect(el.gameSelect, games.map(function (g) { return { value: g.game, label: g.game }; }), paytable.game);
        var group = games.filter(function (g) { return g.game === paytable.game; })[0];
        fillSelect(el.paySelect, group.paytables.map(function (pt) { return { value: pt.id, label: variantLabel(pt) }; }), paytable.id);
        el.paySelect.classList.toggle('vpt-hidden', group.paytables.length === 1 && !group.paytables[0].variant);
      } else {
        fillSelect(el.gameSelect, [{ value: '__custom__', label: paytable.name || 'CUSTOM' }], '__custom__');
        el.paySelect.classList.add('vpt-hidden');
      }
      fillSelect(el.countSelect, HAND_COUNTS.map(function (n) { return { value: n, label: n + ' HANDS' }; }), state.handCount);
    }

    /* ---------- rendering ---------- */

    function renderCard(cardEl, card, isDreamCard) {
      if (card == null) {
        cardEl.className = 'vpt-card vpt-back';
        cardEl.innerHTML = '';
        return;
      }
      var dreamTag = isDreamCard ? '<div class="vpm-dreamtag">DREAM CARD</div>' : '';
      if (E.isJoker(card)) {
        cardEl.className = 'vpt-card vpt-joker';
        cardEl.innerHTML =
          '<div class="vpt-corner">JKR</div>' +
          '<div class="vpt-joker-face"><div class="vpt-joker-label">JOKER</div></div>' + dreamTag;
        return;
      }
      var suit = E.suitOf(card);
      var rank = E.rankOf(card);
      var glyph = E.SUIT_GLYPHS[suit];
      var rankChar = E.RANK_CHARS[rank];
      var red = suit === 1 || suit === 2;
      var isWildDeuce = paytable.family === 'deuces' && rank === 0;
      cardEl.className = 'vpt-card ' + (red ? 'vpt-redsuit' : 'vpt-blacksuit');
      var center = rank >= 9 && rank <= 11
        ? '<div class="vpt-face">' + rankChar + '</div>'
        : '<div class="vpt-pip">' + glyph + '</div>';
      var wildStack = isWildDeuce
        ? '<div class="vpt-wildstack"><span>WILD</span><span>WILD</span><span>WILD</span><span>WILD</span></div>'
        : '';
      cardEl.innerHTML =
        '<div class="vpt-corner">' + rankChar + '<span>' + glyph + '</span></div>' + wildStack + center + dreamTag;
    }

    /* Rebuilt only when the hand count changes — the widget's footprint changes only then. */
    function buildMiniRows() {
      var rows = state.handCount - 1;
      el.minis.innerHTML = '';
      el.minis.style.setProperty('--k', miniScale(state.handCount));
      el.minis.style.gap = MINI_ROW_GAP + 'px';
      el.miniRows = [];
      for (var r = 0; r < rows; r++) {
        var row = document.createElement('div');
        row.className = 'vpm-row';
        var cards = [];
        for (var c = 0; c < 5; c++) {
          var col = document.createElement('div');
          col.className = 'vpm-col';
          col.innerHTML = '<div class="vpm-mini"><div class="vpt-card vpt-back"></div></div>';
          row.appendChild(col);
          cards.push(col.querySelector('.vpt-card'));
        }
        var mult = document.createElement('div');
        mult.className = 'vpm-mult';
        row.appendChild(mult);
        var pill = document.createElement('div');
        pill.className = 'vpm-pill';
        row.appendChild(pill);
        // Visual order top-to-bottom is hand N .. hand 2, so hand 2 sits
        // right above the playable hand.
        el.minis.insertBefore(row, el.minis.firstChild);
        el.miniRows.push({ row: row, pill: pill, mult: mult, cards: cards });
      }
    }

    function setPill(pill, hand) {
      if (hand && hand.win > 0) {
        pill.textContent = E.CATEGORY_NAMES[hand.category] +
          (hand.multiplier > 1 ? '  ×' + hand.multiplier + ' = ' : '  ') + hand.win;
        pill.classList.add('vpt-open');
      } else {
        pill.textContent = '';
        pill.classList.remove('vpt-open');
      }
    }

    /* Ultimate X: the multiplier waiting on this hand position (only shown when above 1X). */
    function setMult(badge, h) {
      var m = isUX() ? state.multipliers[h] : 1;
      badge.textContent = m > 1 ? m + 'X' : '';
      badge.classList.toggle('vpt-open', m > 1);
    }

    function isDreamSlot(i) {
      if (state.dreamCardIndex !== i || !state.hand) return false;
      return state.phase !== 'attract' || state.held[i];
    }

    function renderMainHand() {
      var cards = state.hands ? state.hands[0].cards : state.hand;
      for (var i = 0; i < 5; i++) {
        var slot = el.slots[i];
        renderCard(slot.querySelector('.vpt-card'), cards ? cards[i] : null, isDreamSlot(i));
        slot.classList.toggle('vpt-held', state.held[i]);
        slot.classList.toggle('vpt-disabled', state.phase !== 'dealt');
        slot.classList.remove('vpt-hint', 'vpt-best');
      }
      setPill(el.mainPill, state.hands ? state.hands[0] : null);
      setMult(el.mainMult, 0);
    }

    /*
     * Before the draw, a mini hand shows only the cards being held — face
     * up in the same position as on the playable hand — with card backs
     * everywhere else, as on the real machines. After the draw it shows
     * that hand's own final cards.
     */
    function renderMiniHands() {
      el.miniRows.forEach(function (mini, r) {
        var hand = state.hands ? state.hands[r + 1] : null;
        for (var c = 0; c < 5; c++) {
          var card = null;
          if (hand) card = hand.cards[c];
          else if (state.hand && state.held[c]) card = state.hand[c];
          renderCard(mini.cards[c], card, false);
        }
        setPill(mini.pill, hand);
        setMult(mini.mult, r + 1);
      });
    }

    function setMessage(text, mode) {
      el.message.textContent = text;
      el.message.className = 'vpt-message' + (mode ? ' vpt-' + mode : '');
    }

    function renderStatus() {
      el.bet.textContent = 'BET ' + totalBet();
      el.win.textContent = 'WIN ' + state.win;
      el.credit.textContent = 'CREDIT ' + state.credits;
    }

    function renderStats() {
      var s = state.stats;
      el.stats.textContent = s.hands === 0 ? ''
        : 'DEALS ' + s.hands + ' · OPTIMAL ' + Math.round((s.optimal / s.hands) * 100) + '%';
    }

    function renderButtons() {
      var dealt = state.phase === 'dealt';
      var locked = state.phase !== 'attract';
      var fixedBet = paytable.feature !== 'none';
      el.deal.textContent = dealt ? 'Draw' : 'Deal';
      el.deal.disabled = locked ? !dealt : state.credits < totalBet() && !state.queuedHand;
      el.betOne.disabled = locked || fixedBet;
      el.betMax.disabled = locked || (state.credits < 5 * feature().costMultiplier * state.handCount && !state.queuedHand);
      el.hint.disabled = !dealt;
      el.featureSelect.disabled = locked;
      el.gameSelect.disabled = locked;
      el.paySelect.disabled = locked;
      el.countSelect.disabled = locked;
    }

    function renderPaytable() {
      el.paysTitle.textContent = (paytable.feature === 'none' ? '' : feature().label + ' · ') +
        (paytable.game || paytable.name) + (paytable.variant ? ' ' + paytable.variant : '');
      var body = el.paysBody;
      body.innerHTML = '';
      var cols;
      if (isUX()) {
        cols = '<col><col><col>';
        body.innerHTML = '<tr class="vpm-pays-head"><td></td><td>5 COINS</td><td>' + state.handCount + '-PLAY MULT</td></tr>';
      } else if (isDC()) {
        cols = '<col><col class="vpt-bet-active-col">';
        body.innerHTML = '<tr class="vpm-pays-head"><td></td><td>5 COINS</td></tr>';
      } else {
        cols = '<col><col><col><col><col><col>';
      }
      el.paysCols.innerHTML = cols;
      paytable.rows.forEach(function (row) {
        var tr = document.createElement('tr');
        var cells = ['<td>' + row.label + '</td>'];
        if (isUX()) {
          cells.push('<td>' + row.pays[4] + '</td>', '<td>' + F.uxMultiplier(paytable, row.category, state.handCount) + 'X</td>');
        } else if (isDC()) {
          cells.push('<td>' + row.pays[4] + '</td>');
        } else {
          row.pays.forEach(function (p) { cells.push('<td>' + p + '</td>'); });
        }
        tr.innerHTML = cells.join('');
        body.appendChild(tr);
      });
      if (!isUX() && !isDC()) {
        el.paysCols.querySelectorAll('col').forEach(function (col, idx) {
          col.className = idx === state.bet ? 'vpt-bet-active-col' : '';
        });
      }
      var note;
      if (isUX()) {
        note = 'Ultimate X: 10 coins per hand. Each winning hand pays now and earns its multiplier for that ' +
          'same hand position on the next deal. Return ' + pct(paytable.returns[state.handCount]) +
          ' at ' + state.handCount + '-play (Wizard of Odds).';
      } else if (isDC()) {
        note = 'Dream Card: 10 coins per hand, wins paid on 5. About ' + Math.round(F.dreamCardProbability(paytable) * 1000) / 10 +
          '% of deals get four cards plus the best possible fifth. Return ' + pct(paytable.dreamCardReturn) +
          ' (' + pct(paytable.baseReturn) + ' without it), per Wizard of Odds.';
      } else {
        note = 'Coins paid per hand at each bet level; the red column is your current bet per hand.';
      }
      el.paysNote.textContent = note;
    }

    function holdLabel(item) {
      if (item.heldCards.length === 0) return '(discard all five)';
      return item.heldCards.map(E.cardToPretty).join(' ');
    }

    function renderAnalysis(yourMask) {
      el.analysisTitle.textContent = isUX()
        ? 'HOLD ANALYSIS (ULTIMATE X STRATEGY VALUE, PER HAND)'
        : 'HOLD ANALYSIS (EV PER HAND, IN COINS)';
      el.analysisCol.textContent = isUX() ? 'VALUE' : 'EV';
      el.analysisNote.textContent = isUX()
        ? 'Wizard of Odds’ Ultimate X method: each result counts as 2 × its 5-coin pay + 5 × (multiplier it earns − 1). ' +
          'One strategy per game that he reports as near-optimal; the multipliers already in play don’t change it.'
        : '';
      var body = el.analysisBody;
      body.innerHTML = '';
      if (!state.analysis) {
        body.innerHTML = '<tr><td colspan="3">' + (state.hand ? 'Working…' : 'Deal a hand first.') + '</td></tr>';
        return;
      }
      var bestEV = state.analysis[0].ev;
      var top = state.analysis.slice(0, 8);
      top.forEach(function (item, idx) {
        var tr = document.createElement('tr');
        if (item.ev >= bestEV - EV_EPSILON) tr.className = 'vpt-optimal';
        else if (yourMask != null && item.mask === yourMask) tr.className = 'vpt-yours';
        tr.innerHTML = '<td>' + (idx + 1) + '</td><td>' + holdLabel(item) + '</td>' +
          '<td class="vpt-ev">' + item.ev.toFixed(4) + '</td>';
        body.appendChild(tr);
      });
      if (yourMask != null && !top.some(function (r) { return r.mask === yourMask; })) {
        var yours = state.analysis.find(function (r) { return r.mask === yourMask; });
        var tr2 = document.createElement('tr');
        tr2.className = 'vpt-yours';
        tr2.innerHTML = '<td>' + (state.analysis.indexOf(yours) + 1) + '</td><td>' + holdLabel(yours) +
          ' (your hold)</td><td class="vpt-ev">' + yours.ev.toFixed(4) + '</td>';
        body.appendChild(tr2);
      }
    }

    /* ---------- analysis ---------- */

    function startAnalysis() {
      if (state.analysisJob) state.analysisJob.cancel();
      state.analysis = null;
      var job = E.analyzeHoldsAsync(state.hand, state.bet, strategyPaytable());
      state.analysisJob = job;
      job.promise.then(function (results) {
        if (state.analysisJob !== job) return;
        state.analysis = results;
        state.analysisJob = null;
        if (el.analysisModal.classList.contains('vpt-open')) renderAnalysis(null);
        emit('analysis', { results: results });
      }, function () { /* cancelled */ });
    }

    function finishAnalysisSync() {
      if (!state.analysis) {
        if (state.analysisJob) { state.analysisJob.cancel(); state.analysisJob = null; }
        state.analysis = E.analyzeHolds(state.hand, state.bet, strategyPaytable());
      }
    }

    function playerMask() {
      var mask = 0;
      for (var i = 0; i < 5; i++) if (state.held[i]) mask |= 1 << i;
      return mask;
    }

    /* ---------- game actions ---------- */

    function finishDeal(hand) {
      state.hand = hand;
      state.phase = 'dealt';
      var dealtCat = E.resolveCategory(state.hand, paytable);
      if (state.dreamCardIndex != null) setMessage('DREAM CARD!', 'info');
      else setMessage(dealtCat !== E.CATEGORY.NOTHING ? E.CATEGORY_NAMES[dealtCat] : '', 'info');
      el.verdict.textContent = 'HOLD CARDS · THEN PRESS DRAW';
      el.verdict.className = 'vpt-verdict vpt-neutral';

      startAnalysis();
      renderMainHand();
      renderMiniHands();
      renderStatus();
      renderButtons();
      if (el.analysisModal.classList.contains('vpt-open')) renderAnalysis(null);
      emit('deal', {
        hand: state.hand.map(E.cardToString),
        bet: state.bet,
        handCount: state.handCount,
        feature: paytable.feature,
        dreamCardIndex: state.dreamCardIndex,
        multipliers: state.multipliers.slice()
      });
    }

    function deal(forcedHand) {
      // 'dealing' blocks re-entry too: this deal's bet is already charged.
      if (state.phase !== 'attract') return;
      var forced = forcedHand || state.queuedHand;
      if (!forced && state.credits < totalBet()) {
        setMessage('INSERT CREDITS', 'info');
        return;
      }
      state.credits -= totalBet();
      state.win = 0;
      state.hands = null;
      state.queuedHand = null;
      state.held = [false, false, false, false, false];
      state.hintUsed = false;
      state.lastVerdict = null;
      state.dreamCardIndex = null;
      state.analysis = null;
      var includeJoker = paytable.deck === 53;

      if (forced) { finishDeal(forced.slice()); return; }

      if (isDC() && Math.random() < F.dreamCardProbability(paytable)) {
        // Four random cards, then the fifth that maximizes the hand's best-hold
        // EV, found exactly (a background search, well under a second).
        var four = E.shuffledDeck([], undefined, includeJoker).slice(0, 4);
        state.phase = 'dealing';
        state.hand = four.concat([null]);
        state.dreamCardIndex = DREAM_CARD_SLOT;
        setMessage('DREAM CARD…', 'info');
        el.verdict.textContent = '';
        renderMainHand();
        renderMiniHands();
        renderStatus();
        renderButtons();
        var job = E.chooseDreamCardAsync(four, state.bet, paytable);
        state.dreamCardJob = job;
        job.promise.then(function (result) {
          if (state.dreamCardJob !== job) return;
          state.dreamCardJob = null;
          finishDeal(four.concat([result.card]));
        }, function () { /* cancelled */ });
        return;
      }

      finishDeal(E.shuffledDeck([], undefined, includeJoker).slice(0, 5));
    }

    /*
     * Every hand keeps the held cards and replaces the rest from its own
     * independently shuffled copy of the unseen cards — the real multi-play
     * mechanic, so the same replacement card can land in more than one hand.
     * Wins pay on the 5-coin (or chosen-bet) paytable, times the hand's
     * Ultimate X multiplier; each win then earns that position's next one.
     */
    function drawHands() {
      var includeJoker = paytable.deck === 53;
      var hands = [];
      for (var h = 0; h < state.handCount; h++) {
        var deck = E.shuffledDeck(state.hand, undefined, includeJoker);
        if (h === 0 && state.queuedDraw) {
          var forcedDraw = state.queuedDraw.filter(function (c) { return state.hand.indexOf(c) === -1; });
          deck = forcedDraw.concat(deck.filter(function (c) { return forcedDraw.indexOf(c) === -1; }));
        }
        var cards = state.hand.slice();
        var next = 0;
        for (var i = 0; i < 5; i++) if (!state.held[i]) cards[i] = deck[next++];
        var category = E.resolveCategory(cards, paytable);
        var base = E.payout(category, state.bet, paytable);
        var multiplier = state.multipliers[h];
        hands.push({ cards: cards, category: category, base: base, multiplier: multiplier, win: base * multiplier });
      }
      if (isUX()) {
        state.multipliers = hands.map(function (hand) {
          return hand.base > 0 ? F.uxMultiplier(paytable, hand.category, state.handCount) : 1;
        });
      }
      state.queuedDraw = null;
      return hands;
    }

    function draw() {
      if (state.phase !== 'dealt') return;
      finishAnalysisSync();

      var mask = playerMask();
      var playerItem = state.analysis.find(function (r) { return r.mask === mask; });
      var best = state.analysis[0];
      var evDiff = best.ev - playerItem.ev;
      var wasExact = evDiff <= EV_EPSILON;
      var wasOptimal = evDiff <= Math.max(state.settings.optimalTolerance, EV_EPSILON);

      state.hands = drawHands();
      var won = state.hands.reduce(function (sum, h) { return sum + h.win; }, 0);
      state.credits += won;
      state.win = won;
      state.phase = 'attract';

      state.stats.hands++;
      if (wasOptimal) state.stats.optimal++;
      state.stats.evLost += evDiff;
      state.lastVerdict = {
        wasOptimal: wasOptimal,
        wasExact: wasExact,
        playerEV: playerItem.ev,
        bestEV: best.ev,
        bestHold: best.heldIndices.slice()
      };

      if (won > 0) setMessage('TOTAL WIN ' + won, 'win');
      else setMessage('GAME OVER');

      renderMainHand();
      renderMiniHands();
      var unit = isUX() ? 'VALUE ' : 'EV ';
      if (wasOptimal) {
        el.verdict.textContent = wasExact
          ? '✓ OPTIMAL HOLD · ' + unit + best.ev.toFixed(3)
          : '✓ OPTIMAL HOLD · ' + unit + playerItem.ev.toFixed(3) + ' (BEST ' + best.ev.toFixed(3) + ')';
        el.verdict.className = 'vpt-verdict vpt-good';
      } else {
        el.verdict.textContent = '✗ BEST: ' + holdLabel(best) +
          ' · ' + unit + best.ev.toFixed(3) + ' VS YOURS ' + playerItem.ev.toFixed(3);
        el.verdict.className = 'vpt-verdict vpt-bad';
        best.heldIndices.forEach(function (idx) { el.slots[idx].classList.add('vpt-best'); });
      }
      renderStats();
      renderStatus();
      renderButtons();
      if (el.analysisModal.classList.contains('vpt-open')) renderAnalysis(mask);

      emit('draw', {
        hands: state.hands.map(function (h) {
          return {
            cards: h.cards.map(E.cardToString),
            category: h.category,
            categoryName: E.CATEGORY_NAMES[h.category],
            base: h.base,
            multiplier: h.multiplier,
            won: h.win
          };
        }),
        won: won,
        credits: state.credits,
        nextMultipliers: state.multipliers.slice(),
        playerHold: playerItem.heldIndices,
        optimalHold: best.heldIndices,
        wasOptimal: wasOptimal,
        wasExact: wasExact,
        playerEV: playerItem.ev,
        optimalEV: best.ev,
        evLost: evDiff,
        hintUsed: state.hintUsed
      });
    }

    function showHint() {
      if (state.phase !== 'dealt') return;
      finishAnalysisSync();
      state.hintUsed = true;
      var bestSet = {};
      state.analysis[0].heldIndices.forEach(function (i) { bestSet[i] = true; });
      for (var i = 0; i < 5; i++) el.slots[i].classList.toggle('vpt-hint', !!bestSet[i]);
      el.verdict.textContent = state.analysis[0].heldIndices.length
        ? 'HINT: HOLD THE MARKED CARDS'
        : 'HINT: DISCARD ALL FIVE';
      el.verdict.className = 'vpt-verdict vpt-neutral';
    }

    /* A new game, feature or hand count: like walking up to a different machine, so multipliers don't carry over. */
    function resetTable() {
      if (state.analysisJob) { state.analysisJob.cancel(); state.analysisJob = null; }
      if (state.dreamCardJob) { state.dreamCardJob.cancel(); state.dreamCardJob = null; }
      state.phase = 'attract';
      state.hand = null;
      state.hands = null;
      state.queuedHand = null;
      state.queuedDraw = null;
      state.held = [false, false, false, false, false];
      state.analysis = null;
      state.win = 0;
      state.lastVerdict = null;
      state.dreamCardIndex = null;
      resetMultipliers(null);
      setMessage(paytable.feature === 'none' ? 'PLAY 1 TO 5 CREDITS PER HAND' : feature().label + ' · 10 CREDITS PER HAND', 'info');
      el.verdict.textContent = '';
      el.verdict.className = 'vpt-verdict';
    }

    function repaint() {
      renderSetup();
      renderPaytable();
      renderMainHand();
      renderMiniHands();
      renderStatus();
      renderStats();
      renderButtons();
    }

    /* ---------- public API ---------- */

    var api = {
      dealHand: function (cards) {
        var hand = E.parseHand(cards);
        if (hand.length !== 5) throw new Error('dealHand needs exactly 5 cards');
        if (state.dreamCardJob) { state.dreamCardJob.cancel(); state.dreamCardJob = null; }
        state.phase = 'attract';
        deal(hand);
        return api;
      },
      queueHand: function (cards) {
        var hand = E.parseHand(cards);
        if (hand.length !== 5) throw new Error('queueHand needs exactly 5 cards');
        state.queuedHand = hand;
        renderButtons();
        return api;
      },
      /* Forces the bottom (playable) hand's replacements, left to right; the other hands still draw at random. */
      setDrawCards: function (cards) {
        state.queuedDraw = E.parseHand(cards);
        return api;
      },
      deal: function () { deal(); return api; },
      draw: function () { draw(); return api; },
      toggleHold: function (i) {
        if (state.phase !== 'dealt' || i < 0 || i > 4) return api;
        state.held[i] = !state.held[i];
        el.slots[i].classList.toggle('vpt-held', state.held[i]);
        renderMiniHands();
        emit('holdchange', { held: state.held.slice() });
        return api;
      },
      setHolds: function (indices) {
        if (state.phase !== 'dealt') return api;
        state.held = [false, false, false, false, false];
        indices.forEach(function (i) { state.held[i] = true; });
        renderMainHand();
        renderMiniHands();
        emit('holdchange', { held: state.held.slice() });
        return api;
      },
      /* Coins per hand toward the paytable, 1..5 (features always play 5, plus the 5-coin fee). */
      setBet: function (n) {
        if (state.phase !== 'attract' || paytable.feature !== 'none') return api;
        state.bet = Math.min(5, Math.max(1, Math.round(n)));
        renderPaytable();
        renderStatus();
        renderButtons();
        emit('betchange', { bet: state.bet });
        return api;
      },
      setHandCount: function (n) {
        if (state.phase !== 'attract') return api;
        var count = resolveHandCount(n);
        if (count === state.handCount) return api;
        state.handCount = count;
        resetTable();
        buildMiniRows();
        repaint();
        emit('handcountchange', { handCount: count });
        return api;
      },
      /* 'none', 'ultimate-x' or 'dream-card'; switches to that feature's first game. */
      setFeature: function (key) {
        if (state.phase !== 'attract' || !F.feature(key) || key === paytable.feature) return api;
        return api.setGame(F.defaultPaytable(key).id);
      },
      /* Switch paytables (a catalog id, or a custom paytable object with no feature). Credits carry over; the table and stats reset. */
      setGame: function (spec) {
        if (state.phase !== 'attract') return api;
        paytable = resolvePaytable(spec);
        if (paytable.feature !== 'none') state.bet = 5;
        resetTable();
        state.stats = { hands: 0, optimal: 0, evLost: 0 };
        repaint();
        emit('gamechange', { paytable: paytable.id || paytable.name, feature: paytable.feature });
        return api;
      },
      addCredits: function (n) {
        state.credits += n;
        renderStatus();
        renderButtons();
        emit('creditschange', { credits: state.credits });
        return api;
      },
      setOptimalTolerance: function (n) {
        var v = Math.max(0, Number(n));
        if (!isFinite(v)) return api;
        state.settings.optimalTolerance = v;
        el.toleranceInput.value = v;
        emit('settingschange', { optimalTolerance: v });
        return api;
      },
      hint: function () { showHint(); return api; },
      analyze: function () {
        if (!state.hand || state.phase === 'dealing') return null;
        finishAnalysisSync();
        return state.analysis.map(function (r) {
          return { hold: r.heldIndices.slice(), cards: r.heldCards.map(E.cardToString), ev: r.ev };
        });
      },
      getState: function () {
        return {
          phase: state.phase,
          feature: paytable.feature,
          paytable: paytable.id || paytable.name,
          handCount: state.handCount,
          hand: state.hand && state.phase !== 'dealing' ? state.hand.map(E.cardToString) : null,
          held: state.held.slice(),
          hands: state.hands ? state.hands.map(function (h) {
            return { cards: h.cards.map(E.cardToString), category: h.category, base: h.base, multiplier: h.multiplier, win: h.win };
          }) : null,
          multipliers: state.multipliers.slice(),
          dreamCardIndex: state.dreamCardIndex,
          bet: state.bet,
          totalBet: totalBet(),
          credits: state.credits,
          win: state.win,
          stats: { hands: state.stats.hands, optimal: state.stats.optimal, evLost: state.stats.evLost },
          settings: { optimalTolerance: state.settings.optimalTolerance },
          lastVerdict: state.lastVerdict
        };
      },
      on: function (name, cb) {
        (listeners[name] = listeners[name] || []).push(cb);
        return api;
      },
      off: function (name, cb) {
        listeners[name] = (listeners[name] || []).filter(function (f) { return f !== cb; });
        return api;
      },
      element: root
    };

    /* ---------- wiring ---------- */

    el.deal.addEventListener('click', function () { if (state.phase === 'dealt') draw(); else deal(); });
    el.betOne.addEventListener('click', function () { api.setBet(state.bet >= 5 ? 1 : state.bet + 1); });
    el.betMax.addEventListener('click', function () {
      if (state.phase !== 'attract') return;
      api.setBet(5);
      deal();
    });
    el.hint.addEventListener('click', showHint);
    el.rebuy.addEventListener('click', function () { api.addCredits(REBUY_AMOUNT); });
    el.settingsBtn.addEventListener('click', function () {
      el.toleranceInput.value = state.settings.optimalTolerance;
      el.settingsModal.classList.add('vpt-open');
    });
    el.toleranceInput.addEventListener('change', function () { api.setOptimalTolerance(el.toleranceInput.value); });
    el.paysBtn.addEventListener('click', function () {
      renderPaytable();
      el.paysModal.classList.add('vpt-open');
    });
    el.analysisBtn.addEventListener('click', function () {
      if (state.hand && state.phase === 'dealt') finishAnalysisSync();
      renderAnalysis(state.phase === 'attract' && state.lastVerdict ? playerMask() : null);
      el.analysisModal.classList.add('vpt-open');
    });
    el.featureSelect.addEventListener('change', function () { api.setFeature(el.featureSelect.value); });
    el.gameSelect.addEventListener('change', function () {
      var group = F.games(paytable.feature).filter(function (g) { return g.game === el.gameSelect.value; })[0];
      if (group) api.setGame(group.paytables[0].id);
    });
    el.paySelect.addEventListener('change', function () { api.setGame(el.paySelect.value); });
    el.countSelect.addEventListener('change', function () { api.setHandCount(el.countSelect.value); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      [el.settingsModal, el.paysModal, el.analysisModal].forEach(function (m) { m.classList.remove('vpt-open'); });
    });

    /*
     * Swipe-to-hold, as in trainer.js: dragging across cards holds (or
     * unholds) every card crossed, matching the first card's new state. A
     * plain tap is left to the slot's click handler so it isn't toggled twice.
     */
    var swipe = null;
    function slotIndexAtPoint(x, y) {
      var target = document.elementFromPoint(x, y);
      var slotEl = target && target.closest ? target.closest('.vpt-slot') : null;
      return slotEl ? el.slots.indexOf(slotEl) : -1;
    }
    el.cards.addEventListener('touchstart', function (ev) {
      if (state.phase !== 'dealt' || ev.touches.length !== 1) return;
      var t = ev.touches[0];
      var idx = slotIndexAtPoint(t.clientX, t.clientY);
      if (idx < 0) return;
      swipe = { startIndex: idx, targetHeld: !state.held[idx], visited: {}, moved: false };
      swipe.visited[idx] = true;
    }, { passive: true });
    el.cards.addEventListener('touchmove', function (ev) {
      if (!swipe || ev.touches.length !== 1) return;
      var t = ev.touches[0];
      var idx = slotIndexAtPoint(t.clientX, t.clientY);
      if (idx < 0 || swipe.visited[idx]) return;
      swipe.visited[idx] = true;
      if (!swipe.moved) {
        swipe.moved = true;
        if (state.held[swipe.startIndex] !== swipe.targetHeld) api.toggleHold(swipe.startIndex);
      }
      if (state.held[idx] !== swipe.targetHeld) api.toggleHold(idx);
      ev.preventDefault();
    }, { passive: false });
    el.cards.addEventListener('touchend', function (ev) {
      if (swipe && swipe.moved) ev.preventDefault();
      swipe = null;
    }, { passive: false });
    el.cards.addEventListener('touchcancel', function () { swipe = null; }, { passive: true });

    if (options.keyboard !== false) {
      document.addEventListener('keydown', function (ev) {
        if (ev.target && /^(input|textarea|select)$/i.test(ev.target.tagName)) return;
        var k = ev.key;
        if (k >= '1' && k <= '5') api.toggleHold(Number(k) - 1);
        else if (k === ' ' || k === 'Enter') {
          ev.preventDefault();
          if (state.phase === 'dealt') draw(); else deal();
        }
        else if (k === 'b' || k === 'B') el.betOne.click();
        else if (k === 'm' || k === 'M') el.betMax.click();
        else if (k === 'h' || k === 'H') showHint();
        else if (k === 'a' || k === 'A') el.analysisBtn.click();
        else if (k === 'p' || k === 'P') el.paysBtn.click();
        else if (k === 's' || k === 'S') el.settingsBtn.click();
      });
    }

    /* ---------- initial paint ---------- */
    var restoredMultipliers = state.multipliers.slice();
    resetTable();
    state.multipliers = restoredMultipliers; // a saved Ultimate X session keeps what its hands had earned
    buildMiniRows();
    repaint();

    return api;
  }

  global.MultiPlayTrainer = {
    create: create,
    Engine: E,
    Features: F,
    HAND_COUNTS: HAND_COUNTS.slice()
  };
})(typeof self !== 'undefined' ? self : this);
