namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class FreeSpinsTests
{
    [Fact]
    public void Compute_NoRetrigger_MatchesHandComputation()
    {
        // 1 reel, symbols s(scatter), a (p=1/2). Line [a]→2. FS: trigger 1×s,
        // 2 spins at ×3, no retrigger.
        // Per free spin: P = 0 (s) or 6 (a) → E[P]=3, E[P²]=18.
        // Feature (2 iid spins): mean 6, second = 2·18 + 2·9 = 54.
        // Base: s → E[X]=6, E[X²]=54; a → X=2.
        // EV = 4, E[X²] = 29 → Var = 13; every outcome pays or triggers → hit 1.
        var config = BuildSingleReelConfig();
        config.FreeSpins = new FreeSpinsFeature("s", 1, 2)
        {
            WinMultiplier = 3m,
            AllowRetrigger = false
        };

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(4m, metrics.ExpectedValue);
        Assert.Equal(13m, metrics.Variance);
        Assert.Equal(1m, metrics.HitFrequency);
    }

    [Fact]
    public void Compute_Retrigger_DeterministicGameHasZeroVariance()
    {
        // 1 reel, s/a at p=1/2, line [a]→2, FS: 1 spin per (re)trigger, ×1.
        // Every path keeps spinning until an "a" lands, paying exactly 2 —
        // in the base game directly, or through the feature. The whole game
        // is X = 2 with certainty: the branching formulas must give Var = 0.
        var config = BuildSingleReelConfig();
        config.FreeSpins = new FreeSpinsFeature("s", 1, 1);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(2m, metrics.ExpectedValue);
        Assert.Equal(0m, metrics.Variance);
        Assert.Equal(1m, metrics.HitFrequency);
    }

    [Fact]
    public void Compute_RetriggerWithPayingTriggerSpin_MatchesHandComputation()
    {
        // Adds a scatter pay (1×s → 4) so the retriggering spin itself pays,
        // exercising the E[P·K] joint-moment term. FS: 1 spin, ×2, retrigger.
        // Per free spin: s → 8 (retrigger), a → 4. E[P]=6, E[P²]=40, q=1/2,
        // E[P·1(retrigger)]=4. E[T] = 6/(1/2) = 12;
        // E[T²] = (40 + 2·1·4·12)/(1/2) = 272.
        // Base: s → b=4, E[X]=16, E[X²]=16+96+272=384; a → X=2.
        // EV = 9, E[X²] = 194 → Var = 113.
        var config = BuildSingleReelConfig();
        config.Paytable.ScatterRules.Add(new ScatterRule("s", 1, 4m));
        config.FreeSpins = new FreeSpinsFeature("s", 1, 1)
        {
            WinMultiplier = 2m
        };

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(9m, metrics.ExpectedValue);
        Assert.Equal(113m, metrics.Variance);
        Assert.Equal(1m, metrics.HitFrequency);
    }

    [Fact]
    public void Compute_DivergentRetriggers_Throws()
    {
        // q = 1/2 per free spin, 2 spins per retrigger → expected offspring 1:
        // infinite expected spins, must be rejected.
        var config = BuildSingleReelConfig();
        config.FreeSpins = new FreeSpinsFeature("s", 1, 2);

        var ex = Assert.Throws<ArgumentException>(() => TheoreticalAnalyzer.Compute(config));
        Assert.Contains("diverge", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Compute_CombinedHoldAndSpinAndFreeSpins_MatchesHandComputation()
    {
        // 2 reels, symbols c(coin scatter), f(fs scatter), a — p=1/3 each.
        // Line [0]: [a]→3. H&S: trigger 1×c, p=0, coin value 2 (award = 2 per
        // coin, deterministic). FS: trigger 1×f, 1 spin, ×1, no retrigger
        // (per free spin E[P]=1, E[P²]=3).
        // Enumerating the 9 base outcomes gives EV = 26/9, E[X²] = 100/9
        // (the (c,f)/(f,c) outcomes exercise the 2·Hm·Fm cross term), hit = 1.
        var config = new SlotConfiguration("Combined", 2);
        config.Symbols.Add(new Symbol("c", "Coin", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("f", "FS Trigger", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("a", "A", 1m));

        var line = new PayLine(0, new List<int> { 0 });
        line.Rules.Add(new PayLineRule(new List<string> { "a" }, 3m));
        config.Paytable.PayLines.Add(line);

        config.HoldAndSpin = new HoldAndSpinFeature("c", 1, 0m)
        {
            RespinCount = 3,
            GrandMultiplier = 0m,
            CoinValues = { new CoinValue(2m, 1m) }
        };
        config.FreeSpins = new FreeSpinsFeature("f", 1, 1)
        {
            AllowRetrigger = false
        };

        var metrics = TheoreticalAnalyzer.Compute(config);

        decimal p = (1m / 3m) * (1m / 3m);
        Assert.Equal(p * 26m, metrics.ExpectedValue, 20);
        Assert.Equal(p * 100m - p * 26m * (p * 26m), metrics.Variance, 20);
        Assert.Equal(1m, metrics.HitFrequency, 20);
    }

    [Fact]
    public void Simulation_FreeSpinsWithRetriggers_AgreesWithTheory()
    {
        var config = TestConfigs.CreateFreeSpinsConfig();
        var metrics = TheoreticalAnalyzer.Compute(config);
        var result = new SimulationEngine().RunSimulation(config, 100000);

        Assert.True(Math.Abs(result.ActualRTP - metrics.ExpectedValue) < 0.1m,
            $"Simulated RTP {result.ActualRTP} vs theoretical {metrics.ExpectedValue}");

        decimal simulatedHitRate = (decimal)result.WinningSpins / result.TotalSpins;
        Assert.True(Math.Abs(simulatedHitRate - metrics.HitFrequency) < 0.02m,
            $"Simulated hit rate {simulatedHitRate} vs theoretical {metrics.HitFrequency}");
    }

    [Fact]
    public void Validate_ShouldFailWithBadFreeSpinsConfig()
    {
        var config = BuildSingleReelConfig();

        config.FreeSpins = new FreeSpinsFeature("nonexistent", 1, 5);
        Assert.False(config.Validate());

        config.FreeSpins = new FreeSpinsFeature("a", 1, 5); // not a scatter
        Assert.False(config.Validate());

        config.FreeSpins = new FreeSpinsFeature("s", 0, 5);
        Assert.False(config.Validate());

        config.FreeSpins = new FreeSpinsFeature("s", 2, 5); // grid has 1 cell
        Assert.False(config.Validate());

        config.FreeSpins = new FreeSpinsFeature("s", 1, 0);
        Assert.False(config.Validate());

        config.FreeSpins = new FreeSpinsFeature("s", 1, 5) { WinMultiplier = 0m };
        Assert.False(config.Validate());

        config.FreeSpins = new FreeSpinsFeature("s", 1, 1);
        Assert.True(config.Validate());
    }

    /// <summary>One reel, one row: s (scatter) and a at p=1/2 each, line [a]→2x.</summary>
    private static SlotConfiguration BuildSingleReelConfig()
    {
        var config = new SlotConfiguration("Free Spins", 1);
        config.Symbols.Add(new Symbol("s", "Scatter", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("a", "A", 1m));

        var line = new PayLine(0, new List<int> { 0 });
        line.Rules.Add(new PayLineRule(new List<string> { "a" }, 2m));
        config.Paytable.PayLines.Add(line);

        return config;
    }
}
