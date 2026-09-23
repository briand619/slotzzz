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
  /*
   * Multi-play hands (Dream Card) always fix the Dream Card at position 4
   * of the shared initial deal — which physical slot shows it is cosmetic
   * (see chooseDreamCard in engine.js), so there's no reason to randomize it.
   */
  var DREAM_CARD_SLOT = 4;

  /* Games offered by the built-in variant selector, in menu order. */
  var GAME_LIST = [
    { key: 'jacks-or-better-9-6', label: 'Jacks or Better' },
    { key: 'bonus-poker-8-5', label: 'Bonus Poker' },
    { key: 'super-aces-bonus-poker', label: 'Super Aces Bonus Poker' },
    { key: 'bonus-poker-deluxe-9-6', label: 'Bonus Poker Deluxe' },
    { key: 'double-double-bonus-9-6', label: 'Double Double Bonus' },
    { key: 'triple-double-bonus-9-7', label: 'Triple Double Bonus' },
    { key: 'triple-triple-bonus', label: 'Triple Triple Bonus' },
    { key: 'triple-double-bonus-dream-card', label: 'Triple Double Bonus Dream Card' },
    { key: 'deuces-wild-nsu-100', label: 'Deuces Wild' },
    { key: 'jokers-wild-kings-or-better', label: 'Jokers Wild' }
  ];

  function resolvePaytable(spec) {
    var paytable = typeof spec === 'object' && spec !== null ? spec : E.PAYTABLES[spec || 'jacks-or-better-9-6'];
    if (!paytable) throw new Error('Unknown paytable: ' + spec);
    return paytable;
  }

  /* Falls back to the paytable's default play count if `n` isn't one of its offered options. */
  function resolvePlayCount(n, multiplayMeta) {
    if (n != null && multiplayMeta.options.indexOf(n) !== -1) return n;
    return multiplayMeta.defaultCount;
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
      /*
       * Multi-play (Dream Card games): { count } when the current paytable
       * declares `multiplay`, else null. The shared initial hand/hold above
       * still drives strategy (identical EV ranking regardless of count —
       * see the chooseDreamCard comment in engine.js); multiHands holds
       * each simultaneous hand's own independent draw once DRAW is pressed.
       */
      multiplay: paytable.multiplay
        ? { count: resolvePlayCount(options.playCount, paytable.multiplay) }
        : null,
      multiHands: null,           // [{ finalHand, category, win }, ...] after draw, one per simultaneous hand
      dreamCardIndex: null,       // which of the 5 dealt positions is this deal's Dream Card, if any
      dreamCardJob: null,
      stats: {
        hands: (options.stats && options.stats.hands) || 0,
        optimal: (options.stats && options.stats.optimal) || 0,
        evLost: (options.stats && options.stats.evLost) || 0
      },
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
      '  <div class="vpt-multihands"></div>' +
      '  <div class="vpt-trainer">' +
      '    <button class="vpt-btn vpt-btn-hint" style="flex:0 0 auto;font-size:13px;padding:6px 14px;">HINT</button>' +
      '    <div class="vpt-verdict"></div>' +
      '    <div class="vpt-stats"></div>' +
      '  </div>' +
      '  <div class="vpt-status">' +
      '    <select class="vpt-gameselect"></select>' +
      '    <select class="vpt-playcount"></select>' +
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
      playCountSelect: root.querySelector('.vpt-playcount'),
      multiHands: root.querySelector('.vpt-multihands'),
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

    /* play-count selector: only relevant to multiplay (Dream Card) games */
    function renderPlayCountSelect() {
      el.playCountSelect.innerHTML = '';
      el.playCountSelect.classList.toggle('vpt-hidden', !paytable.multiplay);
      if (!paytable.multiplay) return;
      paytable.multiplay.options.forEach(function (n) {
        var opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n + '-PLAY';
        el.playCountSelect.appendChild(opt);
      });
      el.playCountSelect.value = state.multiplay.count;
    }
    renderPlayCountSelect();

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

    function renderCard(cardEl, card, isDreamCard) {
      var dreamTag = isDreamCard ? '<div class="vpt-dreamtag">DREAM CARD</div>' : '';
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

    function renderHand() {
      for (var i = 0; i < 5; i++) {
        var slot = el.slots[i];
        var cardEl = slot.querySelector('.vpt-card');
        if (state.hand) {
          renderCard(cardEl, state.hand[i], state.dreamCardIndex === i);
        } else {
          cardEl.className = 'vpt-card vpt-back';
          cardEl.innerHTML = '';
        }
        slot.classList.toggle('vpt-held', state.held[i]);
        slot.classList.toggle('vpt-disabled', state.phase !== 'dealt');
        slot.classList.remove('vpt-hint', 'vpt-best');
      }
    }

    /* Compact rank+suit label used in the multi-hand results grid — full
       card art for up to 10 x 5 = 50 simultaneous cards would overwhelm a
       phone screen, so these are plain colored text, not `.vpt-card`s. */
    function miniCardHtml(card) {
      if (E.isJoker(card)) return '<span class="vpt-minicard">JKR</span>';
      var suit = E.suitOf(card);
      var red = suit === 1 || suit === 2;
      return '<span class="vpt-minicard ' + (red ? 'vpt-redsuit' : 'vpt-blacksuit') + '">' +
        E.RANK_CHARS[E.rankOf(card)] + E.SUIT_GLYPHS[suit] + '</span>';
    }

    function renderMultiHands() {
      var container = el.multiHands;
      if (!state.multiplay) {
        container.innerHTML = '';
        container.classList.remove('vpt-open');
        return;
      }
      container.classList.add('vpt-open');
      if (!state.multiHands) {
        var placeholders = [];
        for (var i = 0; i < state.multiplay.count; i++) {
          placeholders.push('<div class="vpt-multihand-row vpt-pending">HAND ' + (i + 1) + '</div>');
        }
        container.innerHTML = placeholders.join('');
        return;
      }
      container.innerHTML = state.multiHands.map(function (h, idx) {
        var cardsHtml = h.finalHand.map(miniCardHtml).join('');
        var resultText = h.category !== E.CATEGORY.NOTHING
          ? E.CATEGORY_NAMES[h.category] + (h.win > 0 ? '  ' + h.win : '')
          : '';
        return '<div class="vpt-multihand-row' + (h.win > 0 ? ' vpt-win' : '') + '">' +
          '<span class="vpt-multihand-num">' + (idx + 1) + '</span>' +
          '<span class="vpt-multihand-cards">' + cardsHtml + '</span>' +
          '<span class="vpt-multihand-result">' + resultText + '</span>' +
          '</div>';
      }).join('');
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

    /*
     * Multiplay always doubles the wager as the Dream Card fee (per the
     * earlier design decision: the fee scales with the full multi-hand
     * wager, not a flat one-hand amount) — see the paytable's own comment
     * in engine.js for why this combination isn't a documented real game.
     */
    function wagerMultiplier() {
      if (!state.multiplay) return 1;
      return state.multiplay.count * (paytable.dreamCard ? 2 : 1);
    }
    function totalWager() {
      return state.bet * wagerMultiplier();
    }

    function renderStatus() {
      var mult = wagerMultiplier();
      el.bet.textContent = 'BET ' + state.bet + (mult > 1 ? ' × ' + mult + ' = ' + totalWager() : '');
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
      // 'dealing': a Dream Card pick is being computed asynchronously —
      // bet's already charged for this deal, so lock out everything that
      // could double-charge it or invalidate the in-flight computation,
      // same as while a hand is actually dealt.
      var locked = state.phase !== 'attract';
      el.deal.textContent = dealt ? 'Draw' : 'Deal';
      el.deal.disabled = locked ? !dealt : state.credits < totalWager() && !state.queuedHand;
      el.betOne.disabled = locked;
      el.betMax.disabled = locked || (state.credits < 5 * wagerMultiplier() && !state.queuedHand);
      el.hint.disabled = !dealt;
      el.playCountSelect.disabled = locked;
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

    /*
     * Finishes a deal once the 5-card hand is actually known — reached
     * either synchronously (forced hand, or no Dream Card this time) or
     * asynchronously (Dream Card triggered — see deal() below). Splitting
     * this out is what lets both paths share one completion routine
     * instead of duplicating the phase/render/emit bookkeeping.
     */
    function finishDeal(hand) {
      state.hand = hand;
      if (state.multiplay) {
        state.drawStack = null; // each simultaneous hand draws independently in draw()
      } else {
        var includeJoker = paytable.deck === 53;
        state.drawStack = E.shuffledDeck(state.hand, undefined, includeJoker);
        if (state.queuedDraw) {
          var forcedDraw = state.queuedDraw.filter(function (c) {
            return state.hand.indexOf(c) === -1;
          });
          state.drawStack = forcedDraw.concat(state.drawStack.filter(function (c) {
            return forcedDraw.indexOf(c) === -1;
          }));
        }
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
      renderMultiHands();
      renderStatus();
      renderButtons();
      renderAnalysisPanel(null);
      emit('deal', {
        hand: state.hand.map(E.cardToString),
        bet: state.bet,
        dreamCardIndex: state.dreamCardIndex,
        playCount: state.multiplay ? state.multiplay.count : 1
      });
    }

    function deal(forcedHand) {
      // 'dealing' (a Dream Card pick is being computed asynchronously,
      // below) blocks re-entry same as 'dealt' — the bet for THIS deal is
      // already charged, so starting another would double-charge it.
      if (state.phase !== 'attract') return;
      var forced = forcedHand || state.queuedHand;
      if (!forced && state.credits < totalWager()) {
        setMessage('INSERT CREDITS', 'info');
        return;
      }
      if (state.dreamCardJob) { state.dreamCardJob.cancel(); state.dreamCardJob = null; }
      state.credits -= totalWager();
      state.win = 0;
      state.multiHands = null;
      state.dreamCardIndex = null;
      var includeJoker = paytable.deck === 53;

      if (forced) {
        finishDeal(forced.slice());
        return;
      }

      if (paytable.dreamCard && Math.random() < paytable.dreamCard.probability) {
        var four = E.shuffledDeck([], undefined, includeJoker).slice(0, 4);
        state.phase = 'dealing';
        setMessage('CHOOSING DREAM CARD…', 'info');
        renderStatus();
        renderButtons();
        var job = E.chooseDreamCardAsync(four, state.bet, paytable);
        state.dreamCardJob = job;
        job.promise.then(function (result) {
          if (state.dreamCardJob !== job) return; // superseded — see setGame/dealHand
          state.dreamCardJob = null;
          state.dreamCardIndex = DREAM_CARD_SLOT;
          finishDeal(four.concat([result.card]));
        }, function () { /* cancelled */ });
        return;
      }

      var deck = E.shuffledDeck([], undefined, includeJoker);
      finishDeal(deck.slice(0, 5));
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

      /*
       * `category`/`won` drive the paytable highlight and win message; for
       * a single hand that's just its own outcome. For multiplay there's
       * no single outcome — each of the N simultaneous hands draws its own
       * independent replacements from its own copy of the remaining deck
       * (the real multi-play mechanic), and `won` becomes the sum across
       * all of them. `category` becomes whichever hand paid the most (an
       * arbitrary but reasonable choice for which single paytable row to
       * flash), for use only by highlightPayRow/setMessage below.
       */
      var category, won;
      if (state.multiplay) {
        var includeJoker = paytable.deck === 53;
        won = 0;
        category = E.CATEGORY.NOTHING;
        var bestHandWin = -1;
        state.multiHands = [];
        for (var n = 0; n < state.multiplay.count; n++) {
          var finalHand = state.hand.slice();
          var handDeck = E.shuffledDeck(state.hand, undefined, includeJoker);
          var drawn = 0;
          for (var i = 0; i < 5; i++) {
            if (!state.held[i]) finalHand[i] = handDeck[drawn++];
          }
          var handCategory = E.resolveCategory(finalHand, paytable);
          var handWin = E.payout(handCategory, state.bet, paytable);
          won += handWin;
          state.multiHands.push({ finalHand: finalHand, category: handCategory, win: handWin });
          if (handWin > bestHandWin) { bestHandWin = handWin; category = handCategory; }
        }
      } else {
        var stackIdx = 0;
        for (var j = 0; j < 5; j++) {
          if (!state.held[j]) state.hand[j] = state.drawStack[stackIdx++];
        }
        category = E.resolveCategory(state.hand, paytable);
        won = E.payout(category, state.bet, paytable);
      }
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
      renderMultiHands();
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
        // Single-play: the hand itself, mutated in place by the draw
        // above, so this is the actual final hand. Multiplay has no one
        // final hand — see multiHands instead.
        finalHand: state.multiplay ? null : state.hand.map(E.cardToString),
        multiHands: state.multiplay ? state.multiHands.map(function (h) {
          return {
            finalHand: h.finalHand.map(E.cardToString),
            category: h.category,
            categoryName: E.CATEGORY_NAMES[h.category],
            won: h.win
          };
        }) : null,
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
        if (state.phase !== 'attract') state.phase = 'attract';
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
       * otherwise to the next deal. Not supported for multiplay games —
       * each simultaneous hand draws its own independent replacements, so
       * there's no single "the" draw stack to force.
       */
      setDrawCards: function (cards) {
        if (state.multiplay) throw new Error('setDrawCards is not supported for multiplay games');
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
        if (state.phase !== 'attract') return api;
        state.bet = Math.min(5, Math.max(1, Math.round(n)));
        renderStatus();
        renderButtons();
        emit('betchange', { bet: state.bet });
        return api;
      },
      /*
       * Multiplay games only: how many simultaneous hands to play (one of
       * the paytable's declared `multiplay.options`, e.g. 3/5/10). No-op
       * for a non-multiplay game or while a hand is in progress.
       */
      setPlayCount: function (n) {
        if (!paytable.multiplay || state.phase !== 'attract') return api;
        var count = Math.round(n);
        if (paytable.multiplay.options.indexOf(count) === -1) return api;
        state.multiplay.count = count;
        el.playCountSelect.value = count;
        renderStatus();
        renderButtons();
        renderMultiHands();
        emit('playcountchange', { playCount: count });
        return api;
      },
      addCredits: function (n) {
        state.credits += n;
        renderStatus();
        renderButtons();
        emit('creditschange', { credits: state.credits });
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
        if (state.dreamCardJob) { state.dreamCardJob.cancel(); state.dreamCardJob = null; }
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
        state.multiplay = paytable.multiplay ? { count: paytable.multiplay.defaultCount } : null;
        state.multiHands = null;
        state.dreamCardIndex = null;
        if (paytable.id && GAME_LIST.some(function (g) { return g.key === paytable.id; })) {
          el.gameSelect.value = paytable.id;
        } else {
          el.gameSelect.value = '__custom__';
        }
        renderPaytableRows();
        renderPlayCountSelect();
        clearPayHighlight();
        setMessage('PLAY 1 TO 5 CREDITS', 'info');
        el.verdict.textContent = '';
        el.verdict.className = 'vpt-verdict';
        el.analysisPanel.classList.remove('vpt-open');
        renderHand();
        renderMultiHands();
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
          // 'attract' | 'dealing' (Dream Card pick in flight — see deal()) | 'dealt'
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
          lastVerdict: state.lastVerdict,
          multiplay: state.multiplay ? {
            count: state.multiplay.count,
            dreamCardIndex: state.dreamCardIndex,
            hands: state.multiHands ? state.multiHands.map(function (h) {
              return { finalHand: h.finalHand.map(E.cardToString), category: h.category, win: h.win };
            }) : null
          } : null
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
      if (state.phase !== 'attract') return;
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
    el.playCountSelect.addEventListener('change', function () {
      api.setPlayCount(Number(el.playCountSelect.value));
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
    renderMultiHands();
    renderStatus();
    renderStats();
    renderButtons();

    return api;
  }

  global.VideoPokerTrainer = { create: create, Engine: E };
})(typeof self !== 'undefined' ? self : this);
