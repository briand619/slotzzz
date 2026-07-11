namespace SlotDesignAPI.Models;

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
    public List<PayLineRuleDto>? Rules { get; set; }
}

public class PaytableDto
{
    public List<PayLineDto>? PayLines { get; set; }
    public decimal BaseWager { get; set; }
}

public class SlotConfigurationRequest
{
    public string? Name { get; set; }
    public int NumReels { get; set; }
    public List<SymbolDto>? Symbols { get; set; }
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
