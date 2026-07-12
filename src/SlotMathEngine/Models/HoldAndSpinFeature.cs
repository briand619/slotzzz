namespace SlotMathEngine.Models;

/// <summary>
/// A weighted entry in the hold-and-spin coin value table. Value is a multiplier
/// on the total stake (Paytable.TotalWager). Label is descriptive only — use it
/// for fixed jackpot tiers carried on coins (e.g. "mini", "minor").
/// </summary>
public class CoinValue
{
    public decimal Value { get; set; }
    public decimal Weight { get; set; }
    public string? Label { get; set; }

    public CoinValue(decimal value, decimal weight, string? label = null)
    {
        Value = value;
        Weight = weight;
        Label = label;
    }
}

/// <summary>
/// Lightning Link–style hold-and-spin bonus. When at least TriggerCount coin
/// symbols land anywhere on the base-game grid, the coins lock and the feature
/// starts with RespinCount respins: every unlocked cell independently lands a
/// new coin with probability CoinProbability per respin; any hit locks the new
/// coins and resets the respin counter, a miss decrements it. The feature ends
/// when the counter reaches zero or the grid is full. The award is the sum of
/// all locked coins' values (each drawn from CoinValues), plus
/// GrandMultiplier × total stake for a full grid. Respins cost nothing.
/// </summary>
public class HoldAndSpinFeature
{
    public string CoinSymbolId { get; set; }
    public int TriggerCount { get; set; }
    public int RespinCount { get; set; } = 3;
    public decimal CoinProbability { get; set; }
    public List<CoinValue> CoinValues { get; set; } = new();
    public decimal GrandMultiplier { get; set; }

    public HoldAndSpinFeature(string coinSymbolId, int triggerCount, decimal coinProbability)
    {
        CoinSymbolId = coinSymbolId;
        TriggerCount = triggerCount;
        CoinProbability = coinProbability;
    }
}
