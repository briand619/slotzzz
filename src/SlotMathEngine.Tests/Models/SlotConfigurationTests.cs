namespace SlotMathEngine.Tests.Models;

using SlotMathEngine.Models;

public class SlotConfigurationTests
{
    [Fact]
    public void SlotConfiguration_ShouldInitializeWithCorrectProperties()
    {
        var config = new SlotConfiguration("Test Slot", 3);

        Assert.Equal("Test Slot", config.Name);
        Assert.Equal(3, config.NumReels);
        Assert.NotNull(config.Symbols);
        Assert.NotNull(config.Paytable);
    }

    [Fact]
    public void Validate_ShouldFailWithZeroReels()
    {
        var config = new SlotConfiguration("Test", 0);
        config.Symbols.Add(new Symbol("a", "Symbol A", 1m));

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithNoSymbols()
    {
        var config = new SlotConfiguration("Test", 3);

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithZeroWeight()
    {
        var config = new SlotConfiguration("Test", 3);
        config.Symbols.Add(new Symbol("a", "Symbol A", 0));

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldSucceedWithValidConfig()
    {
        var config = TestConfigs.CreateSimpleConfig();

        Assert.True(config.Validate());
        Assert.Empty(config.GetValidationErrors());
    }

    [Fact]
    public void Validate_ShouldFailWithZeroBaseWager()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.BaseWager = 0m;

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithEmptyPaytable()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.PayLines.Clear();

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithNullReelPositions()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.PayLines[0].ReelPositions = null!;

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithNullRuleSymbolIds()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.PayLines[0].Rules[0].SymbolIds = null!;

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithOutOfRangeReelPosition()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.PayLines[0].ReelPositions = new List<int> { 0, 1, 5 };

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithNegativeReelPosition()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.PayLines[0].ReelPositions = new List<int> { 0, 1, -1 };

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithUnknownSymbolInRule()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.PayLines[0].Rules[0].SymbolIds = new List<string> { "a", "a", "nonexistent" };

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithRuleLengthMismatch()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.PayLines[0].Rules[0].SymbolIds = new List<string> { "a", "a" };

        Assert.False(config.Validate());
    }

    [Fact]
    public void Validate_ShouldFailWithDuplicateSymbolIds()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Symbols.Add(new Symbol("a", "Duplicate A", 2m));

        Assert.False(config.Validate());
    }

    [Fact]
    public void EnsureValid_ShouldThrowWithErrorDetails()
    {
        var config = TestConfigs.CreateSimpleConfig();
        config.Paytable.BaseWager = 0m;

        var ex = Assert.Throws<ArgumentException>(() => config.EnsureValid());
        Assert.Contains("wager", ex.Message, StringComparison.OrdinalIgnoreCase);
    }
}
