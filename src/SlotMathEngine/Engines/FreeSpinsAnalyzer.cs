namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

/// <summary>
/// Exact analysis of the free-spins feature. With retriggers, the feature is a
/// branching (Galton–Watson) process: each free spin pays P (the multiplied
/// paytable win) and spawns K more spins, where K = SpinsAwarded when the spin
/// retriggers and 0 otherwise. Let T be the total award of one spin's subtree:
///
///   T = P + T₁ + … + T_K   (Tᵢ iid copies of T, independent of this spin)
///
/// giving the closed forms
///
///   E[T]  = E[P] / (1 − E[K])
///   E[T²] = (E[P²] + 2·E[P·K]·E[T] + E[K(K−1)]·E[T]²) / (1 − E[K])
///
/// where E[K] = F·q, E[P·K] = F·E[P·1(retrigger)], E[K(K−1)] = F(F−1)·q, with
/// q the per-spin retrigger probability and F = SpinsAwarded. All per-spin
/// quantities come from exact grid enumeration. The feature award for one
/// base-game trigger is the sum of F iid subtrees. The process is finite in
/// expectation only when F·q &lt; 1; otherwise Compute throws.
/// </summary>
public static class FreeSpinsAnalyzer
{
    /// <summary>Exact mean and second moment of the total free-spins award (in
    /// stake units) for a single triggering event.</summary>
    public static (decimal Mean, decimal SecondMoment) FeatureMoments(SlotConfiguration config)
    {
        var feature = config.FreeSpins!;
        var strips = config.GetEffectiveStrips();
        var allReels = Enumerable.Range(0, config.NumReels).ToArray();
        TheoreticalAnalyzer.EnsureEnumerable(strips, allReels);

        var evaluator = new PayoutEvaluator(config);

        // Per-free-spin statistics from exact enumeration: the multiplied payout
        // P and the retrigger indicator live on the same spin, so their joint
        // moment E[P·1(retrigger)] is exact as well.
        decimal payoutMean = 0;
        decimal payoutSecond = 0;
        decimal retriggerProbability = 0;
        decimal payoutOnRetriggerMean = 0;

        TheoreticalAnalyzer.EnumerateOutcomes(config, strips, allReels, (probability, grid) =>
        {
            decimal payout = feature.WinMultiplier * evaluator.EvaluatePayout(grid);
            payoutMean += probability * payout;
            payoutSecond += probability * payout * payout;

            if (feature.AllowRetrigger
                && PayoutEvaluator.CountOnGrid(feature.TriggerSymbolId, grid) >= feature.TriggerCount)
            {
                retriggerProbability += probability;
                payoutOnRetriggerMean += probability * payout;
            }
        });

        int spins = feature.SpinsAwarded;

        decimal subtreeMean;
        decimal subtreeSecond;
        if (!feature.AllowRetrigger)
        {
            subtreeMean = payoutMean;
            subtreeSecond = payoutSecond;
        }
        else
        {
            decimal expectedOffspring = spins * retriggerProbability;
            if (expectedOffspring >= 1)
                throw new ArgumentException(
                    $"Free spins diverge: each free spin retriggers {spins} more with probability " +
                    $"{retriggerProbability:0.####}, so the expected spin count is infinite. " +
                    "Lower the trigger frequency or the spins awarded, or disable retriggers.");

            subtreeMean = payoutMean / (1 - expectedOffspring);
            subtreeSecond = (payoutSecond
                             + 2 * spins * payoutOnRetriggerMean * subtreeMean
                             + spins * (spins - 1) * retriggerProbability * subtreeMean * subtreeMean)
                            / (1 - expectedOffspring);
        }

        // One trigger awards F iid subtrees.
        decimal mean = spins * subtreeMean;
        decimal second = spins * subtreeSecond + spins * (spins - 1) * subtreeMean * subtreeMean;
        return (mean, second);
    }
}
