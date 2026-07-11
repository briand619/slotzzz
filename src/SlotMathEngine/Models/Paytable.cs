namespace SlotMathEngine.Models;

public enum WagerMode
{
    /// <summary>BaseWager is the total stake per spin, regardless of how many
    /// paylines are active. Rule multipliers apply to the full stake, so designers
    /// must scale multipliers down themselves as they add lines.</summary>
    TotalBet,

    /// <summary>BaseWager is the bet per payline — the common real-slot convention.
    /// The total stake per spin is BaseWager × number of paylines, and each line win
    /// pays its multiplier on the line bet, so adding a line adds both its cost and
    /// its wins without distorting RTP.</summary>
    BetPerLine
}

public class Paytable
{
    public List<PayLine> PayLines { get; set; }
    public decimal BaseWager { get; set; }
    public WagerMode WagerMode { get; set; } = WagerMode.TotalBet;

    /// <summary>The total stake per spin under the configured wager mode.
    /// RTP is always payouts relative to this amount.</summary>
    public decimal TotalWager =>
        WagerMode == WagerMode.BetPerLine ? BaseWager * PayLines.Count : BaseWager;

    public Paytable(decimal baseWager = 1.0m)
    {
        BaseWager = baseWager;
        PayLines = new List<PayLine>();
    }
}
