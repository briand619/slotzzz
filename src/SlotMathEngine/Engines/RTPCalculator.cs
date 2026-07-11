namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

public class RTPCalculator
{
    public decimal CalculateRTP(SlotConfiguration config)
    {
        if (!config.Validate())
            throw new ArgumentException("Invalid slot configuration");

        decimal expectedValue = CalculateExpectedValue(config);
        decimal rtp = expectedValue / config.Paytable.BaseWager;

        return rtp;
    }

    public decimal CalculateExpectedValue(SlotConfiguration config)
    {
        decimal totalExpectedValue = 0;

        foreach (var payLine in config.Paytable.PayLines)
        {
            decimal payLineExpectation = CalculatePayLineExpectation(config, payLine);
            totalExpectedValue += payLineExpectation;
        }

        return totalExpectedValue;
    }

    private decimal CalculatePayLineExpectation(SlotConfiguration config, PayLine payLine)
    {
        decimal expectation = 0;

        foreach (var rule in payLine.Rules)
        {
            decimal probability = CalculateCombinationProbability(config, payLine, rule.SymbolIds);
            decimal payout = config.Paytable.BaseWager * rule.Multiplier;
            expectation += probability * payout;
        }

        return expectation;
    }

    private decimal CalculateCombinationProbability(SlotConfiguration config, PayLine payLine, List<string> symbolIds)
    {
        if (symbolIds.Count != payLine.ReelPositions.Count)
            return 0;

        decimal probability = 1;

        for (int i = 0; i < symbolIds.Count; i++)
        {
            var symbol = config.Symbols.FirstOrDefault(s => s.Id == symbolIds[i]);
            if (symbol == null)
                return 0;

            decimal totalWeight = config.Symbols.Sum(s => s.Weight);
            decimal symbolProbability = symbol.Weight / totalWeight;
            probability *= symbolProbability;
        }

        return probability;
    }

    public decimal GetHitFrequency(SlotConfiguration config)
    {
        if (!config.Validate())
            throw new ArgumentException("Invalid slot configuration");

        decimal hitProbability = 0;

        foreach (var payLine in config.Paytable.PayLines)
        {
            foreach (var rule in payLine.Rules)
            {
                decimal probability = CalculateCombinationProbability(config, payLine, rule.SymbolIds);
                hitProbability += probability;
            }
        }

        return Math.Min(hitProbability, 1);
    }
}
