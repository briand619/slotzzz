namespace SlotDesignAPI.Services;

using SlotDesignAPI.Models;

public interface ISlotAnalysisService
{
    RTPResult CalculateRTP(SlotConfigurationRequest? config);
    VolatilityResult CalculateVolatility(SlotConfigurationRequest? config);
    SimulationResultDto RunSimulation(SlotConfigurationRequest? config, int numSpins);
    FullAnalysisResult FullAnalysis(SlotConfigurationRequest? config);
}
