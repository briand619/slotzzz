namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class NOfAKindTests
{
    [Fact]
    public void KindRules_PayTheLongestRunFromTheLeft()
    {
        // Symbols a, b (p=1/2 each), tiers a×2→2 and a×3→10 on line [0,1,2].
        // aaa→10 (best rule), aab→2, aba/abb→0 (run breaks at position 1),
        // b??→0. EV = 12/8, hit = 2/8.
        var config = BuildConfig(numReels: 3);
        var line = config.Paytable.PayLines[0];
        line.KindRules.Add(new NOfAKindRule("a", 2, 2m));
        line.KindRules.Add(new NOfAKindRule("a", 3, 10m));

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(1.5m, metrics.ExpectedValue);
        Assert.Equal(0.25m, metrics.HitFrequency);
    }

    [Fact]
    public void KindRules_WildsSubstituteAndWildTierWinsOnAllWilds()
    {
        // Symbols a, w(wild): every {a,w}³ combo matches a×3→5; www also matches
        // w×3→20 and takes the higher pay. EV = (7·5 + 20)/8 = 6.875, hit = 1.
        var config = new SlotConfiguration("Wild Kind", 3);
        config.Symbols.Add(new Symbol("a", "A", 1m));
        config.Symbols.Add(new Symbol("w", "Wild", 1m) { IsWild = true });

        var line = new PayLine(0, new List<int> { 0, 1, 2 });
        line.KindRules.Add(new NOfAKindRule("a", 3, 5m));
        line.KindRules.Add(new NOfAKindRule("w", 3, 20m));
        config.Paytable.PayLines.Add(line);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(6.875m, metrics.ExpectedValue);
        Assert.Equal(1m, metrics.HitFrequency);
    }

    [Fact]
    public void KindRules_WildDoesNotSubstituteForScatterTarget()
    {
        var config = new SlotConfiguration("No Sub", 1);
        config.Symbols.Add(new Symbol("s", "Scatter", 1m) { IsScatter = true });
        config.Symbols.Add(new Symbol("w", "Wild", 1m) { IsWild = true });

        var line = new PayLine(0, new List<int> { 0 });
        line.KindRules.Add(new NOfAKindRule("s", 1, 3m));
        config.Paytable.PayLines.Add(line);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(1.5m, metrics.ExpectedValue);
        Assert.Equal(0.5m, metrics.HitFrequency);
    }

    [Fact]
    public void KindRules_CombineWithExactRules_BestWinPaysPerLine()
    {
        // Exact [a,b,a]→50 plus kind a×2→2 on one line:
        // aba→50, aaa→2, aab→2, everything else→0. EV = 54/8, hit = 3/8.
        var config = BuildConfig(numReels: 3);
        var line = config.Paytable.PayLines[0];
        line.Rules.Add(new PayLineRule(new List<string> { "a", "b", "a" }, 50m));
        line.KindRules.Add(new NOfAKindRule("a", 2, 2m));

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(6.75m, metrics.ExpectedValue);
        Assert.Equal(0.375m, metrics.HitFrequency);
    }

    [Fact]
    public void Simulation_KindRules_AgreesWithTheory()
    {
        var config = TestConfigs.CreateFiveReelKindConfig();
        var metrics = TheoreticalAnalyzer.Compute(config);
        var result = new SimulationEngine().RunSimulation(config, 100000);

        Assert.True(Math.Abs(result.ActualRTP - metrics.ExpectedValue) < 0.1m,
            $"Simulated RTP {result.ActualRTP} vs theoretical {metrics.ExpectedValue}");

        decimal simulatedHitRate = (decimal)result.WinningSpins / result.TotalSpins;
        Assert.True(Math.Abs(simulatedHitRate - metrics.HitFrequency) < 0.02m,
            $"Simulated hit rate {simulatedHitRate} vs theoretical {metrics.HitFrequency}");
    }

    [Fact]
    public void Validate_PaylineWithOnlyKindRules_IsValid()
    {
        var config = BuildConfig(numReels: 3);
        config.Paytable.PayLines[0].KindRules.Add(new NOfAKindRule("a", 3, 5m));

        Assert.True(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithUnknownKindRuleSymbol()
    {
        var config = BuildConfig(numReels: 3);
        config.Paytable.PayLines[0].KindRules.Add(new NOfAKindRule("nonexistent", 3, 5m));

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithKindCountOutsideLineLength()
    {
        var config = BuildConfig(numReels: 3);
        config.Paytable.PayLines[0].KindRules.Add(new NOfAKindRule("a", 4, 5m));
        Assert.False(config.Validate());

        config.Paytable.PayLines[0].KindRules[0].Count = 0;
        Assert.False(config.Validate());
    }

    /// <summary>Two equal-weight symbols a and b, one payline over all reels,
    /// no rules yet — each test adds the rules it needs.</summary>
    private static SlotConfiguration BuildConfig(int numReels)
    {
        var config = new SlotConfiguration("Kind Rules", numReels);
        config.Symbols.Add(new Symbol("a", "A", 1m));
        config.Symbols.Add(new Symbol("b", "B", 1m));

        var line = new PayLine(0, Enumerable.Range(0, numReels).ToList());
        config.Paytable.PayLines.Add(line);

        return config;
    }
}
