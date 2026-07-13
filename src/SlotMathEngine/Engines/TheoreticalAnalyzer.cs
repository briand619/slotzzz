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
///
/// Bonus features (hold-and-spin, free spins) are folded in through their exact
/// conditional award moments: for a base outcome that triggers features, the
/// total payout is base + feature awards, and since the awards are independent
/// of each other and of the grid beyond their trigger, E[X] and E[X²] follow
/// from the per-feature (mean, second moment) pairs. A spin counts as a hit when
/// its base payout is positive or it triggers a bonus.
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

        var strips = config.GetEffectiveStrips();
        var referencedReels = GetReferencedReels(config);
        EnsureEnumerable(strips, referencedReels);

        var evaluator = new PayoutEvaluator(config);

        // Hold-and-spin: exact conditional award moments per triggering coin
        // count, from the feature's Markov chain.
        int gridCells = config.NumReels * config.NumRows;
        var holdMean = new decimal[gridCells + 1];
        var holdSecond = new decimal[gridCells + 1];
        if (config.HoldAndSpin != null)
        {
            for (int k = config.HoldAndSpin.TriggerCount; k <= gridCells; k++)
                (holdMean[k], holdSecond[k]) = HoldAndSpinAnalyzer.AwardMoments(config, k);
        }

        // Free spins: exact award moments per triggering event, from the
        // feature's branching-process closed forms.
        decimal freeSpinsMean = 0;
        decimal freeSpinsSecond = 0;
        if (config.FreeSpins != null)
            (freeSpinsMean, freeSpinsSecond) = FreeSpinsAnalyzer.FeatureMoments(config);

        decimal expectedValue = 0;
        decimal expectedSquare = 0;
        decimal hitProbability = 0;

        EnumerateOutcomes(config, strips, referencedReels, (probability, grid) =>
        {
            decimal payout = evaluator.EvaluatePayout(grid);

            decimal holdM = 0, holdS = 0;
            bool holdTriggered = false;
            if (config.HoldAndSpin != null)
            {
                int coins = PayoutEvaluator.CountOnGrid(config.HoldAndSpin.CoinSymbolId, grid);
                if (coins >= config.HoldAndSpin.TriggerCount)
                {
                    holdTriggered = true;
                    (holdM, holdS) = (holdMean[coins], holdSecond[coins]);
                }
            }

            decimal freeM = 0, freeS = 0;
            bool freeTriggered = config.FreeSpins != null
                && PayoutEvaluator.CountOnGrid(config.FreeSpins.TriggerSymbolId, grid) >= config.FreeSpins.TriggerCount;
            if (freeTriggered)
                (freeM, freeS) = (freeSpinsMean, freeSpinsSecond);

            // X = base + H + F with H, F independent of each other and of the
            // grid given their triggers:
            // E[X²] = b² + 2b(Hm+Fm) + E[H²] + E[F²] + 2·Hm·Fm.
            expectedValue += probability * (payout + holdM + freeM);
            expectedSquare += probability *
                (payout * payout + 2 * payout * (holdM + freeM) + holdS + freeS + 2 * holdM * freeM);

            if (payout > 0 || holdTriggered || freeTriggered)
                hitProbability += probability;
        });

        decimal variance = expectedSquare - expectedValue * expectedValue;
        return new TheoreticalMetrics(expectedValue, variance, hitProbability);
    }

    /// <summary>Reels whose outcome can influence the payout: all of them when
    /// anything counts symbols grid-wide (scatter rules, hold-and-spin coins,
    /// free-spin triggers), otherwise just the reels named by paylines.</summary>
    internal static int[] GetReferencedReels(SlotConfiguration config)
    {
        bool wholeGrid = config.Paytable.ScatterRules.Count > 0
            || config.HoldAndSpin != null
            || config.FreeSpins != null;

        return wholeGrid
            ? Enumerable.Range(0, config.NumReels).ToArray()
            : config.Paytable.PayLines
                .SelectMany(pl => pl.ReelPositions)
                .Distinct()
                .ToArray();
    }

    internal static void EnsureEnumerable(IReadOnlyList<IReadOnlyList<ReelStop>> strips, int[] referencedReels)
    {
        double outcomeCount = 1;
        foreach (var reel in referencedReels)
            outcomeCount *= strips[reel].Count;
        if (outcomeCount > MaxOutcomes)
            throw new ArgumentException(
                $"Configuration has more than {MaxOutcomes} possible outcomes " +
                "across the reels referenced by the paytable. Use simulation instead.");
    }

    /// <summary>Enumerates every stop combination of the referenced reels,
    /// invoking the visitor with the outcome's probability and its visible grid.
    /// The grid array is reused between invocations.</summary>
    internal static void EnumerateOutcomes(
        SlotConfiguration config,
        IReadOnlyList<IReadOnlyList<ReelStop>> strips,
        int[] referencedReels,
        Action<decimal, string[][]> visit)
    {
        var totalWeights = strips.Select(strip => strip.Sum(st => st.Weight)).ToArray();

        var grid = new string[config.NumReels][];
        for (int reel = 0; reel < config.NumReels; reel++)
            grid[reel] = new string[config.NumRows];

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

            visit(probability, grid);

            int pos = reelCount - 1;
            while (pos >= 0 && ++stopIndex[pos] == strips[referencedReels[pos]].Count)
            {
                stopIndex[pos] = 0;
                pos--;
            }
            if (pos < 0)
                break;
        }
    }
}
