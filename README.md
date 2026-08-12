# Slot Design Analysis Tool

A .NET-based tool for analyzing and simulating slot machine configurations. This software replicates the functionality described in "Elements of Slot Design 3rd Edition" by calculating RTP (Return to Player), volatility metrics, and running Monte Carlo simulations.

## Features

- **Exact RTP Calculation**: Theoretical Return to Player computed by exact enumeration of all reel outcomes (not an approximation)
- **Exact Volatility Analysis**: Variance and volatility index of the total spin win, correctly accounting for correlation between paylines that share reels
- **Exact Hit Frequency**: True probability of at least one win per spin (union probability, not a sum of per-line probabilities)
- **Simulation Engine**: Monte Carlo runs (up to 1M spins via the API) that share the same payout-evaluation code as the theoretical engine, so theory and simulation can never model different games
- **Web API**: RESTful endpoints for all analysis features with input validation (400 with error details for invalid configurations)
- **Designer UI**: a live browser tool for tuning a game against the exact math (see below)
- **Comprehensive Testing**: 107 unit tests, including exact-value regression tests for multi-payline variance, hit frequency, and every bonus feature

## Architecture

```
src/
├── SlotMathEngine/           # Core mathematical engine
│   ├── Models/               # Symbol, PayLine, Paytable, SlotConfiguration
│   └── Engines/              # PayoutEvaluator (shared game rules),
│                             # TheoreticalAnalyzer (exact enumeration),
│                             # RTPCalculator, VolatilityCalculator, SimulationEngine
├── SlotMathEngine.Tests/     # Comprehensive unit tests
└── SlotDesignAPI/            # ASP.NET Core Web API
    ├── Controllers/          # AnalysisController, ExamplesController
    ├── Services/             # ISlotAnalysisService, SlotAnalysisService
    └── wwwroot/              # Designer UI (plain HTML/CSS/JS, no build step)
```

## Designer UI

```bash
dotnet run --project src/SlotDesignAPI
# http://localhost:5164/
```

That one command serves both the API and the designer, so there is no build
step and no CORS setup. The tool is the tuning loop this engine exists for:
edit a symbol weight or a paytable multiplier and the exact RTP, hit frequency,
volatility index, and variance update as you type — every figure computed by the
API's full enumeration, never approximated in the browser.

- **Examples dropdown** loads any configuration from `examples/`.
- **Structured editors** for symbols, per-reel strips (one compact
  `symbolId:weight` line per reel), paylines with both exact-position and
  N-of-a-kind rules, scatter tiers, hold & spin, and free spins.
- **RTP contribution** splits total RTP into base line pays, scatter pays, and
  each bonus feature by re-analyzing with features removed — so you can see
  exactly which part of the game is carrying (or breaking) your target.
- **Simulation** runs up to 1M spins and shows the result against the theory,
  the same cross-check the test suite makes.
- **Validation errors** from the engine appear inline, so an impossible
  configuration explains itself instead of failing silently.
- **Raw JSON** editing, two-way, as an escape hatch for anything the forms
  don't cover.

## Per-Reel Symbol Strips

Real slot machines give each reel its own weighted strip — that is how designers
tune volatility and near-misses (for example, making the jackpot symbol rarer on
the last reel). Add an optional `reels` array with one strip per reel:

```json
{
  "name": "My Slot",
  "numReels": 3,
  "symbols": [
    { "id": "cherry", "name": "Cherry" },
    { "id": "seven", "name": "Seven" }
  ],
  "reels": [
    { "stops": [ { "symbolId": "cherry", "weight": 5 }, { "symbolId": "seven", "weight": 2 } ] },
    { "stops": [ { "symbolId": "cherry", "weight": 5 }, { "symbolId": "seven", "weight": 2 } ] },
    { "stops": [ { "symbolId": "cherry", "weight": 6 }, { "symbolId": "seven", "weight": 1 } ] }
  ],
  "paytable": { ... }
}
```

Rules:
- When `reels` is provided it must contain exactly `numReels` strips, and every
  strip stop must reference a symbol from the `symbols` catalog with a positive
  weight. The catalog's own `weight` values are then unused and may be omitted.
- When `reels` is omitted, every reel uses the shared `symbols` weights
  (the original behavior — existing configurations work unchanged).
- The same symbol may appear on multiple stops of one strip; its probability on
  that reel is the sum of its stop weights over the strip's total weight.

See `examples/per-reel-strips-slot.json` for a complete example
(theoretical RTP ≈ 90.16%, hit frequency ≈ 19.27%).

## Multi-Row Grids

Set `numRows` above 1 to model video-slot grids (e.g. 5×3). A spin stops each
reel on a strip position; the visible window is that stop plus the following
`numRows − 1` stops (wrapping around the strip) — so rows on the same reel are
**correlated exactly like a physical reel**, not independent draws. Because strip
order determines the windows, multi-row games require explicit `reels` strips,
each at least `numRows` stops long.

Paylines gain an optional `rowPositions` array (parallel to `reelPositions`) to
trace any path through the grid — straight lines, diagonals, zigzags:

```json
{
  "id": 2,
  "reelPositions": [0, 1, 2],
  "rowPositions": [0, 1, 2],
  "rules": [ { "symbolIds": ["seven", "seven", "seven"], "multiplier": 60.0 } ]
}
```

When `rowPositions` is omitted, every position reads row 0 — so single-row
configurations work unchanged.

See `examples/grid-3x3-slot.json` for a 3×3 game with top, middle, and diagonal
paylines (theoretical RTP ≈ 92.19%, hit frequency ≈ 24.22%).

## Wager Modes

The paytable's `wagerMode` controls what `baseWager` means:

- **`totalBet`** (default): `baseWager` is the total stake per spin. Line wins pay
  `baseWager × multiplier`, so with several paylines the multipliers must be
  scaled down by hand or RTP inflates with every line added.
- **`betPerLine`**: `baseWager` is the bet per payline — the common real-slot
  convention. The total stake per spin is `baseWager × number of paylines`, and
  each line pays its multiplier on the line bet, so adding a payline adds both
  its cost and its wins without distorting RTP.

```json
"paytable": {
  "baseWager": 1.0,
  "wagerMode": "betPerLine",
  "payLines": [ ... ]
}
```

RTP is always total payouts relative to the total stake. The wager mode does not
change the payout distribution itself (expected value, variance, and hit
frequency are properties of the wins); it changes what those wins cost.

## Left-to-Right N-of-a-Kind Rules

Alongside exact-position rules, a payline can carry `kindRules` — the classic
video-slot paytable style where a symbol pays for 3, 4, or 5 consecutive
matches from the line's first position:

```json
{
  "id": 0,
  "reelPositions": [0, 1, 2, 3, 4],
  "rowPositions": [1, 1, 1, 1, 1],
  "kindRules": [
    { "symbolId": "gem", "count": 3, "multiplier": 7.0 },
    { "symbolId": "gem", "count": 4, "multiplier": 22.0 },
    { "symbolId": "gem", "count": 5, "multiplier": 75.0 }
  ]
}
```

A kind rule matches when the first `count` positions of the line all show the
symbol, with wilds substituting. Because only a line's highest-paying match
wins, a longer run automatically pays its higher tier, and exact-position rules
and kind rules can coexist on the same line.

See `examples/five-reel-video-slot.json` for a classic 5×3 game — per-reel
strips, three lines with 3/4/5-of-a-kind tiers for four symbols, a wild, and
scatters on reels 1/3/5 (theoretical RTP = 93.5215% exactly, hit
frequency ≈ 35.32%).

## Wilds and Scatters

Mark symbols in the catalog:

```json
"symbols": [
  { "id": "seven", "name": "Seven", "weight": 1.0 },
  { "id": "wild", "name": "Wild", "weight": 1.0, "isWild": true },
  { "id": "scatter", "name": "Scatter", "weight": 1.0, "isScatter": true }
]
```

- **Wilds** substitute for any non-scatter symbol when matching payline rules
  (a rule can also require the wild itself, e.g. `["wild","wild","wild"]`).
- **Scatters** pay anywhere on the visible grid, independent of paylines, via
  `scatterRules` on the paytable — one rule per exact count tier, each paying
  its multiplier on the **total stake**:

```json
"scatterRules": [
  { "symbolId": "scatter", "count": 2, "multiplier": 2.0 },
  { "symbolId": "scatter", "count": 3, "multiplier": 25.0 }
]
```

Payout semantics: per payline only the **highest-paying matching rule** pays
(the real-slot convention — essential once wilds let several rules match the
same line at once); wins from different paylines add up, and scatter wins add
on top. Wilds never substitute for scatters, and a symbol cannot be both wild
and scatter.

See `examples/wild-scatter-slot.json` (theoretical RTP ≈ 89.21%, hit
frequency ≈ 15.89%).

## Hold & Spin (Lightning Link–style)

Add a `holdAndSpin` block to model the lock-and-respin bonus popularized by
Lightning Link / Dragon Link:

```json
"holdAndSpin": {
  "coinSymbolId": "coin",
  "triggerCount": 3,
  "respinCount": 3,
  "coinProbability": 0.06,
  "coinValues": [
    { "value": 0.5, "weight": 8.0 },
    { "value": 1.0, "weight": 5.0 },
    { "value": 2.0, "weight": 2.0 },
    { "value": 8.0, "weight": 0.75, "label": "mini" },
    { "value": 20.0, "weight": 0.25, "label": "minor" }
  ],
  "grandMultiplier": 150.0
}
```

Mechanics: when at least `triggerCount` coin symbols land anywhere on the
base-game grid, they lock and the feature starts with `respinCount` respins.
Each respin, every unlocked cell independently lands a new coin with
`coinProbability`; any hit locks the coins and **resets the respin counter**, a
miss decrements it. The feature ends when the counter reaches zero or the grid
is full. The award is the sum of the locked coins' values (drawn from the
weighted `coinValues` table) plus `grandMultiplier` for a full grid — all
multipliers apply to the **total stake**, and respins cost nothing. Labels on
coin values are descriptive (fixed jackpot tiers like mini/minor).

The coin symbol must be marked `isScatter` (coins count anywhere and wilds
never substitute for them).

The math stays **exact**: the feature is an absorbing Markov chain over
(locked coins, respins left) — acyclic because coins only accumulate — solved
by dynamic programming for the exact final-count distribution, then combined
with the coin-value distribution as a compound sum. The simulator plays the
feature as an actual respin loop, an independent implementation used to
cross-validate the chain.

See `examples/hold-and-spin-slot.json` (theoretical RTP ≈ 94.61%, hit
frequency ≈ 20.30%, grand pays 150× total stake).

## Video Poker Trainer (Frontend)

`frontend/video-poker/` contains a self-contained, no-build video poker
trainer styled after IGT Game King machines, with eight switchable games —
Jacks or Better, Bonus Poker, Bonus Poker Deluxe, Double Double Bonus, Triple
Double Bonus, Triple Triple Bonus, Deuces Wild, and Jokers Wild — each with
exact expected-value analysis of all 32 hold combinations on every deal
(including wild-card hands), optimal-play grading, hints, and a ranked EV
panel. Hands can be fed to it three ways: URL parameters
(`index.html?game=deuces-wild-nsu-100&hand=2S,KS,QS,JS,9D&draw=10S`), a
JavaScript API (`trainer.dealHand(['AS','KS','QS','JS','9D'])`), or
postMessage for iframe embedding. See `frontend/video-poker/README.md` for
the full API, and run its engine tests with
`node frontend/video-poker/test/engine.test.js`.

## Free Spins (with retriggers)

Add a `freeSpins` block to award a free-spins bonus when trigger symbols land
anywhere on the base grid:

```json
"freeSpins": {
  "triggerSymbolId": "scatter",
  "triggerCount": 3,
  "spinsAwarded": 8,
  "winMultiplier": 2.0,
  "allowRetrigger": true
}
```

Free spins run on the same reels and paytable, every win is multiplied by
`winMultiplier`, and spins cost nothing. With `allowRetrigger`, landing the
trigger again during a free spin awards `spinsAwarded` more. The trigger symbol
must be marked `isScatter`, and the hold-and-spin feature does not trigger
during free spins. A spin that triggers a bonus counts as a hit even if the
bonus ultimately pays zero.

The math stays **exact** even with retriggers: the feature is a branching
(Galton–Watson) process, and its award mean and second moment have closed
forms from per-spin enumeration statistics — E[T] = E[P]/(1 − F·q) for the
per-spin subtree, with a matching second-moment recursion (P the multiplied
per-spin payout, q the retrigger probability, F the spins per trigger). A
configuration whose expected retriggers per spin reach 1 has infinite expected
spins and is rejected with an explanatory error; the simulator plays the
feature as an actual retrigger loop and cross-validates the closed forms.

See `examples/free-spins-slot.json` — the 5×3 video slot with an 8-spin ×2
retriggering bonus (theoretical RTP ≈ 94.46%, expected ~10.2 free spins per
trigger).

## How the Math Works

All theoretical metrics come from `TheoreticalAnalyzer`, which enumerates every
possible combination of symbols on the reels referenced by the paytable, evaluates
each outcome's payout through `PayoutEvaluator` (the same code the simulator uses),
and accumulates the exact expected value, variance (E[X²] − E[X]²), and hit
frequency. This is exact for configurations up to 10 million outcomes
(symbols ^ referenced reels); beyond that the analyzer rejects the request and
simulation should be used instead.

## Building

```bash
cd /home/user/slotzzz
dotnet build
```

## Running Tests

```bash
dotnet test
```

All 41 tests should pass, validating:
- Model initialization and validation (including malformed-input rejection)
- Exact RTP, variance, and hit-frequency values against hand-computed distributions
- Multi-payline correlation handling (the known-wrong "sum of per-line variances" value is explicitly ruled out)
- Simulation convergence to the theoretical metrics

## API Endpoints

The API runs on `http://localhost:5164` (development, per `launchSettings.json`).

### Calculate RTP
```
POST /api/analysis/rtp
Content-Type: application/json

{
  "configuration": {
    "name": "My Slot",
    "numReels": 3,
    "symbols": [...],
    "paytable": {...}
  }
}

Response:
{
  "rtp": 0.9267,
  "expectedValue": 0.9267,
  "hitFrequency": 0.2111
}
```

### Calculate Volatility
```
POST /api/analysis/volatility
Content-Type: application/json

{
  "configuration": {...}
}

Response:
{
  "variance": 2.5,
  "volatility": 1.58,
  "volatilityIndex": 1.66
}
```

### Run Simulation
```
POST /api/analysis/simulate
Content-Type: application/json

{
  "configuration": {...},
  "numSpins": 100000
}

numSpins must be between 1 and 1,000,000.

Response:
{
  "totalWagered": 100000.0,
  "totalWon": 92600.0,
  "averageWin": 4.39,
  "minWin": 1.5,
  "maxWin": 60.0,
  "totalSpins": 100000,
  "winningSpins": 21100,
  "actualRTP": 0.926,
  "actualVariance": 12.4
}
```

### Full Analysis
```
POST /api/analysis/analyze
Content-Type: application/json

{
  "configuration": {...}
}

Response: Combines RTP, Volatility, and Simulation results
{
  "rtpAnalysis": {...},
  "volatilityAnalysis": {...},
  "simulationResults": {...}
}
```

## Example Configuration

See `examples/simple-3reel-slot.json` for a complete example configuration
(theoretical RTP ≈ 92.67%, hit frequency ≈ 21.11%).

## Key Components

### Models
- **Symbol**: Represents a reel symbol with weighted probability
- **ReelStrip / ReelStop**: A single reel's own weighted symbol strip
- **PayLine**: Defines a winning line configuration
- **Paytable**: Collection of paylines and base wager
- **SlotConfiguration**: Complete slot machine configuration; `GetReelDistributions()` is the single source of truth for each reel's symbol probabilities

### Calculation Engines
- **PayoutEvaluator**: Single source of truth for what a reel outcome pays; used by both theory and simulation
- **TheoreticalAnalyzer**: Exact expected value, variance, and hit frequency via outcome enumeration
- **RTPCalculator / VolatilityCalculator**: Thin, stable APIs over the exact analyzer
- **SimulationEngine**: Runs weighted random spins and evaluates them through PayoutEvaluator

## Verification

The implementation has been validated through:
1. **Unit Tests**: 41 tests covering models, validation, and calculations
2. **Exact-Value Tests**: Multi-payline variance and overlapping-payline hit frequency asserted against hand-computed exact distributions
3. **Simulation Validation**: 100K-spin runs converge to the theoretical RTP, variance, and hit frequency

## Tech Stack

- **.NET 8** - Runtime
- **ASP.NET Core 8** - Web framework
- **xUnit** - Testing framework
- **C#** - Language

## Future Enhancements

Phase 4 (UI Layer) could include:
- Web frontend (React/Vue) consuming the API
- Desktop application (WPF) for direct analysis
- CLI tool for command-line usage
- Database persistence for configurations
- Advanced analysis features (bonus games, free spins, etc.)

## License

This is an educational tool for understanding slot machine design and analysis.
