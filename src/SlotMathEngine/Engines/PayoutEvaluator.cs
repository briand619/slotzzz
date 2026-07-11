namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

/// <summary>
/// Single source of truth for what a given reel outcome pays. Both the exact
/// theoretical analysis and the Monte Carlo simulation evaluate outcomes through
/// this class, so the two can never disagree about the game rules.
/// </summary>
public static class PayoutEvaluator
{
    public static decimal EvaluatePayout(SlotConfiguration config, IReadOnlyList<string> reelSymbols)
    {
        decimal totalPayout = 0;

        foreach (var payLine in config.Paytable.PayLines)
        {
            foreach (var rule in payLine.Rules)
            {
                if (RuleMatches(payLine, rule, reelSymbols))
                    totalPayout += config.Paytable.BaseWager * rule.Multiplier;
            }
        }

        return totalPayout;
    }

    public static bool RuleMatches(PayLine payLine, PayLineRule rule, IReadOnlyList<string> reelSymbols)
    {
        if (rule.SymbolIds.Count != payLine.ReelPositions.Count)
            return false;

        for (int i = 0; i < rule.SymbolIds.Count; i++)
        {
            int reelIndex = payLine.ReelPositions[i];
            if (reelIndex < 0 || reelIndex >= reelSymbols.Count)
                return false;

            if (reelSymbols[reelIndex] != rule.SymbolIds[i])
                return false;
        }

        return true;
    }
}
