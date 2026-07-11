namespace SlotMathEngine.Models;

public class PayLine
{
    public int Id { get; set; }
    public List<int> ReelPositions { get; set; }

    /// <summary>Optional row per position (parallel to ReelPositions), letting a
    /// payline trace any path through a multi-row grid (straight lines, zigzags,
    /// diagonals). When null, every position reads row 0.</summary>
    public List<int>? RowPositions { get; set; }

    public List<PayLineRule> Rules { get; set; }

    public PayLine(int id, List<int> reelPositions)
    {
        Id = id;
        ReelPositions = reelPositions;
        Rules = new List<PayLineRule>();
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
