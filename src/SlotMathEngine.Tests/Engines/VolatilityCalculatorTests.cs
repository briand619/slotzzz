namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class VolatilityCalculatorTests
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
    public void CalculateVariance_ShouldThrowOnInvalidConfig()
    {
        var config = new SlotConfiguration("Invalid", 0);
        var calculator = new VolatilityCalculator();

        Assert.Throws<ArgumentException>(() => calculator.CalculateVariance(config));
    }

    [Fact]
    public void CalculateVariance_ShouldReturnNonNegativeValue()
    {
        var config = CreateSimpleConfig();
        var calculator = new VolatilityCalculator();

        var variance = calculator.CalculateVariance(config);

        Assert.True(variance >= 0);
    }

    [Fact]
    public void CalculateVolatility_ShouldReturnNonNegativeValue()
    {
        var config = CreateSimpleConfig();
        var calculator = new VolatilityCalculator();

        var volatility = calculator.CalculateVolatility(config);

        Assert.True(volatility >= 0);
    }

    [Fact]
    public void CalculateVolatilityIndex_ShouldReturnNonNegativeValue()
    {
        var config = CreateSimpleConfig();
        var calculator = new VolatilityCalculator();

        var index = calculator.CalculateVolatilityIndex(config);

        Assert.True(index >= 0);
    }

    [Fact]
    public void CalculateVolatility_ShouldBeSquareRootOfVariance()
    {
        var config = CreateSimpleConfig();
        var calculator = new VolatilityCalculator();

        var variance = calculator.CalculateVariance(config);
        var volatility = calculator.CalculateVolatility(config);
        var expectedVolatility = (decimal)Math.Sqrt((double)variance);

        Assert.Equal(expectedVolatility, volatility, 10);
    }
}
