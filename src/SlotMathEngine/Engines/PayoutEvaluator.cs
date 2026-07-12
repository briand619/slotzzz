namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

/// <summary>
/// Single source of truth for what a given grid outcome pays. Both the exact
/// theoretical analysis and the Monte Carlo simulation evaluate outcomes through
/// this class, so the two can never disagree about the game rules.
/// The grid is indexed as grid[reel][row].
///
/// Payout semantics:
/// - Per payline, only the highest-paying matching rule pays (the real-slot
///   convention; essential once wilds let several rules match at once).
///   Wins from different paylines add up.
/// - Wild symbols substitute for any non-scatter symbol in rule matching.
/// - Scatter rules pay Multiplier × the total stake when their symbol appears
///   exactly Count times anywhere on the grid; they add on top of line wins.
///   Wilds never substitute for scatters.
/// Construct once per analysis/simulation: the wild and scatter lookups are
/// precomputed for the hot evaluation loop.
/// </summary>
public sealed class PayoutEvaluator
{
    private readonly SlotConfiguration _config;
    private readonly HashSet<string> _wildIds;
    private readonly HashSet<string> _scatterIds;

    public PayoutEvaluator(SlotConfiguration config)
    {
        _config = config;
        _wildIds = config.Symbols.Where(s => s.IsWild).Select(s => s.Id).ToHashSet();
        _scatterIds = config.Symbols.Where(s => s.IsScatter).Select(s => s.Id).ToHashSet();
    }

    public decimal EvaluatePayout(string[][] grid)
    {
        decimal totalPayout = 0;

        foreach (var payLine in _config.Paytable.PayLines)
        {
            decimal bestMultiplier = 0;
            foreach (var rule in payLine.Rules)
            {
                if (rule.Multiplier > bestMultiplier && RuleMatches(payLine, rule, grid))
                    bestMultiplier = rule.Multiplier;
            }
            foreach (var rule in payLine.KindRules)
            {
                if (rule.Multiplier > bestMultiplier && KindRuleMatches(payLine, rule, grid))
                    bestMultiplier = rule.Multiplier;
            }
            totalPayout += _config.Paytable.BaseWager * bestMultiplier;
        }

        foreach (var scatterRule in _config.Paytable.ScatterRules)
        {
            if (CountOnGrid(scatterRule.SymbolId, grid) == scatterRule.Count)
                totalPayout += _config.Paytable.TotalWager * scatterRule.Multiplier;
        }

        return totalPayout;
    }

    public bool RuleMatches(PayLine payLine, PayLineRule rule, string[][] grid)
    {
        if (rule.SymbolIds.Count != payLine.ReelPositions.Count)
            return false;

        for (int i = 0; i < rule.SymbolIds.Count; i++)
        {
            int reelIndex = payLine.ReelPositions[i];
            if (reelIndex < 0 || reelIndex >= grid.Length)
                return false;

            int rowIndex = payLine.RowAt(i);
            if (rowIndex < 0 || rowIndex >= grid[reelIndex].Length)
                return false;

            if (!SymbolMatches(grid[reelIndex][rowIndex], rule.SymbolIds[i]))
                return false;
        }

        return true;
    }

    public bool KindRuleMatches(PayLine payLine, NOfAKindRule rule, string[][] grid)
    {
        if (rule.Count < 1 || rule.Count > payLine.ReelPositions.Count)
            return false;

        for (int i = 0; i < rule.Count; i++)
        {
            int reelIndex = payLine.ReelPositions[i];
            if (reelIndex < 0 || reelIndex >= grid.Length)
                return false;

            int rowIndex = payLine.RowAt(i);
            if (rowIndex < 0 || rowIndex >= grid[reelIndex].Length)
                return false;

            if (!SymbolMatches(grid[reelIndex][rowIndex], rule.SymbolId))
                return false;
        }

        return true;
    }

    private bool SymbolMatches(string gridSymbol, string requiredSymbol)
    {
        if (gridSymbol == requiredSymbol)
            return true;

        // A wild on the grid substitutes for anything except scatters.
        return _wildIds.Contains(gridSymbol) && !_scatterIds.Contains(requiredSymbol);
    }

    public static int CountOnGrid(string symbolId, string[][] grid)
    {
        int count = 0;
        foreach (var reel in grid)
            foreach (var cell in reel)
                if (cell == symbolId)
                    count++;
        return count;
    }
}
