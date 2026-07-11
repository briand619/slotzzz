namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class WagerModeTests
{
    [Fact]
    public void WagerMode_DefaultsToTotalBet()
    {
        var config = TestConfigs.CreateTwoLineConfig();

        Assert.Equal(WagerMode.TotalBet, config.Paytable.WagerMode);
        Assert.Equal(config.Paytable.BaseWager, config.Paytable.TotalWager);
    }

    [Fact]
    public void TotalWager_BetPerLine_IsBaseWagerTimesLineCount()
    {
        var config = TestConfigs.CreateTwoLineConfig();
        config.Paytable.WagerMode = WagerMode.BetPerLine;

        Assert.Equal(2m, config.Paytable.TotalWager);
    }

    [Fact]
    public void CalculateRTP_BetPerLine_DividesByTotalStake()
    {
        // Two lines, payouts EV = 2.5 per spin. Per-line wager 1 → stake 2 per
        // spin → RTP = 1.25 exactly (in totalBet mode the same config is 2.5).
        var totalBet = TestConfigs.CreateTwoLineConfig();

        var perLine = TestConfigs.CreateTwoLineConfig();
        perLine.Paytable.WagerMode = WagerMode.BetPerLine;

        var calculator = new RTPCalculator();

        Assert.Equal(2.5m, calculator.CalculateRTP(totalBet));
        Assert.Equal(1.25m, calculator.CalculateRTP(perLine));
    }

    [Fact]
    public void CalculateRTP_BetPerLine_ScalesExactlyWithLineCount()
    {
        var totalBet = TestConfigs.Create3x3GridConfig();

        var perLine = TestConfigs.Create3x3GridConfig();
        perLine.Paytable.WagerMode = WagerMode.BetPerLine;

        var calculator = new RTPCalculator();

        Assert.Equal(3, perLine.Paytable.PayLines.Count);
        Assert.Equal(calculator.CalculateRTP(totalBet), calculator.CalculateRTP(perLine) * 3);
    }

    [Fact]
    public void WagerMode_DoesNotChangePayoutsOrHitFrequency()
    {
        // The mode changes the stake, not the wins: expected value, variance,
        // and hit frequency of the payout distribution are identical.
        var totalBet = TestConfigs.CreateTwoLineConfig();

        var perLine = TestConfigs.CreateTwoLineConfig();
        perLine.Paytable.WagerMode = WagerMode.BetPerLine;

        var totalMetrics = TheoreticalAnalyzer.Compute(totalBet);
        var perLineMetrics = TheoreticalAnalyzer.Compute(perLine);

        Assert.Equal(totalMetrics, perLineMetrics);
    }

    [Fact]
    public void RunSimulation_BetPerLine_WagersStakePerSpin()
    {
        var config = TestConfigs.CreateTwoLineConfig();
        config.Paytable.WagerMode = WagerMode.BetPerLine;

        var result = new SimulationEngine().RunSimulation(config, 10000);

        Assert.Equal(20000m, result.TotalWagered);
        Assert.Equal(result.TotalWon / result.TotalWagered, result.ActualRTP);
    }

    [Fact]
    public void RunSimulation_BetPerLine_ConvergesToTheoreticalRTP()
    {
        var config = TestConfigs.CreateTwoLineConfig();
        config.Paytable.WagerMode = WagerMode.BetPerLine;

        var theoreticalRTP = new RTPCalculator().CalculateRTP(config);
        var result = new SimulationEngine().RunSimulation(config, 100000);

        Assert.Equal(1.25m, theoreticalRTP);
        Assert.True(Math.Abs(result.ActualRTP - theoreticalRTP) < 0.05m,
            $"Simulated RTP {result.ActualRTP} vs theoretical {theoreticalRTP}");
    }
}
