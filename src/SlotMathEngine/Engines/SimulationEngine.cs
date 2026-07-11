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
    public List<decimal> SpinResults { get; set; } = new();
}

public class SimulationEngine
{
    private readonly Random _random = new(Guid.NewGuid().GetHashCode());

    public SimulationResult RunSimulation(SlotConfiguration config, int numSpins = 100000)
    {
        if (!config.Validate())
            throw new ArgumentException("Invalid slot configuration");

        var result = new SimulationResult
        {
            TotalSpins = numSpins,
            SpinResults = new List<decimal>(numSpins),
            MinWin = decimal.MaxValue,
            MaxWin = 0,
            TotalWagered = 0
        };

        decimal totalWon = 0;
        int winningSpins = 0;

        for (int i = 0; i < numSpins; i++)
        {
            decimal spinWin = SimulateSpinAndEvaluate(config);
            result.SpinResults.Add(spinWin);

            totalWon += spinWin;
            result.TotalWagered += config.Paytable.BaseWager;

            if (spinWin > 0)
            {
                winningSpins++;
                if (spinWin < result.MinWin)
                    result.MinWin = spinWin;
                if (spinWin > result.MaxWin)
                    result.MaxWin = spinWin;
            }
        }

        result.TotalWon = totalWon;
        result.WinningSpins = winningSpins;
        result.AverageWin = winningSpins > 0 ? totalWon / winningSpins : 0;
        result.ActualRTP = result.TotalWagered > 0 ? result.TotalWon / result.TotalWagered : 0;

        if (result.MinWin == decimal.MaxValue)
            result.MinWin = 0;

        return result;
    }

    private decimal SimulateSpinAndEvaluate(SlotConfiguration config)
    {
        var reelResults = new List<string>();

        for (int reel = 0; reel < config.NumReels; reel++)
        {
            string symbol = SpinReel(config.Symbols);
            reelResults.Add(symbol);
        }

        decimal totalPayout = EvaluatePayLines(config, reelResults);
        return totalPayout;
    }

    private string SpinReel(List<Symbol> symbols)
    {
        decimal totalWeight = symbols.Sum(s => s.Weight);
        decimal randomValue = (decimal)_random.NextDouble() * totalWeight;

        decimal cumulativeWeight = 0;
        foreach (var symbol in symbols)
        {
            cumulativeWeight += symbol.Weight;
            if (randomValue <= cumulativeWeight)
                return symbol.Id;
        }

        return symbols.Last().Id;
    }

    private decimal EvaluatePayLines(SlotConfiguration config, List<string> reelResults)
    {
        decimal totalPayout = 0;

        foreach (var payLine in config.Paytable.PayLines)
        {
            foreach (var rule in payLine.Rules)
            {
                if (IsPayLineMatch(reelResults, payLine, rule.SymbolIds))
                {
                    totalPayout += config.Paytable.BaseWager * rule.Multiplier;
                }
            }
        }

        return totalPayout;
    }

    private bool IsPayLineMatch(List<string> reelResults, PayLine payLine, List<string> symbolIds)
    {
        if (symbolIds.Count != payLine.ReelPositions.Count)
            return false;

        for (int i = 0; i < symbolIds.Count; i++)
        {
            int reelIndex = payLine.ReelPositions[i];
            if (reelIndex >= reelResults.Count)
                return false;

            if (reelResults[reelIndex] != symbolIds[i])
                return false;
        }

        return true;
    }
}
