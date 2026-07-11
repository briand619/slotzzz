namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

public class VolatilityCalculator
{
    public decimal CalculateVariance(SlotConfiguration config)
    {
        return TheoreticalAnalyzer.Compute(config).Variance;
    }

    public decimal CalculateVolatility(SlotConfiguration config)
    {
        decimal variance = CalculateVariance(config);
        return (decimal)Math.Sqrt((double)variance);
    }

    public decimal CalculateVolatilityIndex(SlotConfiguration config)
    {
        var metrics = TheoreticalAnalyzer.Compute(config);
        if (metrics.ExpectedValue == 0)
            return 0;

        decimal volatility = (decimal)Math.Sqrt((double)metrics.Variance);
        return volatility / metrics.ExpectedValue;
    }
}
