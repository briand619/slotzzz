namespace SlotMathEngine.Models;

public class Symbol
{
    public string Id { get; set; }
    public string Name { get; set; }
    public decimal Weight { get; set; }

    public Symbol(string id, string name, decimal weight)
    {
        Id = id;
        Name = name;
        Weight = weight;
    }
}
