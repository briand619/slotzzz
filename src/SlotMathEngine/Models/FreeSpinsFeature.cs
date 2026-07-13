namespace SlotMathEngine.Models;

/// <summary>
/// A free-spins bonus. When at least TriggerCount trigger symbols (a
/// scatter-marked symbol) land anywhere on the base-game grid, the player
/// receives SpinsAwarded free spins on the same reels and paytable, with every
/// win multiplied by WinMultiplier. Free spins cost nothing. When
/// AllowRetrigger is set, landing the trigger again during a free spin awards
/// SpinsAwarded additional spins. The hold-and-spin feature does not trigger
/// during free spins.
/// </summary>
public class FreeSpinsFeature
{
    public string TriggerSymbolId { get; set; }
    public int TriggerCount { get; set; }
    public int SpinsAwarded { get; set; }
    public decimal WinMultiplier { get; set; } = 1m;
    public bool AllowRetrigger { get; set; } = true;

    public FreeSpinsFeature(string triggerSymbolId, int triggerCount, int spinsAwarded)
    {
        TriggerSymbolId = triggerSymbolId;
        TriggerCount = triggerCount;
        SpinsAwarded = spinsAwarded;
    }
}
