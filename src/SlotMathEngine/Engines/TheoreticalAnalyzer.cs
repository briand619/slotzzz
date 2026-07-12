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

        // Scatters and hold-and-spin coins read every cell of the grid, so with
        // either present all reels influence the payout; otherwise only reels
        // named by paylines do.
        var referencedReels = config.Paytable.ScatterRules.Count > 0 || config.HoldAndSpin != null
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

        // With hold-and-spin, the total payout of a base-game outcome that lands
        // k >= trigger coins is basePayout + FeatureAward(k), where the award is
        // random beyond the grid. Its exact conditional moments per k come from
        // the feature's Markov chain, precomputed once here.
        int gridCells = config.NumReels * config.NumRows;
        var featureMean = new decimal[gridCells + 1];
        var featureSecond = new decimal[gridCells + 1];
        if (config.HoldAndSpin != null)
        {
            for (int k = config.HoldAndSpin.TriggerCount; k <= gridCells; k++)
                (featureMean[k], featureSecond[k]) = HoldAndSpinAnalyzer.AwardMoments(config, k);
        }

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

            int coins = config.HoldAndSpin != null
                ? PayoutEvaluator.CountOnGrid(config.HoldAndSpin.CoinSymbolId, grid)
                : 0;

            if (config.HoldAndSpin != null && coins >= config.HoldAndSpin.TriggerCount)
            {
                // E[(base + F)²] = base² + 2·base·E[F|k] + E[F²|k]; the feature
                // always awards at least the triggering coins, so this is a hit.
                expectedValue += probability * (payout + featureMean[coins]);
                expectedSquare += probability *
                    (payout * payout + 2 * payout * featureMean[coins] + featureSecond[coins]);
                hitProbability += probability;
            }
            else
            {
                expectedValue += probability * payout;
                expectedSquare += probability * payout * payout;
                if (payout > 0)
                    hitProbability += probability;
            }

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
