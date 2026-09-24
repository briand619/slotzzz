# Multi-Play Video Poker Trainer

The multi-line sibling of the classic single-line trainer one folder up.
It plays IGT Game King-style **Triple Play / Five Play / Ten Play**: one deal,
one hold decision, and every hand draws its own replacements. Two optional
features ride on top: **Ultimate X** and **Dream Card**.

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
- **Setup row.** Feature, game, paytable and hand count are chosen at the top.
  Each paytable option shows its Wizard of Odds return.
- **Overlays.** SEE PAYS, ANALYSIS and SETTINGS open as overlays, so the layout
  never changes height mid-game.

## Features

Both features work as on the real machines: they cost **10 coins per hand**
(5 more than max bet), and wins are paid on the 5-coin paytable. Each feature
offers only the paytables that actually exist for it, so the game list changes
when you switch. With no feature, you get the classic app's full-pay tables at
1 to 5 coins per hand.

**Ultimate X.** Every winning hand pays now and earns a multiplier for the
same hand position on the next deal. A losing hand resets that position to
1X. The badge left of each hand shows the multiplier waiting there. The
multipliers depend on the game, the hand win and the hand count (3, 5 or 10),
but not on the paytable. Earned multipliers survive closing the app. Switching
game, feature or hand count drops them, like walking to a different machine.

Grading uses Wizard of Odds' published strategy method. It counts each result
as 2 x its win + (the multiplier it earns - 1), per coin; here it's shown x5 so
values read like coins at a 5-coin bet. WoO reports that this single strategy
per game is near-optimal, even though truly optimal play shifts with the
multipliers already in play. ANALYSIS and the verdict show these "strategy
values" instead of plain EV.

**Dream Card.** On a fixed share of deals, which depends on the game, you get
four random cards plus a fifth chosen to give the highest possible EV, labeled
DREAM CARD. The shares run from 26.7% for Triple Double Bonus to 59% for Deuces
Wild. Once dealt, it's an ordinary card, not a wild. The fifth card is found
exactly: all 48 candidates are checked, with a shortcut explained in
`chooseDreamCard` in `../js/engine.js`. While it's searching, deal, draw and
bet are locked, so the bet can't be charged twice. Strategy is the normal
strategy for the paytable.

Real machines let you override the offered Dream Card. That isn't built yet.

### Sources and exclusions

The rules, multipliers, trigger rates, paytables and returns come from the
Wizard of Odds pages for
[Ultimate X (multi-line)](https://wizardofodds.com/games/video-poker/tables/ultimate-x/)
and [Dream Card](https://wizardofodds.com/games/video-poker/tables/dream-card/).
They were extracted by script into `js/tables.js`, not retyped. The script
cross-checked each table against its name (e.g. "8/6" must mean full house 8
and flush 6), and checked that Ultimate X multipliers don't vary by paytable.

Left out:

- Ultimate X **Bonus Deuces**: it needs hand categories the engine doesn't
  have (e.g. four deuces with an ace).
- Dream Card **Deuces 20/11/9/4/4/3**: WoO names it but doesn't print its
  table.
- **Super Times Pay**: skipped for now. WoO documents the exact multiplier
  odds only for single-hand play.

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
multi/index.html?feature=ultimate-x             none, ultimate-x or dream-card (its first game)
multi/index.html?game=ux-double-double-bonus-9-6  a specific paytable id (classic keys, or ux-* / dc-*)
multi/index.html?hands=10                       3, 5 or 10 hands
multi/index.html?bet=5&credits=1000             coins per hand, starting credits
multi/index.html?hand=AS,AH,AD,3C,7H            deal this hand immediately
multi/index.html?hand=...&draw=AC               force the bottom hand's replacements
```

## JavaScript API

```js
const game = MultiPlayTrainer.create(el, {
  handCount: 5,            // 3, 5 or 10 (default 3)
  feature: 'ultimate-x',   // 'none' (default), 'ultimate-x' or 'dream-card'; ignored when paytable is given
  paytable: 'ux-jacks-or-better-8-6', // any id from MultiPlayTrainer.Features.paytables(feature)
  bet: 5,                  // coins per hand with no feature (features always play 5 + a 5-coin fee)
  credits: 1000,
  optimalTolerance: 1.0,   // coins per hand, as in the classic app
  stats: { hands: 0, optimal: 0, evLost: 0 },
  keyboard: true           // 1-5 hold, space deal/draw, B/M bet, H hint, A analysis, P pays, S settings
});

game.dealHand('AS KS QS JS 9D');
game.setHolds([0, 1, 2, 3]);
game.draw();
game.setHandCount(10);     // between hands only
game.setFeature('dream-card');       // switches to that feature's first game
game.setGame('dc-triple-double-bonus-9-6');
game.setDrawCards(['10S']); // forces the bottom hand only; the others stay random
game.getState();
// { phase ('attract' | 'dealing' | 'dealt'), feature, paytable, handCount, hand, held,
//   hands, multipliers, dreamCardIndex, bet, totalBet, credits, win, stats, settings, lastVerdict }

game.on('draw', ({ hands, won, nextMultipliers, wasOptimal, playerEV, optimalEV }) => {});
// hands[0] is the bottom (playable) hand; each is
// { cards, category, categoryName, base, multiplier, won } (won = base x multiplier).
// Under Ultimate X, playerEV/optimalEV are strategy values, not coins.
// Other events: deal, holdchange, betchange, handcountchange, gamechange,
// analysis, settingschange, creditschange
```

## Tests

```bash
node frontend/video-poker/test/engine.test.js        # shared engine, incl. Dream Card search
node frontend/video-poker/multi/test/features.test.js # feature tables, multipliers, Triple Bonus
```
