# Multi-Play Video Poker Trainer

The multi-line sibling of the classic single-line trainer one folder up.
It plays IGT Game King-style **Triple Play / Five Play / Ten Play**: one deal,
one hold decision, and every hand draws its own replacements.

It shares the classic app's engine (`../js/engine.js`) and skin
(`../css/gameking.css`), so a paytable fix or a new game lands in both apps at
once. Everything specific to multi-play lives in this folder, and the classic
app doesn't load any of it.

## Layout

It follows the real machines:

- **Hands.** The playable hand sits full size at the bottom, with the other
  hands stacked above it.
- **Holding.** A held card shows face up in the same position on every upper
  hand. After the draw, each upper hand shows its own result, and winners get
  a label such as `FLUSH 35`.
- **Mini-hand size.** Upper hands are the real card faces scaled down. In
  3- and 5-play they're full size; in 10-play they shrink to about 55%, so the
  stack still fits.
- **Playable-hand size.** It never shrinks: on a phone it stays the same size
  as in the classic app, at every hand count.
- **Overlays.** SEE PAYS, ANALYSIS and SETTINGS open as overlays, so the layout
  never changes height mid-game.

## Math

Each hand keeps the held cards and replaces the rest from its own shuffled
copy of the 47 unseen cards. The same replacement card can land in several
hands, exactly as on the real machines.

Multi-play doesn't change optimal strategy. Hands draw independently, so a
hold's total EV is just the hand count times its single-hand EV. That can't
change which hold ranks best. HINT, ANALYSIS and grading therefore use the
same exact single-hand analysis as the classic app, with EVs shown per hand.

## Running

It loads files from the parent folder, so serve `frontend/video-poker/`, not
this folder:

```bash
cd frontend/video-poker
python3 -m http.server 8080
# http://localhost:8080/multi/
```

It's also an installable PWA with its own manifest, icons and service worker
(scope: this folder). On the live site it's served at `/multi/`.

The two apps share one origin, so each one:

- saves its own bankroll and settings under its own `localStorage` key
  (`vpm-save-v1` here, `vpt-save-v1` for the classic app);
- reads and clears only its own caches (`vpm-cache-*` here, `vpt-cache-*` for
  the classic app);
- serves its cached page only for its own URL.

## URL parameters

```
multi/index.html?game=double-double-bonus-9-6   pick a game (keys as in the classic app)
multi/index.html?hands=10                       3, 5 or 10 hands
multi/index.html?bet=5&credits=1000             coins per hand, starting credits
multi/index.html?hand=AS,AH,AD,3C,7H            deal this hand immediately
multi/index.html?hand=...&draw=AC               force the bottom hand's replacements
```

## JavaScript API

```js
const game = MultiPlayTrainer.create(el, {
  handCount: 5,            // 3, 5 or 10 (default 3)
  bet: 5,                  // coins per hand; the total wager is bet x handCount
  credits: 1000,
  paytable: 'triple-double-bonus-9-7',
  optimalTolerance: 1.0,   // coins per hand, as in the classic app
  stats: { hands: 0, optimal: 0, evLost: 0 },
  keyboard: true           // 1-5 hold, space deal/draw, B/M bet, H hint, A analysis, P pays, S settings
});

game.dealHand('AS KS QS JS 9D');
game.setHolds([0, 1, 2, 3]);
game.draw();
game.setHandCount(10);     // between hands only
game.setDrawCards(['10S']); // forces the bottom hand only; the others stay random
game.getState();           // { phase, paytable, handCount, hand, held, hands, bet, totalBet, credits, win, stats, settings, lastVerdict }

game.on('draw', ({ hands, won, wasOptimal, playerEV, optimalEV }) => {});
// hands[0] is the bottom (playable) hand; each is { cards, category, categoryName, won }
// Other events: deal, holdchange, betchange, handcountchange, gamechange,
// analysis, settingschange, creditschange
```

## Planned

Ultimate X, Super Times Pay and Dream Card are planned. Each one needs its
real rules and tables (Ultimate X multipliers per game and hand count, Super
Times Pay's multiplier distribution, Dream Card trigger rates per game).
Those come from wizardofodds.com, which this build environment's network
policy currently blocks. The earlier Dream Card work, including an exact,
brute-force-verified optimal-card search, is saved on branch
`claude/dream-card-multiplay-wip`, ready to port.
