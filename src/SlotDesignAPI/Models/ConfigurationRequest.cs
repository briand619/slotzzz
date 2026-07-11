namespace SlotDesignAPI.Models;

using SlotMathEngine.Models;

public class SymbolDto
{
    public string? Id { get; set; }
    public string? Name { get; set; }
    public decimal Weight { get; set; }
}

public class PayLineRuleDto
{
    public List<string>? SymbolIds { get; set; }
    public decimal Multiplier { get; set; }
}

public class PayLineDto
{
    public int Id { get; set; }
    public List<int>? ReelPositions { get; set; }

    /// <summary>Optional row per position (parallel to reelPositions) for
    /// multi-row grids. When omitted, every position reads row 0.</summary>
    public List<int>? RowPositions { get; set; }

    public List<PayLineRuleDto>? Rules { get; set; }
}

public class PaytableDto
{
    public List<PayLineDto>? PayLines { get; set; }

    /// <summary>The total stake per spin (wagerMode "totalBet", the default) or
    /// the bet per payline (wagerMode "betPerLine").</summary>
    public decimal BaseWager { get; set; }

    public WagerMode WagerMode { get; set; } = WagerMode.TotalBet;
}

public class ReelStopDto
{
    public string? SymbolId { get; set; }
    public decimal Weight { get; set; }
}

public class ReelStripDto
{
    public List<ReelStopDto>? Stops { get; set; }
}

public class SlotConfigurationRequest
{
    public string? Name { get; set; }
    public int NumReels { get; set; }

    /// <summary>Visible rows per reel (defaults to 1). Values above 1 require
    /// explicit per-reel strips, whose order determines the visible windows.</summary>
    public int NumRows { get; set; } = 1;

    public List<SymbolDto>? Symbols { get; set; }

    /// <summary>Optional per-reel strips (one per reel). When omitted, every reel
    /// uses the shared symbol weights from Symbols.</summary>
    public List<ReelStripDto>? Reels { get; set; }

    public PaytableDto? Paytable { get; set; }
}

public class CalculationRequest
{
    public SlotConfigurationRequest? Configuration { get; set; }
}

public class SimulationRequest
{
    public SlotConfigurationRequest? Configuration { get; set; }
    public int NumSpins { get; set; } = 100000;
}
