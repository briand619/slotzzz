namespace SlotMathEngine.Models;

/// <summary>
/// Pays when the scatter symbol appears exactly Count times anywhere on the
/// visible grid, regardless of paylines. The payout is Multiplier × the total
/// stake per spin (Paytable.TotalWager), the common real-slot convention.
/// Define one rule per count tier (e.g. 3 → 5x, 4 → 20x, 5 → 100x).
/// </summary>
public class ScatterRule
{
    public string SymbolId { get; set; }
    public int Count { get; set; }
    public decimal Multiplier { get; set; }

    public ScatterRule(string symbolId, int count, decimal multiplier)
    {
        SymbolId = symbolId;
        Count = count;
        Multiplier = multiplier;
    }
}
