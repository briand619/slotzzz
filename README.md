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
- **PayLine**: Defines a winning line configuration
- **Paytable**: Collection of paylines and base wager
- **SlotConfiguration**: Complete slot machine configuration

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
