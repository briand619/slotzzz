namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

public class VolatilityCalculator
{
    public decimal CalculateVariance(SlotConfiguration config)
    {
        if (!config.Validate())
            throw new ArgumentException("Invalid slot configuration");

        decimal expectedValue = GetExpectedValue(config);
        decimal variance = 0;

        foreach (var payLine in config.Paytable.PayLines)
        {
            variance += CalculatePayLineVariance(config, payLine, expectedValue);
        }

        return variance;
    }

    public decimal CalculateVolatility(SlotConfiguration config)
    {
        decimal variance = CalculateVariance(config);
        return (decimal)Math.Sqrt((double)variance);
    }

    public decimal CalculateVolatilityIndex(SlotConfiguration config)
    {
        decimal expectedValue = GetExpectedValue(config);
        if (expectedValue == 0) return 0;

        decimal volatility = CalculateVolatility(config);
        return volatility / expectedValue;
    }

    private decimal CalculatePayLineVariance(SlotConfiguration config, PayLine payLine, decimal expectedValue)
    {
        decimal variance = 0;

        foreach (var rule in payLine.Rules)
        {
            decimal probability = CalculateCombinationProbability(config, payLine, rule.SymbolIds);
            decimal payout = config.Paytable.BaseWager * rule.Multiplier;
            decimal deviation = payout - expectedValue;

            variance += probability * (deviation * deviation);
        }

        decimal missProbability = 1 - GetPayLineProbability(config, payLine);
        variance += missProbability * ((-expectedValue) * (-expectedValue));

        return variance;
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

    private decimal GetPayLineProbability(SlotConfiguration config, PayLine payLine)
    {
        decimal hitProbability = 0;

        foreach (var rule in payLine.Rules)
        {
            decimal probability = CalculateCombinationProbability(config, payLine, rule.SymbolIds);
            hitProbability += probability;
        }

        return hitProbability;
    }

    private decimal GetExpectedValue(SlotConfiguration config)
    {
        decimal totalExpectedValue = 0;

        foreach (var payLine in config.Paytable.PayLines)
        {
            foreach (var rule in payLine.Rules)
            {
                decimal probability = CalculateCombinationProbability(config, payLine, rule.SymbolIds);
                decimal payout = config.Paytable.BaseWager * rule.Multiplier;
                totalExpectedValue += probability * payout;
            }
        }

        return totalExpectedValue;
    }
}
