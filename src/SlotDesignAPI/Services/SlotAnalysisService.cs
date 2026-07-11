namespace SlotDesignAPI.Services;

using SlotDesignAPI.Models;
using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class SlotAnalysisService : ISlotAnalysisService
{
    public const int MaxSpins = 1_000_000;
    public const int DefaultSpins = 100_000;

    public RTPResult CalculateRTP(SlotConfigurationRequest? request)
    {
        var config = ConvertToConfiguration(request);
        var metrics = TheoreticalAnalyzer.Compute(config);

        return new RTPResult
        {
            RTP = metrics.ExpectedValue / config.Paytable.BaseWager,
            ExpectedValue = metrics.ExpectedValue,
            HitFrequency = metrics.HitFrequency
        };
    }

    public VolatilityResult CalculateVolatility(SlotConfigurationRequest? request)
    {
        var config = ConvertToConfiguration(request);
        var metrics = TheoreticalAnalyzer.Compute(config);

        decimal volatility = (decimal)Math.Sqrt((double)metrics.Variance);

        return new VolatilityResult
        {
            Variance = metrics.Variance,
            Volatility = volatility,
            VolatilityIndex = metrics.ExpectedValue == 0 ? 0 : volatility / metrics.ExpectedValue
        };
    }

    public SimulationResultDto RunSimulation(SlotConfigurationRequest? request, int numSpins)
    {
        if (numSpins < 1 || numSpins > MaxSpins)
            throw new ArgumentException($"numSpins must be between 1 and {MaxSpins}");

        var config = ConvertToConfiguration(request);

        var simEngine = new SimulationEngine();
        var result = simEngine.RunSimulation(config, numSpins);

        return new SimulationResultDto
        {
            TotalWagered = result.TotalWagered,
            TotalWon = result.TotalWon,
            AverageWin = result.AverageWin,
            MinWin = result.MinWin,
            MaxWin = result.MaxWin,
            TotalSpins = result.TotalSpins,
            WinningSpins = result.WinningSpins,
            ActualRTP = result.ActualRTP,
            ActualVariance = result.ActualVariance
        };
    }

    public FullAnalysisResult FullAnalysis(SlotConfigurationRequest? request)
    {
        return new FullAnalysisResult
        {
            RTPAnalysis = CalculateRTP(request),
            VolatilityAnalysis = CalculateVolatility(request),
            SimulationResults = RunSimulation(request, DefaultSpins)
        };
    }

    private SlotConfiguration ConvertToConfiguration(SlotConfigurationRequest? request)
    {
        if (request == null)
            throw new ArgumentException("Configuration cannot be null");

        var config = new SlotConfiguration(request.Name ?? string.Empty, request.NumReels);

        if (request.Symbols != null)
        {
            foreach (var symbolDto in request.Symbols)
            {
                config.Symbols.Add(new Symbol(
                    symbolDto.Id ?? string.Empty,
                    symbolDto.Name ?? string.Empty,
                    symbolDto.Weight));
            }
        }

        if (request.Paytable != null)
        {
            config.Paytable.BaseWager = request.Paytable.BaseWager;

            if (request.Paytable.PayLines != null)
            {
                foreach (var payLineDto in request.Paytable.PayLines)
                {
                    var payLine = new PayLine(payLineDto.Id, payLineDto.ReelPositions ?? new List<int>());

                    if (payLineDto.Rules != null)
                    {
                        foreach (var ruleDto in payLineDto.Rules)
                        {
                            payLine.Rules.Add(new PayLineRule(ruleDto.SymbolIds ?? new List<string>(), ruleDto.Multiplier));
                        }
                    }

                    config.Paytable.PayLines.Add(payLine);
                }
            }
        }

        config.EnsureValid();
        return config;
    }
}
