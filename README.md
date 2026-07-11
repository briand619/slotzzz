# Slot Design Analysis Tool

A .NET-based tool for analyzing and simulating slot machine configurations. This software replicates the functionality described in "Elements of Slot Design 3rd Edition" by calculating RTP (Return to Player), volatility metrics, and running Monte Carlo simulations.

## Features

- **RTP Calculation**: Calculate theoretical Return to Player percentage based on paytable configuration
- **Volatility Analysis**: Measure variance and volatility index of slot configurations
- **Hit Frequency**: Calculate the probability of winning on any given spin
- **Simulation Engine**: Run large-scale simulations (10K-1M spins) to validate theoretical calculations
- **Web API**: RESTful endpoints for all analysis features
- **Comprehensive Testing**: 24+ unit tests validating all calculations

## Architecture

```
src/
├── SlotMathEngine/           # Core mathematical engine
│   ├── Models/               # Symbol, PayLine, Paytable, SlotConfiguration
│   └── Engines/              # RTPCalculator, VolatilityCalculator, SimulationEngine
├── SlotMathEngine.Tests/     # Comprehensive unit tests
└── SlotDesignAPI/            # ASP.NET Core Web API
    ├── Controllers/          # AnalysisController
    └── Services/             # ISlotAnalysisService, SlotAnalysisService
```

## Building

```bash
cd /home/user/slotzzz
dotnet build
```

## Running Tests

```bash
dotnet test
```

All 24 tests should pass, validating:
- Model initialization and validation
- RTP calculations against known formulas
- Volatility measurements
- Simulation accuracy against theoretical values

## API Endpoints

The API runs on `http://localhost:5000` (development).

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
  "rtp": 0.95,
  "expectedValue": 0.95,
  "hitFrequency": 0.125
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

Response:
{
  "totalWagered": 100000.0,
  "totalWon": 95000.0,
  "averageWin": 123.45,
  "minWin": 0.0,
  "maxWin": 5000.0,
  "totalSpins": 100000,
  "winningSpins": 770,
  "actualRTP": 0.95,
  "resultsCount": 100000
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

See `examples/simple-3reel-slot.json` for a complete example configuration.

## Key Components

### Models
- **Symbol**: Represents a reel symbol with weighted probability
- **PayLine**: Defines a winning line configuration
- **Paytable**: Collection of paylines and base wager
- **SlotConfiguration**: Complete slot machine configuration

### Calculation Engines
- **RTPCalculator**: Computes Return to Player using probability theory
- **VolatilityCalculator**: Measures variance and volatility index
- **SimulationEngine**: Runs weighted random spins and evaluates paylines

## Verification

The implementation has been validated through:
1. **Unit Tests**: 24 tests covering all models and calculations
2. **Simulation Validation**: 100K spin simulations match theoretical RTP to within 10%
3. **Mathematical Accuracy**: Formulas verified against slot design theory

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
