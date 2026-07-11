namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class SimulationEngineTests
{
    [Fact]
    public void RunSimulation_ShouldThrowOnInvalidConfig()
    {
        var config = new SlotConfiguration("Invalid", 0);
        var engine = new SimulationEngine();

        Assert.Throws<ArgumentException>(() => engine.RunSimulation(config));
    }

    [Fact]
    public void RunSimulation_ShouldThrowOnNonPositiveSpinCount()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var engine = new SimulationEngine();

        Assert.Throws<ArgumentException>(() => engine.RunSimulation(config, 0));
        Assert.Throws<ArgumentException>(() => engine.RunSimulation(config, -5));
    }

    [Fact]
    public void RunSimulation_ShouldReturnValidResult()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var engine = new SimulationEngine();

        var result = engine.RunSimulation(config, 1000);

        Assert.NotNull(result);
        Assert.Equal(1000, result.TotalSpins);
        Assert.Equal(1000m * config.Paytable.BaseWager, result.TotalWagered);
    }

    [Fact]
    public void RunSimulation_ShouldHaveConsistentMetrics()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var engine = new SimulationEngine();

        var result = engine.RunSimulation(config, 10000);

        Assert.True(result.TotalWon >= 0);
        Assert.True(result.WinningSpins >= 0);
        Assert.True(result.WinningSpins <= result.TotalSpins);
        Assert.True(result.ActualRTP >= 0);
        Assert.True(result.ActualVariance >= 0);
    }

    [Fact]
    public void RunSimulation_ShouldHaveCorrectAverageWin()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var engine = new SimulationEngine();

        var result = engine.RunSimulation(config, 10000);

        if (result.WinningSpins > 0)
        {
            var expectedAverage = result.TotalWon / result.WinningSpins;
            Assert.Equal(expectedAverage, result.AverageWin, 2);
        }
    }

    [Fact]
    public void RunSimulation_ShouldApproximateTheoreticalRTP()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var rtpCalculator = new RTPCalculator();
        var simulationEngine = new SimulationEngine();

        var theoreticalRTP = rtpCalculator.CalculateRTP(config);
        var result = simulationEngine.RunSimulation(config, 100000);

        var tolerance = 0.1m;
        Assert.True(Math.Abs(result.ActualRTP - theoreticalRTP) < tolerance,
            $"Simulated RTP {result.ActualRTP} too far from theoretical {theoreticalRTP}");
    }

    [Fact]
    public void RunSimulation_MultiPayline_ShouldApproximateTheoreticalMetrics()
    {
        // Regression test for the multi-payline math bugs: theoretical RTP, variance,
        // and hit frequency must all agree with what the simulator actually produces
        // when paylines share reels.
        var config = TestConfigs.CreateTwoLineConfig();
        var metrics = TheoreticalAnalyzer.Compute(config);
        var result = new SimulationEngine().RunSimulation(config, 100000);

        // Standard errors at 100K spins: RTP ~0.014, variance ~0.07, hit rate ~0.0014.
        Assert.True(Math.Abs(result.ActualRTP - metrics.ExpectedValue) < 0.1m,
            $"Simulated RTP {result.ActualRTP} vs theoretical {metrics.ExpectedValue}");
        Assert.True(Math.Abs(result.ActualVariance - metrics.Variance) < 1.0m,
            $"Simulated variance {result.ActualVariance} vs theoretical {metrics.Variance}");

        decimal simulatedHitRate = (decimal)result.WinningSpins / result.TotalSpins;
        Assert.True(Math.Abs(simulatedHitRate - metrics.HitFrequency) < 0.02m,
            $"Simulated hit rate {simulatedHitRate} vs theoretical {metrics.HitFrequency}");
    }

    [Fact]
    public void RunSimulation_OverlappingPaylines_HitRateMatchesUnionProbability()
    {
        var config = TestConfigs.CreateOverlappingLinesConfig();
        var result = new SimulationEngine().RunSimulation(config, 100000);

        decimal simulatedHitRate = (decimal)result.WinningSpins / result.TotalSpins;

        Assert.True(Math.Abs(simulatedHitRate - 0.75m) < 0.02m,
            $"Simulated hit rate {simulatedHitRate} should approximate 0.75");
    }

    [Fact]
    public void RunSimulation_DefaultSpins_Should100k()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var engine = new SimulationEngine();

        var result = engine.RunSimulation(config);

        Assert.Equal(100000, result.TotalSpins);
    }
}
