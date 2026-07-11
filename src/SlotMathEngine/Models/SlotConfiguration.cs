namespace SlotMathEngine.Models;

public class SlotConfiguration
{
    public string Name { get; set; }
    public int NumReels { get; set; }
    public List<Symbol> Symbols { get; set; }
    public Paytable Paytable { get; set; }

    public SlotConfiguration(string name, int numReels)
    {
        Name = name;
        NumReels = numReels;
        Symbols = new List<Symbol>();
        Paytable = new Paytable();
    }

    public bool Validate()
    {
        if (NumReels <= 0) return false;
        if (Symbols.Count == 0) return false;
        if (Symbols.Any(s => s.Weight <= 0)) return false;

        var totalWeight = Symbols.Sum(s => s.Weight);
        if (totalWeight <= 0) return false;

        return true;
    }
}
