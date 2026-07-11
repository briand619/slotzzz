namespace SlotMathEngine.Engines;

using SlotMathEngine.Models;

public class SimulationResult
{
    public decimal TotalWagered { get; set; }
    public decimal TotalWon { get; set; }
    public decimal AverageWin { get; set; }
    public decimal MinWin { get; set; }
    public decimal MaxWin { get; set; }
    public int TotalSpins { get; set; }
    public int WinningSpins { get; set; }
    public decimal ActualRTP { get; set; }
    public decimal ActualVariance { get; set; }
}

public class SimulationEngine
{
    private readonly Random _random = new();

    public SimulationResult RunSimulation(SlotConfiguration config, int numSpins = 100000)
    {
        config.EnsureValid();

        if (numSpins < 1)
            throw new ArgumentException("Number of spins must be at least 1", nameof(numSpins));

        var distributions = config.GetReelDistributions();

        // Per-reel cumulative probability tables for weighted drawing.
        var symbolTables = new string[config.NumReels][];
        var cumulativeTables = new decimal[config.NumReels][];
        for (int reel = 0; reel < config.NumReels; reel++)
        {
            var distribution = distributions[reel];
            symbolTables[reel] = new string[distribution.Count];
            cumulativeTables[reel] = new decimal[distribution.Count];
            decimal cumulative = 0;
            for (int i = 0; i < distribution.Count; i++)
            {
                symbolTables[reel][i] = distribution[i].SymbolId;
                cumulative += distribution[i].Probability;
                cumulativeTables[reel][i] = cumulative;
            }
        }

        var reelSymbols = new string[config.NumReels];

        decimal totalWon = 0;
        decimal sumOfSquares = 0;
        int winningSpins = 0;
        decimal minWin = 0;
        decimal maxWin = 0;

        for (int spin = 0; spin < numSpins; spin++)
        {
            for (int reel = 0; reel < config.NumReels; reel++)
                reelSymbols[reel] = DrawSymbol(symbolTables[reel], cumulativeTables[reel]);

            decimal payout = PayoutEvaluator.EvaluatePayout(config, reelSymbols);

            totalWon += payout;
            sumOfSquares += payout * payout;

            if (payout > 0)
            {
                if (winningSpins == 0 || payout < minWin)
                    minWin = payout;
                if (payout > maxWin)
                    maxWin = payout;
                winningSpins++;
            }
        }

        decimal meanPayout = totalWon / numSpins;
        decimal totalWagered = config.Paytable.BaseWager * numSpins;

        return new SimulationResult
        {
            TotalSpins = numSpins,
            TotalWagered = totalWagered,
            TotalWon = totalWon,
            WinningSpins = winningSpins,
            AverageWin = winningSpins > 0 ? totalWon / winningSpins : 0,
            MinWin = minWin,
            MaxWin = maxWin,
            ActualRTP = totalWon / totalWagered,
            ActualVariance = sumOfSquares / numSpins - meanPayout * meanPayout
        };
    }

    private string DrawSymbol(string[] symbols, decimal[] cumulativeProbabilities)
    {
        decimal randomValue = (decimal)_random.NextDouble();

        for (int i = 0; i < cumulativeProbabilities.Length; i++)
        {
            if (randomValue <= cumulativeProbabilities[i])
                return symbols[i];
        }

        return symbols[^1];
    }
}
