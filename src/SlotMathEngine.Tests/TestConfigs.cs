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
    /// A richer config exercising wilds and scatters together: shared weights
    /// a:3, b:2, wild:1, scatter:1 over 3 reels, one payline with wild-capable
    /// rules, and two scatter tiers.
    /// </summary>
    public static SlotConfiguration CreateWildScatterConfig()
    {
        var config = new SlotConfiguration("Wild Scatter Slot", 3);
        config.Symbols.Add(new Symbol("a", "Symbol A", 3m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 2m));
        config.Symbols.Add(new Symbol("w", "Wild", 1m) { IsWild = true });
        config.Symbols.Add(new Symbol("s", "Scatter", 1m) { IsScatter = true });

        var line = new PayLine(0, new List<int> { 0, 1, 2 });
        line.Rules.Add(new PayLineRule(new List<string> { "a", "a", "a" }, 5m));
        line.Rules.Add(new PayLineRule(new List<string> { "b", "b", "b" }, 10m));
        line.Rules.Add(new PayLineRule(new List<string> { "w", "w", "w" }, 20m));
        config.Paytable.PayLines.Add(line);

        config.Paytable.ScatterRules.Add(new ScatterRule("s", 2, 2m));
        config.Paytable.ScatterRules.Add(new ScatterRule("s", 3, 10m));

        return config;
    }

    /// <summary>
    /// A hold-and-spin game: 3 reels, coin symbol (scatter), trigger at 2 coins,
    /// 2 respins at p=0.2 per cell, mixed coin values including a labeled "mini"
    /// jackpot, and a 25x grand for a full grid.
    /// </summary>
    public static SlotConfiguration CreateHoldAndSpinConfig()
    {
        var config = new SlotConfiguration("Hold And Spin Slot", 3);
        config.Symbols.Add(new Symbol("a", "Symbol A", 3m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 2m));
        config.Symbols.Add(new Symbol("coin", "Coin", 1m) { IsScatter = true });

        var line = new PayLine(0, new List<int> { 0, 1, 2 });
        line.Rules.Add(new PayLineRule(new List<string> { "a", "a", "a" }, 5m));
        line.Rules.Add(new PayLineRule(new List<string> { "b", "b", "b" }, 10m));
        config.Paytable.PayLines.Add(line);

        config.HoldAndSpin = new HoldAndSpinFeature("coin", 2, 0.2m)
        {
            RespinCount = 2,
            GrandMultiplier = 25m,
            CoinValues =
            {
                new CoinValue(1m, 4m),
                new CoinValue(5m, 1m),
                new CoinValue(10m, 0.2m, "mini")
            }
        };

        return config;
    }

    /// <summary>
    /// A five-reel game paying left-to-right N-of-a-kind with a wild:
    /// shared weights a:4, b:3, wild:1, one payline across all five reels,
    /// tiers for 3/4/5 of a kind.
    /// </summary>
    public static SlotConfiguration CreateFiveReelKindConfig()
    {
        var config = new SlotConfiguration("Five Reel Kind Slot", 5);
        config.Symbols.Add(new Symbol("a", "Symbol A", 4m));
        config.Symbols.Add(new Symbol("b", "Symbol B", 3m));
        config.Symbols.Add(new Symbol("w", "Wild", 1m) { IsWild = true });

        var line = new PayLine(0, new List<int> { 0, 1, 2, 3, 4 });
        line.KindRules.Add(new NOfAKindRule("a", 3, 2m));
        line.KindRules.Add(new NOfAKindRule("a", 4, 5m));
        line.KindRules.Add(new NOfAKindRule("a", 5, 15m));
        line.KindRules.Add(new NOfAKindRule("b", 3, 4m));
        line.KindRules.Add(new NOfAKindRule("b", 4, 10m));
        line.KindRules.Add(new NOfAKindRule("b", 5, 30m));
        config.Paytable.PayLines.Add(line);

        return config;
    }

    /// <summary>
    /// A 3×3 grid: three reels with 8-stop ordered strips, three paylines
    /// (top row, middle row, and a down diagonal), triple-match rules.
    /// </summary>
    public static SlotConfiguration Create3x3GridConfig()
    {
        var config = new SlotConfiguration("3x3 Grid Slot", 3) { NumRows = 3 };
        config.Symbols.Add(new Symbol("cherry", "Cherry", 1m));
        config.Symbols.Add(new Symbol("bar", "Bar", 1m));
        config.Symbols.Add(new Symbol("bell", "Bell", 1m));
        config.Symbols.Add(new Symbol("seven", "Seven", 1m));

        static ReelStrip Strip(params string[] ids) =>
            new(ids.Select(id => new ReelStop(id, 1m)));

        config.Reels = new List<ReelStrip>
        {
            Strip("cherry", "bar", "cherry", "bell", "cherry", "bar", "seven", "bell"),
            Strip("bar", "cherry", "bell", "cherry", "seven", "bar", "cherry", "bell"),
            Strip("cherry", "bell", "bar", "cherry", "bar", "cherry", "bell", "seven")
        };

        static PayLine Line(int id, List<int> rows)
        {
            var line = new PayLine(id, new List<int> { 0, 1, 2 }) { RowPositions = rows };
            line.Rules.Add(new PayLineRule(new List<string> { "seven", "seven", "seven" }, 60m));
            line.Rules.Add(new PayLineRule(new List<string> { "bell", "bell", "bell" }, 30m));
            line.Rules.Add(new PayLineRule(new List<string> { "bar", "bar", "bar" }, 8m));
            line.Rules.Add(new PayLineRule(new List<string> { "cherry", "cherry", "cherry" }, 4m));
            return line;
        }

        config.Paytable.PayLines.Add(Line(0, new List<int> { 0, 0, 0 }));
        config.Paytable.PayLines.Add(Line(1, new List<int> { 1, 1, 1 }));
        config.Paytable.PayLines.Add(Line(2, new List<int> { 0, 1, 2 }));

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
