namespace SlotMathEngine.Tests;

using SlotMathEngine.Models;

public static class TestConfigs
{
    /// <summary>Three equal-weight symbols, one payline [0,1,2] with aaa→10x and bbb→5x.</summary>
    public static SlotConfiguration CreateSimpleConfig()
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

    /// <summary>
    /// Two equal-weight symbols (p=0.5 each), two paylines over the same reels [0,1,2]:
    /// aaa→10x on line 0 and bbb→10x on line 1. Exact distribution: win 10 w.p. 1/4,
    /// else 0 → EV=2.5, Var=25−6.25=18.75, hit=0.25.
    /// </summary>
    public static SlotConfiguration CreateTwoLineConfig()
    {
        var config = new SlotConfiguration("Two Line Slot", 3);
        config.Symbols.Add(new Symbol("a", "Symbol A", 1m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 1m));

        var line1 = new PayLine(0, new List<int> { 0, 1, 2 });
        line1.Rules.Add(new PayLineRule(new List<string> { "a", "a", "a" }, 10m));
        config.Paytable.PayLines.Add(line1);

        var line2 = new PayLine(1, new List<int> { 0, 1, 2 });
        line2.Rules.Add(new PayLineRule(new List<string> { "b", "b", "b" }, 10m));
        config.Paytable.PayLines.Add(line2);

        return config;
    }

    /// <summary>
    /// Per-reel strips: reel 0 shows only "a"; reel 1 shows "a" or "b" with equal
    /// probability. One payline [0,1] with rule aa→2x.
    /// Exact: EV = 1·0.5·2 = 1.0, hit = 0.5, Var = 0.5·4 − 1² = 1.0.
    /// </summary>
    public static SlotConfiguration CreatePerReelConfig()
    {
        var config = new SlotConfiguration("Per Reel Slot", 2);
        config.Symbols.Add(new Symbol("a", "Symbol A", 1m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 1m));

        config.Reels = new List<ReelStrip>
        {
            new(new[] { new ReelStop("a", 1m) }),
            new(new[] { new ReelStop("a", 1m), new ReelStop("b", 1m) })
        };

        var payLine = new PayLine(0, new List<int> { 0, 1 });
        payLine.Rules.Add(new PayLineRule(new List<string> { "a", "a" }, 2m));
        config.Paytable.PayLines.Add(payLine);

        return config;
    }

    /// <summary>
    /// Two equal-weight symbols, two overlapping single-position paylines:
    /// line 0 pays 2x when reel 0 shows "a"; line 1 pays 2x when reel 1 shows "a".
    /// True hit frequency is P(at least one) = 0.75, not 0.5 + 0.5.
    /// </summary>
    public static SlotConfiguration CreateOverlappingLinesConfig()
    {
        var config = new SlotConfiguration("Overlapping Lines Slot", 2);
        config.Symbols.Add(new Symbol("a", "Symbol A", 1m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 1m));

        var line1 = new PayLine(0, new List<int> { 0 });
        line1.Rules.Add(new PayLineRule(new List<string> { "a" }, 2m));
        config.Paytable.PayLines.Add(line1);

        var line2 = new PayLine(1, new List<int> { 1 });
        line2.Rules.Add(new PayLineRule(new List<string> { "a" }, 2m));
        config.Paytable.PayLines.Add(line2);

        return config;
    }
}
