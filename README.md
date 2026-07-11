# Slot Design Analysis Tool

A .NET-based tool for analyzing and simulating slot machine configurations. This software replicates the functionality described in "Elements of Slot Design 3rd Edition" by calculating RTP (Return to Player), volatility metrics, and running Monte Carlo simulations.

## Features

- **Exact RTP Calculation**: Theoretical Return to Player computed by exact enumeration of all reel outcomes (not an approximation)
- **Exact Volatility Analysis**: Variance and volatility index of the total spin win, correctly accounting for correlation between paylines that share reels
- **Exact Hit Frequency**: True probability of at least one win per spin (union probability, not a sum of per-line probabilities)
- **Simulation Engine**: Monte Carlo runs (up to 1M spins via the API) that share the same payout-evaluation code as the theoretical engine, so theory and simulation can never model different games
- **Web API**: RESTful endpoints for all analysis features with input validation (400 with error details for invalid configurations)
- **Comprehensive Testing**: 41 unit tests, including exact-value regression tests for multi-payline variance and hit frequency

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
    ├── Controllers/          # AnalysisController
    └── Services/             # ISlotAnalysisService, SlotAnalysisService
```

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
paylines (theoretical RTP ≈ 92.46%, hit frequency ≈ 24.22%).

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
