namespace SlotMathEngine.Tests.Models;

using SlotMathEngine.Models;

public class SymbolTests
{
    [Fact]
    public void Symbol_ShouldCreateWithCorrectProperties()
    {
        var symbol = new Symbol("wild", "Wild", 0.1m);

        Assert.Equal("wild", symbol.Id);
        Assert.Equal("Wild", symbol.Name);
        Assert.Equal(0.1m, symbol.Weight);
    }

    [Fact]
    public void Symbol_ShouldAllowWeightUpdates()
    {
        var symbol = new Symbol("wild", "Wild", 0.1m);
        symbol.Weight = 0.2m;

        Assert.Equal(0.2m, symbol.Weight);
    }
}
