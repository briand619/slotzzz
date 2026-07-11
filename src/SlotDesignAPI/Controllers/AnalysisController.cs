namespace SlotDesignAPI.Controllers;

using Microsoft.AspNetCore.Mvc;
using SlotDesignAPI.Models;
using SlotDesignAPI.Services;

[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private readonly ISlotAnalysisService _analysisService;

    public AnalysisController(ISlotAnalysisService analysisService)
    {
        _analysisService = analysisService;
    }

    [HttpPost("rtp")]
    public ActionResult<RTPResult> CalculateRTP([FromBody] CalculationRequest request)
    {
        try
        {
            var result = _analysisService.CalculateRTP(request.Configuration);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("volatility")]
    public ActionResult<VolatilityResult> CalculateVolatility([FromBody] CalculationRequest request)
    {
        try
        {
            var result = _analysisService.CalculateVolatility(request.Configuration);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("simulate")]
    public ActionResult<SimulationResultDto> RunSimulation([FromBody] SimulationRequest request)
    {
        try
        {
            var result = _analysisService.RunSimulation(request.Configuration, request.NumSpins);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("analyze")]
    public ActionResult<FullAnalysisResult> FullAnalysis([FromBody] CalculationRequest request)
    {
        try
        {
            var result = _analysisService.FullAnalysis(request.Configuration);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
