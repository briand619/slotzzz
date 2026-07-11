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
    public void SlotConfiguration_Validate_ShouldFailWithZeroReels()
    {
        var config = new SlotConfiguration("Test", 0);
        config.Symbols.Add(new Symbol("a", "Symbol A", 1m));

        Assert.False(config.Validate());
    }

    [Fact]
    public void SlotConfiguration_Validate_ShouldFailWithNoSymbols()
    {
        var config = new SlotConfiguration("Test", 3);

        Assert.False(config.Validate());
    }

    [Fact]
    public void SlotConfiguration_Validate_ShouldFailWithZeroWeight()
    {
        var config = new SlotConfiguration("Test", 3);
        config.Symbols.Add(new Symbol("a", "Symbol A", 0));

        Assert.False(config.Validate());
    }

    [Fact]
    public void SlotConfiguration_Validate_ShouldSucceedWithValidConfig()
    {
        var config = new SlotConfiguration("Test", 3);
        config.Symbols.Add(new Symbol("a", "Symbol A", 1m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 1m));

        Assert.True(config.Validate());
    }
}
