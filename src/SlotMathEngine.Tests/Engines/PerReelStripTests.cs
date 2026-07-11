namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class PerReelStripTests
{
    [Fact]
    public void Compute_PerReelStrips_UsesEachReelsOwnDistribution()
    {
        var config = TestConfigs.CreatePerReelConfig();

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(1.0m, metrics.ExpectedValue);
        Assert.Equal(0.5m, metrics.HitFrequency);
        Assert.Equal(1.0m, metrics.Variance);
    }

    [Fact]
    public void Compute_ReelOrderMatters_WhenStripsDiffer()
    {
        // Reel 0: p(a)=0.9; reel 1: p(a)=0.1. A payline on position [0] must pay
        // 9x more often than the same rule on position [1].
        SlotConfiguration Build(int position)
        {
            var config = new SlotConfiguration("Asymmetric", 2);
            config.Symbols.Add(new Symbol("a", "Symbol A", 1m));
            config.Symbols.Add(new Symbol("b", "Symbol B", 1m));
            config.Reels = new List<ReelStrip>
            {
                new(new[] { new ReelStop("a", 9m), new ReelStop("b", 1m) }),
                new(new[] { new ReelStop("a", 1m), new ReelStop("b", 9m) })
            };

            var payLine = new PayLine(0, new List<int> { position });
            payLine.Rules.Add(new PayLineRule(new List<string> { "a" }, 1m));
            config.Paytable.PayLines.Add(payLine);
            return config;
        }

        Assert.Equal(0.9m, TheoreticalAnalyzer.Compute(Build(0)).ExpectedValue);
        Assert.Equal(0.1m, TheoreticalAnalyzer.Compute(Build(1)).ExpectedValue);
    }

    [Fact]
    public void GetReelDistributions_AggregatesDuplicateStopsOfSameSymbol()
    {
        // Stops a:1 + a:2 + b:3 → p(a) = 3/6 = 0.5.
        var config = new SlotConfiguration("Duplicate Stops", 1);
        config.Symbols.Add(new Symbol("a", "Symbol A", 1m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 1m));
        config.Reels = new List<ReelStrip>
        {
            new(new[] { new ReelStop("a", 1m), new ReelStop("a", 2m), new ReelStop("b", 3m) })
        };

        var payLine = new PayLine(0, new List<int> { 0 });
        payLine.Rules.Add(new PayLineRule(new List<string> { "a" }, 2m));
        config.Paytable.PayLines.Add(payLine);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(1.0m, metrics.ExpectedValue);
        Assert.Equal(0.5m, metrics.HitFrequency);
    }

    [Fact]
    public void Simulation_PerReelStrips_AgreesWithTheory()
    {
        var config = TestConfigs.CreatePerReelConfig();
        var metrics = TheoreticalAnalyzer.Compute(config);
        var result = new SimulationEngine().RunSimulation(config, 100000);

        Assert.True(Math.Abs(result.ActualRTP - metrics.ExpectedValue) < 0.05m,
            $"Simulated RTP {result.ActualRTP} vs theoretical {metrics.ExpectedValue}");
        Assert.True(Math.Abs(result.ActualVariance - metrics.Variance) < 0.2m,
            $"Simulated variance {result.ActualVariance} vs theoretical {metrics.Variance}");

        decimal simulatedHitRate = (decimal)result.WinningSpins / result.TotalSpins;
        Assert.True(Math.Abs(simulatedHitRate - metrics.HitFrequency) < 0.02m,
            $"Simulated hit rate {simulatedHitRate} vs theoretical {metrics.HitFrequency}");
    }

    [Fact]
    public void SharedWeights_StillBehaveAsBefore_WhenNoReelsConfigured()
    {
        // Same distribution expressed both ways must produce identical metrics.
        var shared = TestConfigs.CreateTwoLineConfig();

        var explicitReels = TestConfigs.CreateTwoLineConfig();
        explicitReels.Reels = Enumerable.Range(0, 3)
            .Select(_ => new ReelStrip(new[] { new ReelStop("a", 1m), new ReelStop("b", 1m) }))
            .ToList();

        var sharedMetrics = TheoreticalAnalyzer.Compute(shared);
        var explicitMetrics = TheoreticalAnalyzer.Compute(explicitReels);

        Assert.Equal(sharedMetrics.ExpectedValue, explicitMetrics.ExpectedValue);
        Assert.Equal(sharedMetrics.Variance, explicitMetrics.Variance);
        Assert.Equal(sharedMetrics.HitFrequency, explicitMetrics.HitFrequency);
    }

    [Fact]
    public void Validate_ShouldFailWhenReelCountDoesNotMatchNumReels()
    {
        var config = TestConfigs.CreatePerReelConfig();
        config.Reels!.RemoveAt(1);

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithEmptyStrip()
    {
        var config = TestConfigs.CreatePerReelConfig();
        config.Reels![1].Stops.Clear();

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithUnknownSymbolInStrip()
    {
        var config = TestConfigs.CreatePerReelConfig();
        config.Reels![1].Stops.Add(new ReelStop("nonexistent", 1m));

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithNonPositiveStopWeight()
    {
        var config = TestConfigs.CreatePerReelConfig();
        config.Reels![1].Stops[0].Weight = 0m;

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_CatalogWeightsNotRequired_WhenReelsAreExplicit()
    {
        // With explicit strips the catalog is just a symbol dictionary;
        // its weights are unused and may be zero (e.g. omitted in JSON).
        var config = TestConfigs.CreatePerReelConfig();
        foreach (var symbol in config.Symbols)
            symbol.Weight = 0m;

        Assert.True(config.Validate());
        Assert.Equal(1.0m, TheoreticalAnalyzer.Compute(config).ExpectedValue);
    }
}
