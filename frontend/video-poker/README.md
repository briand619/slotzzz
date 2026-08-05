# Video Poker Trainer

A self-contained, no-build video poker trainer styled after IGT Game King
machines: blue CRT screen, yellow paytable with the active bet column in red,
white cards with HELD tags, and a yellow button deck.

Eight games are built in, switchable from the dropdown in the status bar
(or via API/URL — see below):

| Game | Family | Notes |
| --- | --- | --- |
| Jacks or Better (9/6) | standard | the reference full-pay table |
| Bonus Poker (8/5) | standard | quads split into Aces / 2s-4s / 5s-Ks tiers |
| Bonus Poker Deluxe (9/6) | standard | flat quad pay, no rank tiers |
| Double Double Bonus (9/6) | standard | Aces and 2s-4s quads further split by kicker rank |
| Triple Double Bonus (9/7) | standard | same mechanic as DDB, bigger bonus tiers |
| Triple Triple Bonus | standard | same mechanic, largest top tier (see caveat below) |
| Deuces Wild (full-pay NSU) | wild | the four 2s are wild; pays 3-of-a-kind and up only |
| Jokers Wild (Kings or Better) | wild | one Joker added to the deck (53 cards) as wild |

On every deal the trainer computes the **exact** expected value of all 32
possible hold combinations by enumerating every draw, then grades your hold
when you press DRAW and tracks your optimal-play percentage. A HINT button
marks the optimal hold, and the ANALYSIS panel shows the ranked EV table.
This works identically across all eight games, including the wild-card ones —
the EV math accounts for every way a deuce or Joker could complete a hand.

> **Triple Triple Bonus notes:** it includes the game's signature quirk where
> a quad 2s/3s/4s with an **Ace** kicker matches the top "4 Aces w/2,3,4
> kicker" tier exactly (its own `FOUR_LOW_ACE_KICKER` row) — a 2/3/4 kicker on
> that same quad stays in the ordinary, lower kicker tier. What it does *not*
> reproduce is real-money TTB's separate "kicker suited to the quad"
> super-tier on top of that; the exact condition for that rule varies enough
> across sources that reproducing it with confidence wasn't possible, so pay
> amounts for the tiers modeled here are a reasonable approximation, not an
> exact casino paytable. Deuces Wild and Jokers Wild pay their royal flush
> proportionally to bet (no 5-coin jackpot jump), matching how those games
> are typically paid, unlike the Jacks-or-Better family's 4000-coin jump.

## Running

It is plain HTML/CSS/JS with no dependencies — open `index.html` directly in a
browser, or serve the directory:

```bash
cd frontend/video-poker
python3 -m http.server 8080
# http://localhost:8080/
```

## Installing as an app (PWA)

The trainer is a installable Progressive Web App — `manifest.webmanifest` +
`sw.js` cache the whole app shell (HTML/CSS/JS/icons) so it keeps working
with zero network access after the first load, and it launches full-screen
from the home screen with no browser chrome.

**The one hard requirement: it must be loaded once over `http://` or
`https://` (localhost counts) for the service worker to register at all —
service workers are unconditionally blocked on `file://` URLs by every
browser.** Opening `index.html` straight from disk still runs the game fine,
it just skips the install/offline-cache step.

To install:

1. Serve the directory over http(s) — locally (`python3 -m http.server`) or
   hosted anywhere static files work (GitHub Pages, Netlify, S3, etc.).
2. Open that URL in the browser once (Safari on iOS, Chrome on Android/desktop).
3. **iOS Safari:** Share → **Add to Home Screen**. **Android Chrome:** menu →
   **Install app** (or an automatic install prompt).
4. Launch it from the home screen icon from then on — it opens full-screen,
   no address bar or browser chrome, and works offline.

If you change any cached file, bump `CACHE_NAME` in `sw.js` (e.g. `vpt-cache-v1`
→ `v2`) so installed copies pick up the update on next launch instead of
serving the stale cache forever.

## Feeding hands to the trainer

Cards are accepted in any of these formats, interchangeably:

| Format  | Examples                                     |
| ------- | -------------------------------------------- |
| String  | `"AS"`, `"as"`, `"10H"`, `"TH"`, `"K♥"`      |
| Object  | `{ rank: 'A', suit: 'spades' }`, `{ rank: 10, suit: 'H' }`, `{ rank: 14, suit: '♠' }` |
| Integer | `0..51` (rank-major: `rank*4 + suit`, C/D/H/S) |

A hand is an array of 5 cards, or a single string: `"AS KS QS JS 9D"` /
`"AS,KS,QS,JS,9D"`. In Jokers Wild, the Joker is card `52`, or the string/rank
`"JOKER"` / `"JK"` (e.g. `"AS KS QS JS JOKER"`).

### 1. URL parameters (zero code)

```
index.html?game=deuces-wild-nsu-100     pick a game (see the table above for keys)
index.html?hand=AS,KS,QS,JS,9S          deal this hand immediately
index.html?hand=...&draw=10S,4H         force the replacement cards, in order
index.html?hand=...&bet=5&credits=1000  set bet and starting credits
```

### 2. JavaScript API

```html
<link rel="stylesheet" href="css/gameking.css">
<script src="js/engine.js"></script>
<script src="js/trainer.js"></script>
<script>
  const game = VideoPokerTrainer.create(document.getElementById('game'), {
    credits: 400,                  // starting credits (default 400)
    bet: 5,                        // starting bet 1..5 (default 5)
    paytable: 'deuces-wild-nsu-100', // any key from the games table above (default jacks-or-better-9-6)
    keyboard: true                 // 1-5 hold, space/enter deal/draw, B/M bet, H hint, A analysis
  });

  // Switch games any time (credits carry over; hand/stats reset):
  game.setGame('jokers-wild-kings-or-better');
  game.setGame({ /* ...a custom paytable object, same shape as VideoPokerTrainer.Engine.PAYTABLES entries */ });

  // Deal a specific hand right now:
  game.dealHand(['AS', 'KS', 'QS', 'JS', '9D']);

  // Or stage cards for the next DEAL button press:
  game.queueHand('JS JH 6D 6C 2H');

  // Control what the discards are replaced with (dealt left to right):
  game.setDrawCards(['10S']);

  // Drive the game programmatically:
  game.setHolds([0, 1, 2, 3]);   // or game.toggleHold(2)
  game.draw();
  game.setBet(3);
  game.addCredits(400);
  game.hint();                   // mark the optimal hold on screen

  // Exact EV of all 32 holds for the live hand, best first:
  const ranked = game.analyze();
  // [{ hold: [0,1,2,3], cards: ['AS','KS','QS','JS'], ev: 92.1277 }, ...]

  // Snapshot of everything:
  game.getState();
  // { phase, paytable, hand, held, bet, credits, win,
  //   stats: { hands, optimal, evLost }, lastVerdict }

  // Events:
  game.on('deal', ({ hand, bet }) => {});
  game.on('holdchange', ({ held }) => {});
  game.on('draw', ({ finalHand, categoryName, won, credits,
                     playerHold, optimalHold, wasOptimal,
                     playerEV, optimalEV, hintUsed }) => {});
  game.on('betchange', ({ bet }) => {});
  game.on('gamechange', ({ paytable }) => {}); // game switched (dropdown or setGame)
  game.on('analysis', ({ results }) => {}); // hold analysis finished for a deal
</script>
```

### 3. postMessage API (iframe embedding)

`index.html` listens for messages, so a host page can feed hands into an
embedded trainer without touching its code:

```js
const frame = document.querySelector('iframe');
frame.contentWindow.postMessage({ type: 'vpt:setGame', game: 'deuces-wild-nsu-100' }, '*');
frame.contentWindow.postMessage({ type: 'vpt:dealHand', cards: ['AS','KS','QS','JS','9D'] }, '*');
frame.contentWindow.postMessage({ type: 'vpt:setDrawCards', cards: ['10S'] }, '*');
frame.contentWindow.postMessage({ type: 'vpt:setHolds', holds: [0,1,2,3] }, '*');
frame.contentWindow.postMessage({ type: 'vpt:draw' }, '*');
frame.contentWindow.postMessage({ type: 'vpt:getState' }, '*'); // replies with { type:'vpt:state', state }
```

Game events (`vpt:deal`, `vpt:draw`, `vpt:holdchange`, `vpt:betchange`) are
posted back to the parent window as they happen.

## Files

```
frontend/video-poker/
├── index.html               entry page: mounts the trainer, URL + postMessage APIs
├── manifest.webmanifest     PWA manifest (name, icons, standalone display)
├── sw.js                    service worker: caches the app shell for offline use
├── icons/icon-{180,192,512}.png   home-screen / app icons
├── css/gameking.css         Game King skin (no external assets or fonts)
├── js/engine.js             cards, hand evaluator, paytable, exact 32-way EV analysis
│                            (UMD: also loadable from Node as a module)
└── js/trainer.js            UI component and public VideoPokerTrainer API
```

## Tests

The engine (parsing, hand evaluation, payouts, exact EV) has a Node test
suite with hand-computed expected values:

```bash
node frontend/video-poker/test/engine.test.js
```

## Notes on the math

- EV is exact, not simulated: for each of the 32 hold masks the engine
  enumerates every possible draw from the unseen cards (47, or 48 in Jokers
  Wild) — about 100-250 ms total, run in background chunks after each deal so
  the UI never blocks.
- EVs are reported in coins at the current bet, so the 4000-coin max-bet
  royal correctly makes 4-to-a-royal beat a pat flush at 5 coins
  (92.13 vs 30.00) in Jacks or Better — the classic trainer example.
- A hold counts as optimal if its EV ties the best EV (within 1e-9), so
  equivalent holds are never marked wrong.
- Wild-card hands (Deuces Wild, Jokers Wild) are scored by checking, for each
  candidate category from best to worst, whether the non-wild cards can be
  completed into that category by *some* assignment of the wild cards — e.g.
  three natural 7s plus a deuce and a wild is recognized as Five of a Kind,
  and two natural pairs plus one wild card is recognized as a Full House
  rather than Two Pair. This is exact, not heuristic: every hold's EV still
  comes from enumerating every possible draw.
- Four-of-a-kind kicker tiers (Bonus/Double Double/Triple Double/Triple
  Triple Bonus) are resolved from the same base hand classification, so
  adding a new quad-tier paytable is a data-only change (`quadRule` +
  `rows`) — see `PAYTABLES` in `js/engine.js`.
