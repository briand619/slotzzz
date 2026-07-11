namespace SlotMathEngine.Models;

public class PayLine
{
    public int Id { get; set; }
    public List<int> ReelPositions { get; set; }
    public List<PayLineRule> Rules { get; set; }

    public PayLine(int id, List<int> reelPositions)
    {
        Id = id;
        ReelPositions = reelPositions;
        Rules = new List<PayLineRule>();
    }
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
