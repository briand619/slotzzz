namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

public class RTPCalculator
{
    public decimal CalculateRTP(SlotConfiguration config)
    {
        var metrics = TheoreticalAnalyzer.Compute(config);
        return metrics.ExpectedValue / config.Paytable.TotalWager;
    }

    public decimal CalculateExpectedValue(SlotConfiguration config)
    {
        return TheoreticalAnalyzer.Compute(config).ExpectedValue;
    }

    public decimal GetHitFrequency(SlotConfiguration config)
    {
        return TheoreticalAnalyzer.Compute(config).HitFrequency;
    }
}
