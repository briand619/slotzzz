namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class VolatilityCalculatorTests
{
    [Fact]
    public void CalculateVariance_ShouldThrowOnInvalidConfig()
    {
        var config = new SlotConfiguration("Invalid", 0);
        var calculator = new VolatilityCalculator();

        Assert.Throws<ArgumentException>(() => calculator.CalculateVariance(config));
    }

    [Fact]
    public void CalculateVariance_ShouldReturnNonNegativeValue()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var calculator = new VolatilityCalculator();

        var variance = calculator.CalculateVariance(config);

        Assert.True(variance >= 0);
    }

    [Fact]
    public void CalculateVariance_SinglePayline_MatchesExactDistribution()
    {
        // One payline, rules aaa→10 (p=1/27) and bbb→5 (p=1/27), else 0.
        // E[X] = 15/27, E[X²] = 125/27, Var = E[X²] − E[X]².
        var config = TestConfigs.CreateSimpleConfig();
        var calculator = new VolatilityCalculator();

        var variance = calculator.CalculateVariance(config);

        decimal p = (1m / 3m) * (1m / 3m) * (1m / 3m);
        decimal mean = p * 10m + p * 5m;
        decimal expectedVariance = p * 100m + p * 25m - mean * mean;

        Assert.Equal(expectedVariance, variance, 10);
    }

    [Fact]
    public void CalculateVariance_MultiplePaylines_AccountsForCorrelation()
    {
        // Two paylines over the same reels: aaa→10 and bbb→10, p=0.5 per symbol.
        // Total win is 10 w.p. 1/4, else 0: Var = 25 − 2.5² = 18.75.
        // Summing per-payline variances (the old, wrong formula) gives 25.0.
        var config = TestConfigs.CreateTwoLineConfig();
        var calculator = new VolatilityCalculator();

        var variance = calculator.CalculateVariance(config);

        Assert.Equal(18.75m, variance);
    }

    [Fact]
    public void CalculateVolatility_ShouldBeSquareRootOfVariance()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var calculator = new VolatilityCalculator();

        var variance = calculator.CalculateVariance(config);
        var volatility = calculator.CalculateVolatility(config);
        var expectedVolatility = (decimal)Math.Sqrt((double)variance);

        Assert.Equal(expectedVolatility, volatility, 10);
    }

    [Fact]
    public void CalculateVolatilityIndex_ShouldReturnNonNegativeValue()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var calculator = new VolatilityCalculator();

        var index = calculator.CalculateVolatilityIndex(config);

        Assert.True(index >= 0);
    }
}
