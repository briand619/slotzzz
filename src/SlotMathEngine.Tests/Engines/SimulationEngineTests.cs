namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class SimulationEngineTests
{
    private SlotConfiguration CreateSimpleConfig()
    {
        var config = new SlotConfiguration("Simple Slot", 3);
        config.Symbols.Add(new Symbol("a", "Symbol A", 1m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 1m));
        config.Symbols.Add(new Symbol("c", "Symbol C", 1m));

        var payLine = new PayLine(0, new List<int> { 0, 1, 2 });
        payLine.Rules.Add(new PayLineRule(new List<string> { "a", "a", "a" }, 10m));
        payLine.Rules.Add(new PayLineRule(new List<string> { "b", "b", "b" }, 5m));
        config.Paytable.PayLines.Add(payLine);

        return config;
    }

    [Fact]
    public void RunSimulation_ShouldThrowOnInvalidConfig()
    {
        var config = new SlotConfiguration("Invalid", 0);
        var engine = new SimulationEngine();

        Assert.Throws<ArgumentException>(() => engine.RunSimulation(config));
    }

    [Fact]
    public void RunSimulation_ShouldReturnValidResult()
    {
        var config = CreateSimpleConfig();
        var engine = new SimulationEngine();

        var result = engine.RunSimulation(config, 1000);

        Assert.NotNull(result);
        Assert.Equal(1000, result.TotalSpins);
        Assert.True(result.TotalWagered > 0);
    }

    [Fact]
    public void RunSimulation_ShouldHaveConsistentMetrics()
    {
        var config = CreateSimpleConfig();
        var engine = new SimulationEngine();

        var result = engine.RunSimulation(config, 10000);

        Assert.True(result.TotalWon >= 0);
        Assert.True(result.WinningSpins >= 0);
        Assert.True(result.WinningSpins <= result.TotalSpins);
        Assert.True(result.ActualRTP >= 0);
    }

    [Fact]
    public void RunSimulation_ShouldHaveCorrectAverageWin()
    {
        var config = CreateSimpleConfig();
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
        var config = CreateSimpleConfig();
        var rtpCalculator = new RTPCalculator();
        var simulationEngine = new SimulationEngine();

        var theoreticalRTP = rtpCalculator.CalculateRTP(config);
        var result = simulationEngine.RunSimulation(config, 100000);

        var tolerance = 0.1m;
        Assert.True(Math.Abs(result.ActualRTP - theoreticalRTP) < tolerance,
            $"Simulated RTP {result.ActualRTP} too far from theoretical {theoreticalRTP}");
    }

    [Fact]
    public void RunSimulation_ShouldCollectAllSpinResults()
    {
        var config = CreateSimpleConfig();
        var engine = new SimulationEngine();

        var result = engine.RunSimulation(config, 100);

        Assert.NotNull(result.SpinResults);
        Assert.Equal(100, result.SpinResults.Count);
    }

    [Fact]
    public void RunSimulation_DefaultSpins_Should100k()
    {
        var config = CreateSimpleConfig();
        var engine = new SimulationEngine();

        var result = engine.RunSimulation(config);

        Assert.Equal(100000, result.TotalSpins);
    }
}
