namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

/// <summary>
/// Exact analysis of the hold-and-spin feature. The feature is an absorbing
/// Markov chain over (locked coins, respins remaining): each respin the
/// unlocked cells land coins as a binomial draw; a hit resets the counter, a
/// miss decrements it. Because locked coins only grow and the counter only
/// falls between hits, the chain is acyclic and solved by a single
/// dynamic-programming pass, giving the exact distribution of the final coin
/// count. Award moments then follow from the compound distribution of iid coin
/// values plus the full-grid grand award.
/// </summary>
public static class HoldAndSpinAnalyzer
{
    /// <summary>
    /// P(final locked count = n) for n in 0..gridCells, starting from
    /// initialCoins locked and the respin counter full.
    /// </summary>
    public static decimal[] FinalCountDistribution(int gridCells, int initialCoins, int respins, decimal coinProbability)
    {
        var result = new decimal[gridCells + 1];
        if (initialCoins >= gridCells)
        {
            result[gridCells] = 1;
            return result;
        }

        // stateProbability[f, r]: probability of being at f locked coins with r
        // respins left. Transitions go to (f, r-1) or (f+j, respins), so
        // processing f ascending, r descending visits every state after all its
        // inflows.
        var stateProbability = new decimal[gridCells + 1, respins + 1];
        stateProbability[initialCoins, respins] = 1;

        for (int f = initialCoins; f < gridCells; f++)
        {
            for (int r = respins; r >= 1; r--)
            {
                decimal probability = stateProbability[f, r];
                if (probability == 0)
                    continue;

                int unlocked = gridCells - f;
                for (int j = 0; j <= unlocked; j++)
                {
                    decimal pj = probability * BinomialProbability(unlocked, j, coinProbability);
                    if (pj == 0)
                        continue;

                    if (j == 0)
                    {
                        if (r == 1)
                            result[f] += pj;
                        else
                            stateProbability[f, r - 1] += pj;
                    }
                    else if (f + j == gridCells)
                    {
                        result[gridCells] += pj;
                    }
                    else
                    {
                        stateProbability[f + j, respins] += pj;
                    }
                }
            }
        }

        return result;
    }

    /// <summary>
    /// Exact mean and second moment of the feature award (in stake units) given
    /// the number of coins that triggered it. The award is a compound sum of
    /// iid coin values over the random final count, plus the grand for a full
    /// grid: E[(S+G)²|n] = n·E[V²] + n(n−1)·E[V]² + 2·G·n·E[V] + G².
    /// </summary>
    public static (decimal Mean, decimal SecondMoment) AwardMoments(SlotConfiguration config, int initialCoins)
    {
        var feature = config.HoldAndSpin!;
        int gridCells = config.NumReels * config.NumRows;
        decimal stake = config.Paytable.TotalWager;

        var distribution = FinalCountDistribution(
            gridCells, initialCoins, feature.RespinCount, feature.CoinProbability);

        decimal totalWeight = feature.CoinValues.Sum(v => v.Weight);
        decimal valueMean = feature.CoinValues.Sum(v => v.Weight * v.Value) / totalWeight * stake;
        decimal valueSecond = feature.CoinValues.Sum(v => v.Weight * v.Value * v.Value) / totalWeight * stake * stake;
        decimal grand = feature.GrandMultiplier * stake;

        decimal mean = 0;
        decimal second = 0;

        for (int n = initialCoins; n <= gridCells; n++)
        {
            decimal pn = distribution[n];
            if (pn == 0)
                continue;

            decimal g = n == gridCells ? grand : 0;
            mean += pn * (n * valueMean + g);
            second += pn * (n * valueSecond + n * (n - 1) * valueMean * valueMean
                            + 2 * g * n * valueMean + g * g);
        }

        return (mean, second);
    }

    private static decimal BinomialProbability(int n, int k, decimal p)
    {
        decimal combinations = 1;
        for (int i = 0; i < k; i++)
            combinations = combinations * (n - i) / (i + 1);

        decimal probability = combinations;
        for (int i = 0; i < k; i++)
            probability *= p;
        for (int i = 0; i < n - k; i++)
            probability *= 1 - p;

        return probability;
    }
}
