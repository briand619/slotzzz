namespace SlotMathEngine.Models;

public class Paytable
{
    public List<PayLine> PayLines { get; set; }
    public decimal BaseWager { get; set; }

    public Paytable(decimal baseWager = 1.0m)
    {
        BaseWager = baseWager;
        PayLines = new List<PayLine>();
    }
}
