namespace SlotDesignAPI.Services;

using SlotDesignAPI.Models;
using SlotMathEngine.Engines;
using SlotMathEngine.Models;

public class SlotAnalysisService : ISlotAnalysisService
{
    public RTPResult CalculateRTP(SlotConfigurationRequest request)
    {
        var config = ConvertToConfiguration(request);

        var rtpCalc = new RTPCalculator();
        var rtp = rtpCalc.CalculateRTP(config);
        var expectedValue = rtpCalc.CalculateExpectedValue(config);
        var hitFreq = rtpCalc.GetHitFrequency(config);

        return new RTPResult
        {
            RTP = rtp,
            ExpectedValue = expectedValue,
            HitFrequency = hitFreq
        };
    }

    public VolatilityResult CalculateVolatility(SlotConfigurationRequest request)
    {
        var config = ConvertToConfiguration(request);

        var volCalc = new VolatilityCalculator();
        var variance = volCalc.CalculateVariance(config);
        var volatility = volCalc.CalculateVolatility(config);
        var volIndex = volCalc.CalculateVolatilityIndex(config);

        return new VolatilityResult
        {
            Variance = variance,
            Volatility = volatility,
            VolatilityIndex = volIndex
        };
    }

    public SimulationResultDto RunSimulation(SlotConfigurationRequest request, int numSpins)
    {
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
            ResultsCount = result.SpinResults.Count
        };
    }

    public FullAnalysisResult FullAnalysis(SlotConfigurationRequest request)
    {
        var config = ConvertToConfiguration(request);

        var rtpCalc = new RTPCalculator();
        var volCalc = new VolatilityCalculator();
        var simEngine = new SimulationEngine();

        var rtp = rtpCalc.CalculateRTP(config);
        var expectedValue = rtpCalc.CalculateExpectedValue(config);
        var hitFreq = rtpCalc.GetHitFrequency(config);

        var variance = volCalc.CalculateVariance(config);
        var volatility = volCalc.CalculateVolatility(config);
        var volIndex = volCalc.CalculateVolatilityIndex(config);

        var simResult = simEngine.RunSimulation(config, 100000);

        return new FullAnalysisResult
        {
            RTPAnalysis = new RTPResult
            {
                RTP = rtp,
                ExpectedValue = expectedValue,
                HitFrequency = hitFreq
            },
            VolatilityAnalysis = new VolatilityResult
            {
                Variance = variance,
                Volatility = volatility,
                VolatilityIndex = volIndex
            },
            SimulationResults = new SimulationResultDto
            {
                TotalWagered = simResult.TotalWagered,
                TotalWon = simResult.TotalWon,
                AverageWin = simResult.AverageWin,
                MinWin = simResult.MinWin,
                MaxWin = simResult.MaxWin,
                TotalSpins = simResult.TotalSpins,
                WinningSpins = simResult.WinningSpins,
                ActualRTP = simResult.ActualRTP,
                ResultsCount = simResult.SpinResults.Count
            }
        };
    }

    private SlotConfiguration ConvertToConfiguration(SlotConfigurationRequest request)
    {
        if (request == null)
            throw new ArgumentException("Configuration cannot be null");

        var config = new SlotConfiguration(request.Name, request.NumReels);

        if (request.Symbols != null)
        {
            foreach (var symbolDto in request.Symbols)
            {
                config.Symbols.Add(new Symbol(symbolDto.Id, symbolDto.Name, symbolDto.Weight));
            }
        }

        if (request.Paytable != null)
        {
            config.Paytable.BaseWager = request.Paytable.BaseWager;

            if (request.Paytable.PayLines != null)
            {
                foreach (var payLineDto in request.Paytable.PayLines)
                {
                    var payLine = new PayLine(payLineDto.Id, payLineDto.ReelPositions);

                    if (payLineDto.Rules != null)
                    {
                        foreach (var ruleDto in payLineDto.Rules)
                        {
                            payLine.Rules.Add(new PayLineRule(ruleDto.SymbolIds, ruleDto.Multiplier));
                        }
                    }

                    config.Paytable.PayLines.Add(payLine);
                }
            }
        }

        return config;
    }
}
