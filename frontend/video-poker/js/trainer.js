/*
 * VideoPokerTrainer: an IGT Game King-style video poker trainer UI.
 *
 * Usage:
 *   var game = VideoPokerTrainer.create(containerElement, { credits: 400 });
 *   game.dealHand(['AS', 'KS', 'QS', 'JS', '9D']);   // feed a specific hand
 *   game.setDrawCards(['10S']);                       // control the replacements
 *   game.on('draw', function (e) { console.log(e); });
 *
 * Cards are accepted as "AS"/"10H" strings, {rank, suit} objects, or 0..51 ints
 * (see engine.js parseCard). Requires engine.js to be loaded first.
 */
(function (global) {
  'use strict';

  var E = global.VPEngine;
  if (!E) throw new Error('VideoPokerTrainer requires engine.js (VPEngine) to be loaded first');

  /*
   * Floating-point safety margin only — not user-configurable. Exact ties
   * can differ by ~1e-15 depending on summation order, so this keeps a
   * genuinely-tied hold from being misgraded even when the user sets the
   * optimal hold tolerance to 0 (which should mean "require exactness",
   * not "reject due to floating-point noise").
   */
  var EV_EPSILON = 1e-9;
  var DEFAULT_OPTIMAL_TOLERANCE = 1.0;
  var REBUY_AMOUNT = 500;
  var nextInstanceId = 0; // keeps each instance's <label for> / <input id> pair unique on the page

  /* Games offered by the built-in variant selector, in menu order. */
  var GAME_LIST = [
    { key: 'jacks-or-better-9-6', label: 'Jacks or Better' },
    { key: 'bonus-poker-8-5', label: 'Bonus Poker' },
    { key: 'bonus-poker-deluxe-9-6', label: 'Bonus Poker Deluxe' },
    { key: 'double-double-bonus-9-6', label: 'Double Double Bonus' },
    { key: 'triple-double-bonus-9-7', label: 'Triple Double Bonus' },
    { key: 'triple-triple-bonus', label: 'Triple Triple Bonus' },
    { key: 'deuces-wild-nsu-100', label: 'Deuces Wild' },
    { key: 'jokers-wild-kings-or-better', label: 'Jokers Wild' }
  ];

  function resolvePaytable(spec) {
    var paytable = typeof spec === 'object' && spec !== null ? spec : E.PAYTABLES[spec || 'jacks-or-better-9-6'];
    if (!paytable) throw new Error('Unknown paytable: ' + spec);
    return paytable;
  }

  function create(container, options) {
    options = options || {};
    var paytable = resolvePaytable(options.paytable);
    var instanceId = nextInstanceId++;

    /* ---------- state ---------- */
    var state = {
      phase: 'attract',           // 'attract' | 'dealt'
      credits: options.credits != null ? options.credits : 400,
      bet: Math.min(5, Math.max(1, options.bet || 5)),
      win: 0,
      hand: null,                 // 5 card ints once dealt
      held: [false, false, false, false, false],
      drawStack: null,            // replacement cards for the current hand
      queuedHand: null,           // forced cards for the next deal
      queuedDraw: null,           // forced replacements for the next deal
      analysis: null,             // sorted hold analysis for the current hand
      analysisJob: null,
      hintUsed: false,
      lastVerdict: null,
      stats: { hands: 0, optimal: 0, evLost: 0 },
      settings: {
        // A hold within this many coins of the exact-best EV is still
        // graded OPTIMAL, not just "close" — 0 requires an exact match.
        optimalTolerance: options.optimalTolerance != null
          ? Math.max(0, options.optimalTolerance)
          : DEFAULT_OPTIMAL_TOLERANCE
      }
    };

    var listeners = {};

    function emit(name, payload) {
      (listeners[name] || []).forEach(function (cb) { cb(payload); });
    }

    /* ---------- DOM ---------- */
    var root = document.createElement('div');
    root.className = 'vpt';
    root.innerHTML =
      '<div class="vpt-screen">' +
      '  <table class="vpt-paytable"><colgroup>' +
      '    <col><col><col><col><col><col>' +
      '  </colgroup><tbody></tbody></table>' +
      '  <div class="vpt-msgrow"><div class="vpt-message"></div></div>' +
      '  <div class="vpt-cards"></div>' +
      '  <div class="vpt-trainer">' +
      '    <button class="vpt-btn vpt-btn-hint" style="flex:0 0 auto;font-size:13px;padding:6px 14px;">HINT</button>' +
      '    <div class="vpt-verdict"></div>' +
      '    <div class="vpt-stats"></div>' +
      '  </div>' +
      '  <div class="vpt-status">' +
      '    <select class="vpt-gameselect"></select>' +
      '    <span><span class="vpt-bet"></span>&nbsp;&nbsp;<span class="vpt-win"></span></span>' +
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
      '</div>' +
      '<div class="vpt-analysis"><h3>HOLD ANALYSIS (EV IN COINS AT CURRENT BET)</h3><table>' +
      '<thead><tr><th>#</th><th>HOLD</th><th style="text-align:right">EV</th></tr></thead>' +
      '<tbody></tbody></table></div>';
    container.appendChild(root);

    /*
     * The settings modal is deliberately NOT a descendant of `root` — root
     * gets `transform: scale(...)` applied to it by whatever page mounts
     * this widget (both index.html and discord.html do, to fit the widget
     * to the viewport). A `position: fixed` element nested inside a
     * transformed ancestor is positioned relative to THAT ancestor, not the
     * real viewport, so a modal built as a child of root would end up
     * trapped and shrunk inside the widget's own (possibly tiny, scaled-
     * down) box instead of overlaying the whole screen. Appending it to
     * <body> instead sidesteps that entirely.
     */
    var modal = document.createElement('div');
    modal.className = 'vpt-modal-backdrop';
    modal.innerHTML =
      '<div class="vpt-modal" role="dialog" aria-modal="true" aria-labelledby="vpt-settings-title-' + instanceId + '">' +
      '  <h3 id="vpt-settings-title-' + instanceId + '">SETTINGS</h3>' +
      '  <div class="vpt-settings-row">' +
      '    <label for="vpt-tol-input-' + instanceId + '">OPTIMAL HOLD TOLERANCE (COINS)</label>' +
      '    <input type="number" id="vpt-tol-input-' + instanceId + '" class="vpt-tol-input" min="0" step="0.1">' +
      '  </div>' +
      '  <p class="vpt-settings-hint">A hold within this many coins of the best EV is graded OPTIMAL. ' +
      '0 requires an exact match.</p>' +
      '  <button class="vpt-btn vpt-btn-settings-close">Done</button>' +
      '</div>';
    document.body.appendChild(modal);

    var el = {
      paytableBody: root.querySelector('.vpt-paytable tbody'),
      paytableCols: root.querySelectorAll('.vpt-paytable col'),
      message: root.querySelector('.vpt-message'),
      cards: root.querySelector('.vpt-cards'),
      verdict: root.querySelector('.vpt-verdict'),
      stats: root.querySelector('.vpt-stats'),
      gameSelect: root.querySelector('.vpt-gameselect'),
      bet: root.querySelector('.vpt-bet'),
      win: root.querySelector('.vpt-win'),
      credit: root.querySelector('.vpt-credit'),
      hint: root.querySelector('.vpt-btn-hint'),
      rebuy: root.querySelector('.vpt-btn-rebuy'),
      analysisBtn: root.querySelector('.vpt-btn-analysis'),
      payToggle: root.querySelector('.vpt-btn-paytoggle'),
      betOne: root.querySelector('.vpt-btn-betone'),
      betMax: root.querySelector('.vpt-btn-betmax'),
      deal: root.querySelector('.vpt-btn-deal'),
      analysisPanel: root.querySelector('.vpt-analysis'),
      analysisBody: root.querySelector('.vpt-analysis tbody'),
      settingsBtn: root.querySelector('.vpt-btn-settings'),
      settingsModal: modal,
      settingsClose: modal.querySelector('.vpt-btn-settings-close'),
      toleranceInput: modal.querySelector('.vpt-tol-input'),
      slots: []
    };
    el.toleranceInput.value = state.settings.optimalTolerance;

    /* variant selector */
    GAME_LIST.forEach(function (g) {
      var opt = document.createElement('option');
      opt.value = g.key;
      opt.textContent = g.label.toUpperCase();
      el.gameSelect.appendChild(opt);
    });
    if (paytable.id && GAME_LIST.some(function (g) { return g.key === paytable.id; })) {
      el.gameSelect.value = paytable.id;
    } else {
      var customOpt = document.createElement('option');
      customOpt.value = '__custom__';
      customOpt.textContent = paytable.name;
      el.gameSelect.appendChild(customOpt);
      el.gameSelect.value = '__custom__';
    }

    function renderPaytableRows() {
      el.paytableBody.innerHTML = '';
      paytable.rows.forEach(function (row) {
        var tr = document.createElement('tr');
        var cells = ['<td>' + row.label + '</td>'];
        row.pays.forEach(function (p) { cells.push('<td>' + p + '</td>'); });
        tr.innerHTML = cells.join('');
        tr.dataset.category = row.category;
        el.paytableBody.appendChild(tr);
      });
    }
    renderPaytableRows();

    /* card slots */
    for (var i = 0; i < 5; i++) {
      var slot = document.createElement('div');
      slot.className = 'vpt-slot';
      slot.innerHTML = '<div class="vpt-heldtag">HELD</div><div class="vpt-card vpt-back"></div>';
      (function (idx) {
        slot.addEventListener('click', function () { api.toggleHold(idx); });
      })(i);
      el.cards.appendChild(slot);
      el.slots.push(slot);
    }

    /* ---------- rendering ---------- */

    function renderCard(cardEl, card) {
      if (E.isJoker(card)) {
        cardEl.className = 'vpt-card vpt-joker';
        cardEl.innerHTML =
          '<div class="vpt-corner">JKR</div>' +
          '<div class="vpt-joker-face"><div class="vpt-joker-label">JOKER</div></div>';
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
        '<div class="vpt-corner">' + rankChar + '<span>' + glyph + '</span></div>' + wildStack + center;
    }

    function renderHand() {
      for (var i = 0; i < 5; i++) {
        var slot = el.slots[i];
        var cardEl = slot.querySelector('.vpt-card');
        if (state.hand) {
          renderCard(cardEl, state.hand[i]);
        } else {
          cardEl.className = 'vpt-card vpt-back';
          cardEl.innerHTML = '';
        }
        slot.classList.toggle('vpt-held', state.held[i]);
        slot.classList.toggle('vpt-disabled', state.phase !== 'dealt');
        slot.classList.remove('vpt-hint', 'vpt-best');
      }
    }

    function setMessage(text, mode) {
      el.message.textContent = text;
      el.message.className = 'vpt-message' + (mode ? ' vpt-' + mode : '');
    }

    function clearPayHighlight() {
      el.paytableBody.querySelectorAll('.vpt-pay-hit').forEach(function (td) {
        td.classList.remove('vpt-pay-hit');
      });
    }

    function highlightPayRow(category) {
      clearPayHighlight();
      var tr = el.paytableBody.querySelector('tr[data-category="' + category + '"]');
      if (tr) tr.cells[state.bet].classList.add('vpt-pay-hit');
    }

    function renderStatus() {
      el.bet.textContent = 'BET ' + state.bet;
      el.win.textContent = 'WIN ' + state.win;
      el.credit.textContent = 'CREDIT ' + state.credits;
      el.paytableCols.forEach(function (col, idx) {
        col.className = idx === state.bet ? 'vpt-bet-active-col' : '';
      });
    }

    function renderStats() {
      var s = state.stats;
      if (s.hands === 0) {
        el.stats.textContent = '';
        return;
      }
      var pct = Math.round((s.optimal / s.hands) * 100);
      el.stats.textContent = 'HANDS ' + s.hands + ' · OPTIMAL ' + pct + '%';
    }

    function renderButtons() {
      var dealt = state.phase === 'dealt';
      el.deal.textContent = dealt ? 'Draw' : 'Deal';
      el.deal.disabled = !dealt && state.credits < state.bet && !state.queuedHand;
      el.betOne.disabled = dealt;
      el.betMax.disabled = dealt || (state.credits < 5 && !state.queuedHand);
      el.hint.disabled = !dealt;
    }

    function holdLabel(item) {
      if (item.heldCards.length === 0) return '(discard all five)';
      return item.heldCards.map(E.cardToPretty).join(' ');
    }

    function renderAnalysisPanel(playerMask) {
      var body = el.analysisBody;
      body.innerHTML = '';
      if (!state.analysis) {
        body.innerHTML = '<tr><td colspan="3">Deal a hand first.</td></tr>';
        return;
      }
      var bestEV = state.analysis[0].ev;
      state.analysis.slice(0, 8).forEach(function (item, idx) {
        var tr = document.createElement('tr');
        if (item.ev >= bestEV - EV_EPSILON) tr.className = 'vpt-optimal';
        else if (playerMask != null && item.mask === playerMask) tr.className = 'vpt-yours';
        tr.innerHTML = '<td>' + (idx + 1) + '</td><td>' + holdLabel(item) + '</td>' +
          '<td class="vpt-ev">' + item.ev.toFixed(4) + '</td>';
        body.appendChild(tr);
      });
      if (playerMask != null) {
        var inTop = state.analysis.slice(0, 8).some(function (r) { return r.mask === playerMask; });
        if (!inTop) {
          var yours = state.analysis.find(function (r) { return r.mask === playerMask; });
          var rank = state.analysis.indexOf(yours) + 1;
          var tr2 = document.createElement('tr');
          tr2.className = 'vpt-yours';
          tr2.innerHTML = '<td>' + rank + '</td><td>' + holdLabel(yours) + ' (your hold)</td>' +
            '<td class="vpt-ev">' + yours.ev.toFixed(4) + '</td>';
          body.appendChild(tr2);
        }
      }
    }

    /* ---------- analysis ---------- */

    function startAnalysis() {
      if (state.analysisJob) state.analysisJob.cancel();
      state.analysis = null;
      var job = E.analyzeHoldsAsync(state.hand, state.bet, paytable);
      state.analysisJob = job;
      job.promise.then(function (results) {
        if (state.analysisJob !== job) return;
        state.analysis = results;
        state.analysisJob = null;
        if (el.analysisPanel.classList.contains('vpt-open')) renderAnalysisPanel(null);
        emit('analysis', { results: results });
      }, function () { /* cancelled */ });
    }

    function playerMask() {
      var mask = 0;
      for (var i = 0; i < 5; i++) if (state.held[i]) mask |= 1 << i;
      return mask;
    }

    function optimalItems() {
      var best = state.analysis[0].ev;
      return state.analysis.filter(function (r) { return r.ev >= best - EV_EPSILON; });
    }

    /* ---------- game actions ---------- */

    function deal(forcedHand) {
      if (state.phase === 'dealt') return;
      var forced = forcedHand || state.queuedHand;
      if (!forced && state.credits < state.bet) {
        setMessage('INSERT CREDITS', 'info');
        return;
      }
      state.credits -= state.bet;
      state.win = 0;
      var includeJoker = paytable.deck === 53;
      state.hand = forced ? forced.slice() : null;
      if (!state.hand) {
        var deck = E.shuffledDeck([], undefined, includeJoker);
        state.hand = deck.slice(0, 5);
        state.drawStack = deck.slice(5);
      } else {
        state.drawStack = E.shuffledDeck(state.hand, undefined, includeJoker);
      }
      if (state.queuedDraw) {
        var forcedDraw = state.queuedDraw.filter(function (c) {
          return state.hand.indexOf(c) === -1;
        });
        state.drawStack = forcedDraw.concat(state.drawStack.filter(function (c) {
          return forcedDraw.indexOf(c) === -1;
        }));
      }
      state.queuedHand = null;
      state.queuedDraw = null;
      state.held = [false, false, false, false, false];
      state.phase = 'dealt';
      state.hintUsed = false;
      state.lastVerdict = null;
      clearPayHighlight();

      var dealtCat = E.resolveCategory(state.hand, paytable);
      if (dealtCat !== E.CATEGORY.NOTHING) {
        setMessage(E.CATEGORY_NAMES[dealtCat], 'info');
      } else {
        setMessage('');
      }
      el.verdict.textContent = 'HOLD CARDS · THEN PRESS DRAW';
      el.verdict.className = 'vpt-verdict vpt-neutral';

      startAnalysis();
      renderHand();
      renderStatus();
      renderButtons();
      renderAnalysisPanel(null);
      emit('deal', { hand: state.hand.map(E.cardToString), bet: state.bet });
    }

    function finishAnalysisSync() {
      if (!state.analysis) {
        if (state.analysisJob) { state.analysisJob.cancel(); state.analysisJob = null; }
        state.analysis = E.analyzeHolds(state.hand, state.bet, paytable);
      }
    }

    function draw() {
      if (state.phase !== 'dealt') return;
      finishAnalysisSync();

      var mask = playerMask();
      var playerItem = state.analysis.find(function (r) { return r.mask === mask; });
      var best = state.analysis[0];
      var evDiff = best.ev - playerItem.ev;
      var wasExact = evDiff <= EV_EPSILON;
      // The configured tolerance is the pass bar; EV_EPSILON is a floor
      // under it so setting the tolerance to 0 still means "require
      // exactness" rather than "reject genuine ties over floating-point
      // noise" (see the EV_EPSILON comment above).
      var tolerance = Math.max(state.settings.optimalTolerance, EV_EPSILON);
      var wasOptimal = evDiff <= tolerance;

      var stackIdx = 0;
      for (var i = 0; i < 5; i++) {
        if (!state.held[i]) state.hand[i] = state.drawStack[stackIdx++];
      }
      var category = E.resolveCategory(state.hand, paytable);
      var won = E.payout(category, state.bet, paytable);
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

      if (category !== E.CATEGORY.NOTHING) {
        setMessage(E.CATEGORY_NAMES[category] + '  ' + won, 'win');
        highlightPayRow(category);
      } else {
        setMessage('GAME OVER');
      }

      renderHand();
      if (wasOptimal) {
        el.verdict.textContent = wasExact
          ? '✓ OPTIMAL HOLD · EV ' + best.ev.toFixed(3)
          : '✓ OPTIMAL HOLD · EV ' + playerItem.ev.toFixed(3) + ' (BEST ' + best.ev.toFixed(3) + ')';
        el.verdict.className = 'vpt-verdict vpt-good';
      } else {
        el.verdict.textContent = '✗ BEST: ' + holdLabel(best) +
          ' · EV ' + best.ev.toFixed(3) + ' VS YOURS ' + playerItem.ev.toFixed(3);
        el.verdict.className = 'vpt-verdict vpt-bad';
        best.heldIndices.forEach(function (idx) {
          el.slots[idx].classList.add('vpt-best');
        });
      }
      renderStats();
      renderStatus();
      renderButtons();
      renderAnalysisPanel(mask);

      emit('draw', {
        finalHand: state.hand.map(E.cardToString),
        category: category,
        categoryName: E.CATEGORY_NAMES[category],
        won: won,
        credits: state.credits,
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
      optimalItems()[0].heldIndices.forEach(function (i) { bestSet[i] = true; });
      for (var i = 0; i < 5; i++) {
        el.slots[i].classList.toggle('vpt-hint', !!bestSet[i]);
      }
      el.verdict.textContent = optimalItems()[0].heldIndices.length
        ? 'HINT: HOLD THE MARKED CARDS'
        : 'HINT: DISCARD ALL FIVE';
      el.verdict.className = 'vpt-verdict vpt-neutral';
    }

    /* ---------- public API ---------- */

    var api = {
      /* Deal a specific 5-card hand immediately (any card format). */
      dealHand: function (cards) {
        var hand = E.parseHand(cards);
        if (hand.length !== 5) throw new Error('dealHand needs exactly 5 cards');
        if (state.phase === 'dealt') state.phase = 'attract';
        deal(hand);
        return api;
      },
      /* Use these cards for the next Deal-button press instead of dealing now. */
      queueHand: function (cards) {
        var hand = E.parseHand(cards);
        if (hand.length !== 5) throw new Error('queueHand needs exactly 5 cards');
        state.queuedHand = hand;
        renderButtons();
        return api;
      },
      /*
       * Force the replacement cards. Cards are dealt in order to discarded
       * positions left to right. Applies to the current hand if one is live,
       * otherwise to the next deal.
       */
      setDrawCards: function (cards) {
        var draw = E.parseHand(cards);
        if (state.phase === 'dealt') {
          var filtered = draw.filter(function (c) { return state.hand.indexOf(c) === -1; });
          state.drawStack = filtered.concat(state.drawStack.filter(function (c) {
            return filtered.indexOf(c) === -1;
          }));
        } else {
          state.queuedDraw = draw;
        }
        return api;
      },
      deal: function () { deal(); return api; },
      draw: function () { draw(); return api; },
      toggleHold: function (i) {
        if (state.phase !== 'dealt' || i < 0 || i > 4) return api;
        state.held[i] = !state.held[i];
        el.slots[i].classList.toggle('vpt-held', state.held[i]);
        emit('holdchange', { held: state.held.slice() });
        return api;
      },
      setHolds: function (indices) {
        if (state.phase !== 'dealt') return api;
        state.held = [false, false, false, false, false];
        indices.forEach(function (i) { state.held[i] = true; });
        renderHand();
        emit('holdchange', { held: state.held.slice() });
        return api;
      },
      setBet: function (n) {
        if (state.phase === 'dealt') return api;
        state.bet = Math.min(5, Math.max(1, Math.round(n)));
        renderStatus();
        renderButtons();
        emit('betchange', { bet: state.bet });
        return api;
      },
      addCredits: function (n) {
        state.credits += n;
        renderStatus();
        renderButtons();
        return api;
      },
      /* 0 requires an exact-tie hold to grade OPTIMAL; higher values are more forgiving. */
      setOptimalTolerance: function (n) {
        var v = Math.max(0, Number(n));
        if (!isFinite(v)) return api;
        state.settings.optimalTolerance = v;
        el.toleranceInput.value = v;
        emit('settingschange', { optimalTolerance: v });
        return api;
      },
      /*
       * Switch games (e.g. 'deuces-wild-nsu-100', or a custom paytable
       * object). Credits carry over; the current hand, stats, and hint/
       * analysis state reset since they are specific to the previous game.
       */
      setGame: function (spec) {
        if (state.analysisJob) { state.analysisJob.cancel(); state.analysisJob = null; }
        paytable = resolvePaytable(spec);
        state.phase = 'attract';
        state.hand = null;
        state.drawStack = null;
        state.queuedHand = null;
        state.queuedDraw = null;
        state.held = [false, false, false, false, false];
        state.analysis = null;
        state.win = 0;
        state.lastVerdict = null;
        state.stats = { hands: 0, optimal: 0, evLost: 0 };
        if (paytable.id && GAME_LIST.some(function (g) { return g.key === paytable.id; })) {
          el.gameSelect.value = paytable.id;
        } else {
          el.gameSelect.value = '__custom__';
        }
        renderPaytableRows();
        clearPayHighlight();
        setMessage('PLAY 1 TO 5 CREDITS', 'info');
        el.verdict.textContent = '';
        el.verdict.className = 'vpt-verdict';
        el.analysisPanel.classList.remove('vpt-open');
        renderHand();
        renderStatus();
        renderStats();
        renderButtons();
        emit('gamechange', { paytable: paytable.id || paytable.name });
        return api;
      },
      hint: function () { showHint(); return api; },
      /* Ranked exact EV of all 32 holds for the live hand (blocking). */
      analyze: function () {
        if (!state.hand) return null;
        finishAnalysisSync();
        return state.analysis.map(function (r) {
          return {
            hold: r.heldIndices.slice(),
            cards: r.heldCards.map(E.cardToString),
            ev: r.ev
          };
        });
      },
      getState: function () {
        return {
          phase: state.phase,
          paytable: paytable.id || paytable.name,
          hand: state.hand ? state.hand.map(E.cardToString) : null,
          held: state.held.slice(),
          bet: state.bet,
          credits: state.credits,
          win: state.win,
          stats: {
            hands: state.stats.hands,
            optimal: state.stats.optimal,
            evLost: state.stats.evLost
          },
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

    el.deal.addEventListener('click', function () {
      if (state.phase === 'dealt') draw(); else deal();
    });
    el.betOne.addEventListener('click', function () {
      api.setBet(state.bet >= 5 ? 1 : state.bet + 1);
    });
    el.betMax.addEventListener('click', function () {
      if (state.phase === 'dealt') return;
      api.setBet(5);
      deal();
    });
    el.hint.addEventListener('click', showHint);
    el.rebuy.addEventListener('click', function () { api.addCredits(REBUY_AMOUNT); });
    function openSettings() {
      el.toleranceInput.value = state.settings.optimalTolerance;
      el.settingsModal.classList.add('vpt-open');
    }
    function closeSettings() {
      el.settingsModal.classList.remove('vpt-open');
    }
    el.settingsBtn.addEventListener('click', openSettings);
    el.settingsClose.addEventListener('click', closeSettings);
    el.settingsModal.addEventListener('click', function (ev) {
      if (ev.target === el.settingsModal) closeSettings(); // backdrop click, not the dialog itself
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && el.settingsModal.classList.contains('vpt-open')) closeSettings();
    });
    el.toleranceInput.addEventListener('change', function () {
      api.setOptimalTolerance(el.toleranceInput.value);
    });
    el.analysisBtn.addEventListener('click', function () {
      el.analysisPanel.classList.toggle('vpt-open');
      if (el.analysisPanel.classList.contains('vpt-open')) {
        if (state.hand && state.phase === 'dealt') finishAnalysisSync();
        renderAnalysisPanel(state.phase === 'attract' && state.lastVerdict ? playerMask() : null);
      }
    });
    el.payToggle.addEventListener('click', function () {
      root.querySelector('.vpt-paytable').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    el.gameSelect.addEventListener('change', function () {
      if (el.gameSelect.value !== '__custom__') api.setGame(el.gameSelect.value);
    });

    /*
     * Swipe-to-hold: drag a finger across multiple cards to hold (or
     * unhold) all of them in one gesture, instead of tapping each one.
     * The first card touched decides the target state (hold if it wasn't
     * held, unhold if it was); every other card the finger passes over
     * during the same gesture is set to match.
     *
     * A plain tap (touchstart/touchend with no movement to a different
     * card) is deliberately left alone here and falls through to the
     * ordinary 'click' listener on the slot, so it isn't touched twice —
     * calling toggleHold from both this handler and the click handler
     * would cancel itself out. Only once the gesture is confirmed as a
     * genuine swipe (crossing into a second slot) does this code commit
     * the starting card's state and start suppressing the synthetic click
     * that would otherwise fire on release.
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
      if (swipe && swipe.moved) ev.preventDefault(); // a real swipe: suppress the trailing synthetic click
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
        else if (k === 's' || k === 'S') el.settingsBtn.click();
      });
    }

    /* ---------- initial paint ---------- */
    setMessage('PLAY 1 TO 5 CREDITS', 'info');
    el.verdict.textContent = '';
    renderHand();
    renderStatus();
    renderStats();
    renderButtons();

    return api;
  }

  global.VideoPokerTrainer = { create: create, Engine: E };
})(typeof self !== 'undefined' ? self : this);
