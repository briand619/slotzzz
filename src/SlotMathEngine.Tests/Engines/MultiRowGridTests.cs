namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class MultiRowGridTests
{
    private static SlotConfiguration BuildSingleReel(int numRows, string[] strip)
    {
        var config = new SlotConfiguration("Grid", 1) { NumRows = numRows };
        foreach (var id in strip.Distinct())
            config.Symbols.Add(new Symbol(id, id.ToUpperInvariant(), 1m));
        config.Reels = new List<ReelStrip>
        {
            new(strip.Select(id => new ReelStop(id, 1m)))
        };
        return config;
    }

    [Fact]
    public void Compute_WindowSemantics_RowNReadsNthStopAfterTheStopPosition()
    {
        // Strip [a, b], 2 rows. Row 1 shows "b" only when the reel stops on
        // position 0 (window a,b) → p = 0.5.
        var config = BuildSingleReel(2, new[] { "a", "b" });
        var payLine = new PayLine(0, new List<int> { 0 }) { RowPositions = new List<int> { 1 } };
        payLine.Rules.Add(new PayLineRule(new List<string> { "b" }, 2m));
        config.Paytable.PayLines.Add(payLine);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(1.0m, metrics.ExpectedValue);
        Assert.Equal(0.5m, metrics.HitFrequency);
    }

    [Fact]
    public void Compute_RowsOnSameReel_AreCorrelatedLikeAPhysicalStrip()
    {
        // Strip [a, a, b], 2 rows, rule requires "a" on both rows of reel 0.
        // Windows: (a,a) from stop 0; (a,b) from stop 1; (b,a) from stop 2 —
        // so P = 1/3. Independent per-cell draws would wrongly give (2/3)² = 4/9.
        var config = BuildSingleReel(2, new[] { "a", "a", "b" });
        var payLine = new PayLine(0, new List<int> { 0, 0 })
        {
            RowPositions = new List<int> { 0, 1 }
        };
        payLine.Rules.Add(new PayLineRule(new List<string> { "a", "a" }, 1m));
        config.Paytable.PayLines.Add(payLine);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(1m / 3m, metrics.HitFrequency);
        Assert.Equal(1m / 3m, metrics.ExpectedValue);
        Assert.NotEqual(4m / 9m, metrics.HitFrequency);
    }

    [Fact]
    public void Compute_DiagonalPayline_ReadsDifferentRowsPerReel()
    {
        // Two reels with strip [a, b] each, 2 rows. Diagonal (reel0,row0)→(reel1,row1)
        // pays on a,a: reel0 must stop on 0 and reel1's row 1 is "a" only from stop 1
        // (window b,a) → p = 1/4.
        var config = new SlotConfiguration("Diagonal", 2) { NumRows = 2 };
        config.Symbols.Add(new Symbol("a", "A", 1m));
        config.Symbols.Add(new Symbol("b", "B", 1m));
        config.Reels = new List<ReelStrip>
        {
            new(new[] { new ReelStop("a", 1m), new ReelStop("b", 1m) }),
            new(new[] { new ReelStop("a", 1m), new ReelStop("b", 1m) })
        };

        var payLine = new PayLine(0, new List<int> { 0, 1 })
        {
            RowPositions = new List<int> { 0, 1 }
        };
        payLine.Rules.Add(new PayLineRule(new List<string> { "a", "a" }, 4m));
        config.Paytable.PayLines.Add(payLine);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(0.25m, metrics.HitFrequency);
        Assert.Equal(1.0m, metrics.ExpectedValue);
    }

    [Fact]
    public void Compute_PaylineWithoutRowPositions_ReadsRowZero()
    {
        // Same grid as the window-semantics test, but the payline omits
        // rowPositions: it must read row 0, where "b" appears only from stop 1.
        var config = BuildSingleReel(2, new[] { "a", "b" });
        var payLine = new PayLine(0, new List<int> { 0 });
        payLine.Rules.Add(new PayLineRule(new List<string> { "b" }, 2m));
        config.Paytable.PayLines.Add(payLine);

        var metrics = TheoreticalAnalyzer.Compute(config);

        Assert.Equal(0.5m, metrics.HitFrequency);
    }

    [Fact]
    public void Simulation_MultiRowGrid_AgreesWithTheory()
    {
        var config = TestConfigs.Create3x3GridConfig();
        var metrics = TheoreticalAnalyzer.Compute(config);
        var result = new SimulationEngine().RunSimulation(config, 100000);

        Assert.True(Math.Abs(result.ActualRTP - metrics.ExpectedValue) < 0.1m,
            $"Simulated RTP {result.ActualRTP} vs theoretical {metrics.ExpectedValue}");
        Assert.True(Math.Abs(result.ActualVariance - metrics.Variance) < metrics.Variance / 2,
            $"Simulated variance {result.ActualVariance} vs theoretical {metrics.Variance}");

        decimal simulatedHitRate = (decimal)result.WinningSpins / result.TotalSpins;
        Assert.True(Math.Abs(simulatedHitRate - metrics.HitFrequency) < 0.02m,
            $"Simulated hit rate {simulatedHitRate} vs theoretical {metrics.HitFrequency}");
    }

    [Fact]
    public void Validate_ShouldFailWhenMultiRowWithoutExplicitReels()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.NumRows = 3;

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWhenStripShorterThanRows()
    {
        var config = BuildSingleReel(3, new[] { "a", "b" });
        var payLine = new PayLine(0, new List<int> { 0 });
        payLine.Rules.Add(new PayLineRule(new List<string> { "a" }, 1m));
        config.Paytable.PayLines.Add(payLine);

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithRowPositionsCountMismatch()
    {
        var config = BuildSingleReel(2, new[] { "a", "b" });
        var payLine = new PayLine(0, new List<int> { 0 })
        {
            RowPositions = new List<int> { 0, 1 }
        };
        payLine.Rules.Add(new PayLineRule(new List<string> { "a" }, 1m));
        config.Paytable.PayLines.Add(payLine);

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithOutOfRangeRowPosition()
    {
        var config = BuildSingleReel(2, new[] { "a", "b" });
        var payLine = new PayLine(0, new List<int> { 0 })
        {
            RowPositions = new List<int> { 2 }
        };
        payLine.Rules.Add(new PayLineRule(new List<string> { "a" }, 1m));
        config.Paytable.PayLines.Add(payLine);

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithZeroRows()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.NumRows = 0;

        Assert.False(config.Validate());
    }
}
