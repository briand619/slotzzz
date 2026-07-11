namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

public record TheoreticalMetrics(decimal ExpectedValue, decimal Variance, decimal HitFrequency);

/// <summary>
/// Computes exact theoretical metrics by enumerating every possible outcome of the
/// reels referenced by the paytable and evaluating each through PayoutEvaluator.
/// This makes expected value, variance, and hit frequency exact — including
/// correlation between paylines that share reels, duplicate reel positions, and
/// rules that pay simultaneously — and guarantees consistency with SimulationEngine.
/// Each reel's own symbol distribution (per-reel strips, or the shared catalog
/// weights) comes from SlotConfiguration.GetReelDistributions.
/// </summary>
public static class TheoreticalAnalyzer
{
    // The product of distinct-symbol counts across referenced reels is enumerated;
    // beyond this the exact computation is too expensive and callers should rely
    // on simulation.
    public const long MaxOutcomes = 10_000_000;

    public static TheoreticalMetrics Compute(SlotConfiguration config)
    {
        config.EnsureValid();

        var referencedReels = config.Paytable.PayLines
            .SelectMany(pl => pl.ReelPositions)
            .Distinct()
            .ToArray();

        var distributions = config.GetReelDistributions();

        double outcomeCount = 1;
        foreach (var reel in referencedReels)
            outcomeCount *= distributions[reel].Count;
        if (outcomeCount > MaxOutcomes)
            throw new ArgumentException(
                $"Configuration has more than {MaxOutcomes} possible outcomes " +
                "across the reels referenced by the paytable. Use simulation instead.");

        var reelSymbols = new string[config.NumReels];

        decimal expectedValue = 0;
        decimal expectedSquare = 0;
        decimal hitProbability = 0;

        int reelCount = referencedReels.Length;
        var symbolIndex = new int[reelCount];

        while (true)
        {
            decimal probability = 1;
            for (int k = 0; k < reelCount; k++)
            {
                var entry = distributions[referencedReels[k]][symbolIndex[k]];
                reelSymbols[referencedReels[k]] = entry.SymbolId;
                probability *= entry.Probability;
            }

            decimal payout = PayoutEvaluator.EvaluatePayout(config, reelSymbols);
            expectedValue += probability * payout;
            expectedSquare += probability * payout * payout;
            if (payout > 0)
                hitProbability += probability;

            int pos = reelCount - 1;
            while (pos >= 0 && ++symbolIndex[pos] == distributions[referencedReels[pos]].Count)
            {
                symbolIndex[pos] = 0;
                pos--;
            }
            if (pos < 0)
                break;
        }

        decimal variance = expectedSquare - expectedValue * expectedValue;
        return new TheoreticalMetrics(expectedValue, variance, hitProbability);
    }
}
