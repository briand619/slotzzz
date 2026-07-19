# Video Poker Trainer

A self-contained, no-build video poker trainer styled after IGT Game King
machines: blue CRT screen, yellow paytable with the active bet column in red,
white cards with HELD tags, and a yellow button deck.

The game is full-pay 9/6 Jacks or Better (1–5 coins, 4000-coin max-bet royal).
On every deal the trainer computes the **exact** expected value of all 32
possible hold combinations by enumerating every draw, then grades your hold
when you press DRAW and tracks your optimal-play percentage. A HINT button
marks the optimal hold, and the ANALYSIS panel shows the ranked EV table.

## Running

It is plain HTML/CSS/JS with no dependencies — open `index.html` directly in a
browser, or serve the directory:

```bash
cd frontend/video-poker
python3 -m http.server 8080
# http://localhost:8080/
```

## Feeding hands to the trainer

Cards are accepted in any of these formats, interchangeably:

| Format  | Examples                                     |
| ------- | -------------------------------------------- |
| String  | `"AS"`, `"as"`, `"10H"`, `"TH"`, `"K♥"`      |
| Object  | `{ rank: 'A', suit: 'spades' }`, `{ rank: 10, suit: 'H' }`, `{ rank: 14, suit: '♠' }` |
| Integer | `0..51` (rank-major: `rank*4 + suit`, C/D/H/S) |

A hand is an array of 5 cards, or a single string: `"AS KS QS JS 9D"` /
`"AS,KS,QS,JS,9D"`.

### 1. URL parameters (zero code)

```
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
    credits: 400,   // starting credits (default 400)
    bet: 5,         // starting bet 1..5 (default 5)
    keyboard: true  // 1-5 hold, space/enter deal/draw, B/M bet, H hint, A analysis
  });

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
  // { phase, hand, held, bet, credits, win,
  //   stats: { hands, optimal, evLost }, lastVerdict }

  // Events:
  game.on('deal', ({ hand, bet }) => {});
  game.on('holdchange', ({ held }) => {});
  game.on('draw', ({ finalHand, categoryName, won, credits,
                     playerHold, optimalHold, wasOptimal,
                     playerEV, optimalEV, hintUsed }) => {});
  game.on('betchange', ({ bet }) => {});
  game.on('analysis', ({ results }) => {}); // hold analysis finished for a deal
</script>
```

### 3. postMessage API (iframe embedding)

`index.html` listens for messages, so a host page can feed hands into an
embedded trainer without touching its code:

```js
const frame = document.querySelector('iframe');
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
├── index.html          entry page: mounts the trainer, URL + postMessage APIs
├── css/gameking.css    Game King skin (no external assets or fonts)
├── js/engine.js        cards, hand evaluator, paytable, exact 32-way EV analysis
│                       (UMD: also loadable from Node as a module)
└── js/trainer.js       UI component and public VideoPokerTrainer API
```

## Tests

The engine (parsing, hand evaluation, payouts, exact EV) has a Node test
suite with hand-computed expected values:

```bash
node frontend/video-poker/test/engine.test.js
```

## Notes on the math

- EV is exact, not simulated: for each of the 32 hold masks the engine
  enumerates every possible draw from the 47 unseen cards
  (~2.6M hand evaluations total) — about 100 ms, run in background chunks
  after each deal so the UI never blocks.
- EVs are reported in coins at the current bet, so the 4000-coin max-bet
  royal correctly makes 4-to-a-royal beat a pat flush at 5 coins
  (92.13 vs 30.00) — the classic trainer example.
- A hold counts as optimal if its EV ties the best EV (within 1e-9), so
  equivalent holds are never marked wrong.
