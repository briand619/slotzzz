namespace SlotMathEngine.Models;

public class PayLine
{
    public int Id { get; set; }
    public List<int> ReelPositions { get; set; }

    /// <summary>Optional row per position (parallel to ReelPositions), letting a
    /// payline trace any path through a multi-row grid (straight lines, zigzags,
    /// diagonals). When null, every position reads row 0.</summary>
    public List<int>? RowPositions { get; set; }

    /// <summary>Exact-position rules: every position of the line must show the
    /// listed symbol (wilds substitute).</summary>
    public List<PayLineRule> Rules { get; set; }

    /// <summary>Left-to-right N-of-a-kind rules: the first Count positions of
    /// the line must show the symbol (wilds substitute). A line may combine
    /// these with exact-position rules; the highest-paying match wins.</summary>
    public List<NOfAKindRule> KindRules { get; set; }

    public PayLine(int id, List<int> reelPositions)
    {
        Id = id;
        ReelPositions = reelPositions;
        Rules = new List<PayLineRule>();
        KindRules = new List<NOfAKindRule>();
    }

    public int RowAt(int positionIndex) =>
        RowPositions == null ? 0 : RowPositions[positionIndex];
}

public class PayLineRule
{
    public List<string> SymbolIds { get; set; }
    public decimal Multiplier { get; set; }

    public PayLineRule(List<string> symbolIds, decimal multiplier)
    {
        SymbolIds = symbolIds;
        Multiplier = multiplier;
    }
}
