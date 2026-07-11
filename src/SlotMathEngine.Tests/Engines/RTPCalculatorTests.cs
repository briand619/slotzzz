namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class RTPCalculatorTests
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
    public void CalculateRTP_ShouldThrowOnInvalidConfig()
    {
        var config = new SlotConfiguration("Invalid", 0);
        var calculator = new RTPCalculator();

        Assert.Throws<ArgumentException>(() => calculator.CalculateRTP(config));
    }

    [Fact]
    public void CalculateRTP_ShouldReturnPositiveValue()
    {
        var config = CreateSimpleConfig();
        var calculator = new RTPCalculator();

        var rtp = calculator.CalculateRTP(config);

        Assert.True(rtp > 0);
    }

    [Fact]
    public void CalculateExpectedValue_ShouldCalculateCorrectly()
    {
        var config = CreateSimpleConfig();
        var calculator = new RTPCalculator();

        var expectedValue = calculator.CalculateExpectedValue(config);

        Assert.True(expectedValue > 0);
        decimal threeSymbolProb = (1m / 3m) * (1m / 3m) * (1m / 3m);
        decimal aExpectation = threeSymbolProb * 10m;
        decimal bExpectation = threeSymbolProb * 5m;
        decimal expectedTotal = aExpectation + bExpectation;

        Assert.Equal(expectedTotal, expectedValue, 2);
    }

    [Fact]
    public void GetHitFrequency_ShouldReturnValueBetweenZeroAndOne()
    {
        var config = CreateSimpleConfig();
        var calculator = new RTPCalculator();

        var hitFreq = calculator.GetHitFrequency(config);

        Assert.True(hitFreq >= 0);
        Assert.True(hitFreq <= 1);
    }

    [Fact]
    public void GetHitFrequency_ShouldMatchPayLineRules()
    {
        var config = CreateSimpleConfig();
        var calculator = new RTPCalculator();

        var hitFreq = calculator.GetHitFrequency(config);

        decimal threeSymbolProb = (1m / 3m) * (1m / 3m) * (1m / 3m);
        decimal expectedFreq = threeSymbolProb + threeSymbolProb;

        Assert.Equal(expectedFreq, hitFreq, 10);
    }
}
