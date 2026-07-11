namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

/// <summary>
/// Single source of truth for what a given grid outcome pays. Both the exact
/// theoretical analysis and the Monte Carlo simulation evaluate outcomes through
/// this class, so the two can never disagree about the game rules.
/// The grid is indexed as grid[reel][row].
/// </summary>
public static class PayoutEvaluator
{
    public static decimal EvaluatePayout(SlotConfiguration config, string[][] grid)
    {
        decimal totalPayout = 0;

        foreach (var payLine in config.Paytable.PayLines)
        {
            foreach (var rule in payLine.Rules)
            {
                if (RuleMatches(payLine, rule, grid))
                    totalPayout += config.Paytable.BaseWager * rule.Multiplier;
            }
        }

        return totalPayout;
    }

    public static bool RuleMatches(PayLine payLine, PayLineRule rule, string[][] grid)
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

            if (grid[reelIndex][rowIndex] != rule.SymbolIds[i])
                return false;
        }

        return true;
    }
}
