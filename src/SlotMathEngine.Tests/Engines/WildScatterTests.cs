namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class WildScatterTests
{
    [Fact]
    public void Wild_SubstitutesForRegularSymbols()
    {
        // Symbols a, b, w(wild), equal weights; rule [a,a] matches when each reel
        // shows a or w: p = (2/3)².
        var config = new SlotConfiguration("Wild", 2);
        config.Symbols.Add(new Symbol("a", "A", 1m));
        config.Symbols.Add(new Symbol("b", "B", 1m));
        config.Symbols.Add(new Symbol("w", "Wild", 1m) { IsWild = true });

        var line = new PayLine(0, new List<int> { 0, 1 });
        line.Rules.Add(new PayLineRule(new List<string> { "a", "a" }, 4m));
        config.Paytable.PayLines.Add(line);

        var metrics = TheoreticalAnalyzer.Compute(config);

        decimal p = (1m / 3m) * (1m / 3m);
        Assert.Equal(4 * p, metrics.HitFrequency);
        Assert.Equal(4 * p * 4m, metrics.ExpectedValue);
    }

    [Fact]
    public void PayLine_PaysOnlyTheHighestMatchingRule()
    {
        // With wilds, w,w matches both [a,a]→4 and [w,w]→10; only the 10 pays.
        // Outcomes (p=1/4 each): aa→4, aw→4, wa→4, ww→10 ⇒ EV = 22/4.
        var config = new SlotConfiguration("Best Rule", 2);
        config.Symbols.Add(new Symbol("a", "A", 1m));
        config.Symbols.Add(new Symbol("w", "Wild", 1m) { IsWild = true });

        var line = new PayLine(0, new List<int> { 0, 1 });
        line.Rules.Add(new PayLineRule(new List<string> { "a", "a" }, 4m));
        line.Rules.Add(new PayLineRule(new List<string> { "w", "w" }, 10m));
        config.Paytable.PayLines.Add(line);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(5.5m, metrics.ExpectedValue);
        Assert.Equal(1m, metrics.HitFrequency);
    }

    [Fact]
    public void Wild_DoesNotSubstituteForScatter()
    {
        // Rule requires the scatter symbol; a wild on the grid must not satisfy it.
        var config = new SlotConfiguration("No Sub", 1);
        config.Symbols.Add(new Symbol("s", "Scatter", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("w", "Wild", 1m) { IsWild = true });

        var line = new PayLine(0, new List<int> { 0 });
        line.Rules.Add(new PayLineRule(new List<string> { "s" }, 5m));
        config.Paytable.PayLines.Add(line);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(0.5m, metrics.HitFrequency);
        Assert.Equal(2.5m, metrics.ExpectedValue);
    }

    [Fact]
    public void Scatter_PaysAnywhereOnTheGrid_IncludingOffPaylineRows()
    {
        // 1 reel × 2 rows, strip [s,s,a]. Stop 0 shows two scatters (rows 0+1),
        // paying the count-2 tier even though no payline reads row 1.
        var config = new SlotConfiguration("Scatter Rows", 1) { NumRows = 2 };
        config.Symbols.Add(new Symbol("s", "Scatter", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("a", "A", 1m));
        config.Reels = new List<ReelStrip>
        {
            new(new[] { new ReelStop("s", 1m), new ReelStop("s", 1m), new ReelStop("a", 1m) })
        };

        var line = new PayLine(0, new List<int> { 0 });
        line.Rules.Add(new PayLineRule(new List<string> { "a" }, 1m));
        config.Paytable.PayLines.Add(line);
        config.Paytable.ScatterRules.Add(new ScatterRule("s", 2, 6m));

        var metrics = TheoreticalAnalyzer.Compute(config);

        // Stops: (s,s)→scatter 6; (s,a)→0; (a,s)→line 1. EV = 7/3, hit = 2/3.
        decimal p = 1m / 3m;
        Assert.Equal(p * 6m + p * 1m, metrics.ExpectedValue);
        Assert.Equal(p * 2m, metrics.HitFrequency);
    }

    [Fact]
    public void Scatter_ExactCountTiers_DoNotStack()
    {
        // Tiers (2 scatters → 5x) and (3 scatters → 20x): three scatters pay 20,
        // not 25. Outcomes (p=1/8): sss→20; 3×two-s→5; 3×one-s→0; aaa→line 1.
        var config = BuildThreeReelScatterConfig();

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(4.5m, metrics.ExpectedValue);
        Assert.Equal(0.625m, metrics.HitFrequency);
    }

    [Fact]
    public void Scatter_PaysOnTotalStake_InBetPerLineMode()
    {
        // Same game with a second identical payline and betPerLine: stake = 2, so
        // scatter tiers pay double (their multiplier applies to the total stake)
        // and the aaa outcome pays both lines. EV = (40 + 3·10 + 2)/8 = 9.
        var config = BuildThreeReelScatterConfig();
        var secondLine = new PayLine(1, new List<int> { 0, 1, 2 });
        secondLine.Rules.Add(new PayLineRule(new List<string> { "a", "a", "a" }, 1m));
        config.Paytable.PayLines.Add(secondLine);
        config.Paytable.WagerMode = WagerMode.BetPerLine;

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(9m, metrics.ExpectedValue);
        Assert.Equal(4.5m, new RTPCalculator().CalculateRTP(config));
    }

    [Fact]
    public void Simulation_WildsAndScatters_AgreesWithTheory()
    {
        var config = TestConfigs.CreateWildScatterConfig();
        var metrics = TheoreticalAnalyzer.Compute(config);
        var result = new SimulationEngine().RunSimulation(config, 100000);

        Assert.True(Math.Abs(result.ActualRTP - metrics.ExpectedValue) < 0.15m,
            $"Simulated RTP {result.ActualRTP} vs theoretical {metrics.ExpectedValue}");

        decimal simulatedHitRate = (decimal)result.WinningSpins / result.TotalSpins;
        Assert.True(Math.Abs(simulatedHitRate - metrics.HitFrequency) < 0.02m,
            $"Simulated hit rate {simulatedHitRate} vs theoretical {metrics.HitFrequency}");
    }

    [Fact]
    public void Validate_ShouldFailWhenSymbolIsBothWildAndScatter()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Symbols.Add(new Symbol("ws", "Both", 1m) { IsWild = true, IsScatter = true });

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWhenScatterRuleReferencesUnknownSymbol()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.ScatterRules.Add(new ScatterRule("nonexistent", 2, 5m));

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWhenScatterRuleTargetsNonScatterSymbol()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.ScatterRules.Add(new ScatterRule("a", 2, 5m));

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWhenScatterCountExceedsGridCells()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Symbols.Add(new Symbol("s", "Scatter", 1m) { IsScatter = true });
        config.Paytable.ScatterRules.Add(new ScatterRule("s", 4, 5m));

        Assert.False(config.Validate());

        config.Paytable.ScatterRules[0].Count = 0;
        Assert.False(config.Validate());
    }

    private static SlotConfiguration BuildThreeReelScatterConfig()
    {
        var config = new SlotConfiguration("Scatter Tiers", 3);
        config.Symbols.Add(new Symbol("s", "Scatter", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("a", "A", 1m));

        var line = new PayLine(0, new List<int> { 0, 1, 2 });
        line.Rules.Add(new PayLineRule(new List<string> { "a", "a", "a" }, 1m));
        config.Paytable.PayLines.Add(line);

        config.Paytable.ScatterRules.Add(new ScatterRule("s", 2, 5m));
        config.Paytable.ScatterRules.Add(new ScatterRule("s", 3, 20m));

        return config;
    }
}
