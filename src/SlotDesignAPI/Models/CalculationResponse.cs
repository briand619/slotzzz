namespace SlotDesignAPI.Models;

public class RTPResult
{
    public decimal RTP { get; set; }
    public decimal ExpectedValue { get; set; }
    public decimal HitFrequency { get; set; }
}

public class VolatilityResult
{
    public decimal Variance { get; set; }
    public decimal Volatility { get; set; }
    public decimal VolatilityIndex { get; set; }
}

public class SimulationResultDto
{
    public decimal TotalWagered { get; set; }
    public decimal TotalWon { get; set; }
    public decimal AverageWin { get; set; }
    public decimal MinWin { get; set; }
    public decimal MaxWin { get; set; }
    public int TotalSpins { get; set; }
    public int WinningSpins { get; set; }
    public decimal ActualRTP { get; set; }
    public int ResultsCount { get; set; }
}

public class FullAnalysisResult
{
    public RTPResult RTPAnalysis { get; set; }
    public VolatilityResult VolatilityAnalysis { get; set; }
    public SimulationResultDto SimulationResults { get; set; }
}
