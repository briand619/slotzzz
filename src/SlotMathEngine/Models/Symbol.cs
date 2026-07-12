namespace SlotMathEngine.Models;

public class Symbol
{
    public string Id { get; set; }
    public string Name { get; set; }
    public decimal Weight { get; set; }

    /// <summary>Wild symbols substitute for any non-scatter symbol when matching
    /// payline rules. A rule can also require the wild itself.</summary>
    public bool IsWild { get; set; }

    /// <summary>Scatter symbols pay anywhere on the visible grid via the paytable's
    /// scatter rules, independent of paylines. Wilds never substitute for them.</summary>
    public bool IsScatter { get; set; }

    public Symbol(string id, string name, decimal weight)
    {
        Id = id;
        Name = name;
        Weight = weight;
    }
}
