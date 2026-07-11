namespace SlotMathEngine.Models;

/// <summary>
/// The weighted symbol strip for a single reel. The same symbol may appear on
/// multiple stops; its probability on the reel is the sum of its stop weights
/// divided by the strip's total weight.
/// </summary>
public class ReelStrip
{
    public List<ReelStop> Stops { get; set; }

    public ReelStrip()
    {
        Stops = new List<ReelStop>();
    }

    public ReelStrip(IEnumerable<ReelStop> stops)
    {
        Stops = stops.ToList();
    }
}

public class ReelStop
{
    public string SymbolId { get; set; }
    public decimal Weight { get; set; }

    public ReelStop(string symbolId, decimal weight)
    {
        SymbolId = symbolId;
        Weight = weight;
    }
}
