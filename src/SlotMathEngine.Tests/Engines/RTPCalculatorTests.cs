namespace SlotMathEngine.Tests.Engines;

using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class RTPCalculatorTests
{
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
        var config = TestConfigs.CreateSimpleConfig();
        var calculator = new RTPCalculator();

        var rtp = calculator.CalculateRTP(config);

        Assert.True(rtp > 0);
    }

    [Fact]
    public void CalculateExpectedValue_ShouldCalculateCorrectly()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var calculator = new RTPCalculator();

        var expectedValue = calculator.CalculateExpectedValue(config);

        decimal threeSymbolProb = (1m / 3m) * (1m / 3m) * (1m / 3m);
        decimal expectedTotal = threeSymbolProb * 10m + threeSymbolProb * 5m;

        Assert.Equal(expectedTotal, expectedValue, 10);
    }

    [Fact]
    public void GetHitFrequency_ShouldReturnValueBetweenZeroAndOne()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var calculator = new RTPCalculator();

        var hitFreq = calculator.GetHitFrequency(config);

        Assert.True(hitFreq >= 0);
        Assert.True(hitFreq <= 1);
    }

    [Fact]
    public void GetHitFrequency_ShouldMatchPayLineRules()
    {
        var config = TestConfigs.CreateSimpleConfig();
        var calculator = new RTPCalculator();

        var hitFreq = calculator.GetHitFrequency(config);

        decimal threeSymbolProb = (1m / 3m) * (1m / 3m) * (1m / 3m);
        decimal expectedFreq = threeSymbolProb + threeSymbolProb;

        Assert.Equal(expectedFreq, hitFreq, 10);
    }

    [Fact]
    public void GetHitFrequency_OverlappingPaylines_IsUnionProbabilityNotSum()
    {
        // Two paylines each hit with p=0.5 on the same spin; the naive sum is 1.0,
        // but P(at least one hits) = 1 - 0.5*0.5 = 0.75.
        var config = TestConfigs.CreateOverlappingLinesConfig();
        var calculator = new RTPCalculator();

        var hitFreq = calculator.GetHitFrequency(config);

        Assert.Equal(0.75m, hitFreq);
    }

    [Fact]
    public void CalculateExpectedValue_DuplicateReelPositionsWithConflictingSymbols_ContributesZero()
    {
        // A rule requiring reel 0 to be "a" AND "b" simultaneously is impossible;
        // it must contribute nothing to expected value or hit frequency.
        var config = new SlotConfiguration("Impossible Rule", 3);
        config.Symbols.Add(new Symbol("a", "Symbol A", 1m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 1m));

        var payLine = new PayLine(0, new List<int> { 0, 0, 1 });
        payLine.Rules.Add(new PayLineRule(new List<string> { "a", "b", "a" }, 100m));
        config.Paytable.PayLines.Add(payLine);

        var calculator = new RTPCalculator();

        Assert.Equal(0m, calculator.CalculateExpectedValue(config));
        Assert.Equal(0m, calculator.GetHitFrequency(config));
    }

    [Fact]
    public void CalculateRTP_ShouldThrowOnZeroBaseWager()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.BaseWager = 0m;
        var calculator = new RTPCalculator();

        Assert.Throws<ArgumentException>(() => calculator.CalculateRTP(config));
    }

    [Fact]
    public void CalculateRTP_ShouldThrowOnOutOfRangeReelPosition()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.PayLines[0].ReelPositions = new List<int> { 0, 1, 5 };
        var calculator = new RTPCalculator();

        Assert.Throws<ArgumentException>(() => calculator.CalculateRTP(config));
    }
}
