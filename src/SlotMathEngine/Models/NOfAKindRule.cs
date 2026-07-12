namespace SlotMathEngine.Models;

/// <summary>
/// Pays when the first Count positions of the payline (in the order the line's
/// positions are configured — left to right for a conventional line) all show
/// SymbolId, with wilds substituting as usual. Define one rule per tier
/// (e.g. 3-of-a-kind → 5x, 4 → 20x, 5 → 100x); since only a payline's
/// highest-paying rule wins, a longer run pays its higher tier automatically.
/// </summary>
public class NOfAKindRule
{
    public string SymbolId { get; set; }
    public int Count { get; set; }
    public decimal Multiplier { get; set; }

    public NOfAKindRule(string symbolId, int count, decimal multiplier)
    {
        SymbolId = symbolId;
        Count = count;
        Multiplier = multiplier;
    }
}
