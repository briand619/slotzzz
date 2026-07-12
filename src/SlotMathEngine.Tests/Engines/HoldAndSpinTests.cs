namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class HoldAndSpinTests
{
    // ---- Markov chain, tested directly against hand-computed distributions ----

    [Fact]
    public void FinalCountDistribution_RespinResetMechanic_MatchesHandComputation()
    {
        // Grid of 3, start 1 coin, 2 respins, p = 1/2 per cell. Hand-computed by
        // walking the chain — EVERY hit resets the counter to 2, including hits
        // made on the last remaining respin:
        //   (1,2): ¼→(1,1), ½→(2,2), ¼→N3
        //   (1,1): ¼→N1, ½→(2,2), ¼→N3      (the hit resets: (2,2), not (2,1))
        //   (2,2) [prob ⅝]: ½→N3, ½→(2,1)
        //   (2,1) [prob 5/16]: ½→N3, ½→N2
        // P(N=1) = 1/16, P(N=2) = 5/32, P(N=3) = 25/32.
        var dist = HoldAndSpinAnalyzer.FinalCountDistribution(3, 1, 2, 0.5m);

        Assert.Equal(0m, dist[0]);
        Assert.Equal(1m / 16m, dist[1]);
        Assert.Equal(5m / 32m, dist[2]);
        Assert.Equal(25m / 32m, dist[3]);
    }

    [Fact]
    public void FinalCountDistribution_ZeroCoinProbability_StaysAtInitialCount()
    {
        var dist = HoldAndSpinAnalyzer.FinalCountDistribution(15, 6, 3, 0m);

        Assert.Equal(1m, dist[6]);
        Assert.Equal(1m, dist.Sum());
    }

    [Fact]
    public void FinalCountDistribution_CertainCoins_FillsTheGrid()
    {
        var dist = HoldAndSpinAnalyzer.FinalCountDistribution(15, 6, 3, 1m);

        Assert.Equal(1m, dist[15]);
    }

    [Fact]
    public void FinalCountDistribution_AlwaysSumsToOne()
    {
        var dist = HoldAndSpinAnalyzer.FinalCountDistribution(9, 4, 3, 0.15m);

        Assert.Equal(1m, dist.Sum(), 20);
    }

    // ---- Compound award moments ----

    [Fact]
    public void AwardMoments_CompoundValueDistribution_MatchesHandComputation()
    {
        // p=0 fixes the final count at k=2. Values {1 w3, 5 w1}: E[V]=2, E[V²]=7.
        // Mean = 2·2 = 4; second moment = 2·7 + 2·1·2² = 22.
        var config = BuildFeatureConfig(trigger: 2, respins: 3, coinProbability: 0m, grand: 0m);
        config.HoldAndSpin!.CoinValues.Clear();
        config.HoldAndSpin.CoinValues.Add(new CoinValue(1m, 3m));
        config.HoldAndSpin.CoinValues.Add(new CoinValue(5m, 1m));

        var (mean, second) = HoldAndSpinAnalyzer.AwardMoments(config, 2);

        Assert.Equal(4m, mean);
        Assert.Equal(22m, second);
    }

    // ---- Full integration through the theoretical analyzer ----

    [Fact]
    public void Compute_ImmediateFullGrid_AwardsCoinsPlusGrand()
    {
        // 2 cells, trigger 2, p=0, coin value 2x, grand 10x: landing both coins
        // fills the grid instantly → award 2·2 + 10 = 14 (p = 1/4). Base line
        // [a]→1 on reel 0 pays on (a,s) and (a,a).
        // EV = (14+0+1+1)/4 = 4; E[X²] = (196+1+1)/4 = 49.5 → Var = 33.5; hit = 3/4.
        var config = new SlotConfiguration("Full Grid", 2);
        config.Symbols.Add(new Symbol("s", "Coin", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("a", "A", 1m));

        var line = new PayLine(0, new List<int> { 0 });
        line.Rules.Add(new PayLineRule(new List<string> { "a" }, 1m));
        config.Paytable.PayLines.Add(line);

        config.HoldAndSpin = new HoldAndSpinFeature("s", 2, 0m)
        {
            RespinCount = 3,
            GrandMultiplier = 10m,
            CoinValues = { new CoinValue(2m, 1m) }
        };

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(4m, metrics.ExpectedValue);
        Assert.Equal(33.5m, metrics.Variance);
        Assert.Equal(0.75m, metrics.HitFrequency);
    }

    [Fact]
    public void Compute_RespinGrowth_MatchesHandComputation()
    {
        // 2 cells, trigger 1, 1 respin, p=1/2, coin value 4x, grand 10x.
        // E[F|k=1] = 11, E[F²|k=1] = 170 (half stay at 1 coin → 4, half fill → 18).
        // Outcomes (p=1/4): ss→18; sa→E11; as→base 1 + E11; aa→1.
        // EV = 10.5, Var = 172 − 10.5² = 61.75, hit = 1.
        var config = new SlotConfiguration("Respin Growth", 2);
        config.Symbols.Add(new Symbol("s", "Coin", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("a", "A", 1m));

        var line = new PayLine(0, new List<int> { 0 });
        line.Rules.Add(new PayLineRule(new List<string> { "a" }, 1m));
        config.Paytable.PayLines.Add(line);

        config.HoldAndSpin = new HoldAndSpinFeature("s", 1, 0.5m)
        {
            RespinCount = 1,
            GrandMultiplier = 10m,
            CoinValues = { new CoinValue(4m, 1m) }
        };

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(10.5m, metrics.ExpectedValue);
        Assert.Equal(61.75m, metrics.Variance);
        Assert.Equal(1m, metrics.HitFrequency);
    }

    [Fact]
    public void Compute_MixedCoinValues_MatchesHandComputation()
    {
        // 3 cells, trigger 2, p=0, values {1 w3, 5 w1}, no grand; line [a,a,a]→1.
        // k~Binom(3,1/2): EV = (3/8)·4 + (1/8)·6 + (1/8)·1 = 19/8;
        // E[X²] = (3/8)·22 + (1/8)·45 + (1/8)·1 = 14 → Var = 14 − (19/8)² = 535/64.
        var config = BuildFeatureConfig(trigger: 2, respins: 3, coinProbability: 0m, grand: 0m);
        config.HoldAndSpin!.CoinValues.Clear();
        config.HoldAndSpin.CoinValues.Add(new CoinValue(1m, 3m));
        config.HoldAndSpin.CoinValues.Add(new CoinValue(5m, 1m));

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(2.375m, metrics.ExpectedValue);
        Assert.Equal(8.359375m, metrics.Variance);
        Assert.Equal(0.625m, metrics.HitFrequency);
    }

    // ---- Simulation cross-check: the simulator plays the feature as an actual
    // respin loop, a fully independent implementation of the same process ----

    [Fact]
    public void Simulation_HoldAndSpin_AgreesWithMarkovChainTheory()
    {
        var config = TestConfigs.CreateHoldAndSpinConfig();
        var metrics = TheoreticalAnalyzer.Compute(config);
        var result = new SimulationEngine().RunSimulation(config, 100000);

        Assert.True(Math.Abs(result.ActualRTP - metrics.ExpectedValue) < 0.25m,
            $"Simulated RTP {result.ActualRTP} vs theoretical {metrics.ExpectedValue}");

        decimal simulatedHitRate = (decimal)result.WinningSpins / result.TotalSpins;
        Assert.True(Math.Abs(simulatedHitRate - metrics.HitFrequency) < 0.02m,
            $"Simulated hit rate {simulatedHitRate} vs theoretical {metrics.HitFrequency}");

        Assert.True(Math.Abs(result.ActualVariance - metrics.Variance) < metrics.Variance / 2,
            $"Simulated variance {result.ActualVariance} vs theoretical {metrics.Variance}");
    }

    // ---- Validation ----

    [Fact]
    public void Validate_ShouldFailWhenCoinSymbolIsNotScatter()
    {
        var config = BuildFeatureConfig(2, 3, 0.2m, 10m);
        config.Symbols.First(s => s.Id == "s").IsScatter = false;

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithUnknownCoinSymbol()
    {
        var config = BuildFeatureConfig(2, 3, 0.2m, 10m);
        config.HoldAndSpin!.CoinSymbolId = "nonexistent";

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithBadTriggerRespinsOrProbability()
    {
        var config = BuildFeatureConfig(2, 3, 0.2m, 10m);
        config.HoldAndSpin!.TriggerCount = 0;
        Assert.False(config.Validate());

        config.HoldAndSpin.TriggerCount = 4; // grid has 3 cells
        Assert.False(config.Validate());

        config = BuildFeatureConfig(2, 0, 0.2m, 10m);
        Assert.False(config.Validate());

        config = BuildFeatureConfig(2, 3, 1.5m, 10m);
        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithEmptyOrNonPositiveCoinValues()
    {
        var config = BuildFeatureConfig(2, 3, 0.2m, 10m);
        config.HoldAndSpin!.CoinValues.Clear();
        Assert.False(config.Validate());

        config.HoldAndSpin.CoinValues.Add(new CoinValue(0m, 1m));
        Assert.False(config.Validate());
    }

    private static SlotConfiguration BuildFeatureConfig(int trigger, int respins, decimal coinProbability, decimal grand)
    {
        var config = new SlotConfiguration("Feature", 3);
        config.Symbols.Add(new Symbol("s", "Coin", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("a", "A", 1m));

        var line = new PayLine(0, new List<int> { 0, 1, 2 });
        line.Rules.Add(new PayLineRule(new List<string> { "a", "a", "a" }, 1m));
        config.Paytable.PayLines.Add(line);

        config.HoldAndSpin = new HoldAndSpinFeature("s", trigger, coinProbability)
        {
            RespinCount = respins,
            GrandMultiplier = grand,
            CoinValues = { new CoinValue(2m, 1m) }
        };

        return config;
    }
}
