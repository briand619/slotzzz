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

        var strips = config.GetEffectiveStrips();

        // Per-reel cumulative weight tables for drawing a weighted stop position.
        var cumulativeTables = new decimal[config.NumReels][];
        for (int reel = 0; reel < config.NumReels; reel++)
        {
            var strip = strips[reel];
            cumulativeTables[reel] = new decimal[strip.Count];
            decimal cumulative = 0;
            for (int i = 0; i < strip.Count; i++)
            {
                cumulative += strip[i].Weight;
                cumulativeTables[reel][i] = cumulative;
            }
        }

        var grid = new string[config.NumReels][];
        for (int reel = 0; reel < config.NumReels; reel++)
            grid[reel] = new string[config.NumRows];

        decimal totalWon = 0;
        decimal sumOfSquares = 0;
        int winningSpins = 0;
        decimal minWin = 0;
        decimal maxWin = 0;

        for (int spin = 0; spin < numSpins; spin++)
        {
            for (int reel = 0; reel < config.NumReels; reel++)
            {
                var strip = strips[reel];
                int stop = DrawStopIndex(cumulativeTables[reel]);
                for (int row = 0; row < config.NumRows; row++)
                    grid[reel][row] = strip[(stop + row) % strip.Count].SymbolId;
            }

            decimal payout = PayoutEvaluator.EvaluatePayout(config, grid);

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

    private int DrawStopIndex(decimal[] cumulativeWeights)
    {
        decimal randomValue = (decimal)_random.NextDouble() * cumulativeWeights[^1];

        for (int i = 0; i < cumulativeWeights.Length; i++)
        {
            if (randomValue <= cumulativeWeights[i])
                return i;
        }

        return cumulativeWeights.Length - 1;
    }
}
