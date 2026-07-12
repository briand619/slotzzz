namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

public record TheoreticalMetrics(decimal ExpectedValue, decimal Variance, decimal HitFrequency);

/// <summary>
/// Computes exact theoretical metrics by enumerating every possible stop position
/// of the reels referenced by the paytable, deriving each reel's visible window
/// (stop + following NumRows−1 stops, wrapping), and evaluating the resulting grid
/// through PayoutEvaluator. This makes expected value, variance, and hit frequency
/// exact — including correlation between paylines that share reels, correlation
/// between rows of the same reel, duplicate positions, and rules that pay
/// simultaneously — and guarantees consistency with SimulationEngine.
/// </summary>
public static class TheoreticalAnalyzer
{
    // The product of strip lengths across referenced reels is enumerated; beyond
    // this the exact computation is too expensive and callers should rely on
    // simulation.
    public const long MaxOutcomes = 10_000_000;

    public static TheoreticalMetrics Compute(SlotConfiguration config)
    {
        config.EnsureValid();

        // Scatters read every cell of the grid, so with scatter rules present all
        // reels influence the payout; otherwise only reels named by paylines do.
        var referencedReels = config.Paytable.ScatterRules.Count > 0
            ? Enumerable.Range(0, config.NumReels).ToArray()
            : config.Paytable.PayLines
                .SelectMany(pl => pl.ReelPositions)
                .Distinct()
                .ToArray();

        var strips = config.GetEffectiveStrips();

        double outcomeCount = 1;
        foreach (var reel in referencedReels)
            outcomeCount *= strips[reel].Count;
        if (outcomeCount > MaxOutcomes)
            throw new ArgumentException(
                $"Configuration has more than {MaxOutcomes} possible outcomes " +
                "across the reels referenced by the paytable. Use simulation instead.");

        var totalWeights = strips.Select(strip => strip.Sum(st => st.Weight)).ToArray();
        var evaluator = new PayoutEvaluator(config);

        var grid = new string[config.NumReels][];
        for (int reel = 0; reel < config.NumReels; reel++)
            grid[reel] = new string[config.NumRows];

        decimal expectedValue = 0;
        decimal expectedSquare = 0;
        decimal hitProbability = 0;

        int reelCount = referencedReels.Length;
        var stopIndex = new int[reelCount];

        while (true)
        {
            decimal probability = 1;
            for (int k = 0; k < reelCount; k++)
            {
                int reel = referencedReels[k];
                var strip = strips[reel];
                var stop = strip[stopIndex[k]];
                probability *= stop.Weight / totalWeights[reel];

                for (int row = 0; row < config.NumRows; row++)
                    grid[reel][row] = strip[(stopIndex[k] + row) % strip.Count].SymbolId;
            }

            decimal payout = evaluator.EvaluatePayout(grid);
            expectedValue += probability * payout;
            expectedSquare += probability * payout * payout;
            if (payout > 0)
                hitProbability += probability;

            int pos = reelCount - 1;
            while (pos >= 0 && ++stopIndex[pos] == strips[referencedReels[pos]].Count)
            {
                stopIndex[pos] = 0;
                pos--;
            }
            if (pos < 0)
                break;
        }

        decimal variance = expectedSquare - expectedValue * expectedValue;
        return new TheoreticalMetrics(expectedValue, variance, hitProbability);
    }
}
