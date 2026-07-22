namespace UsedGoodsTracker.Ingestion;

/// <summary>One configured eBay search the ingestion job polls on a schedule.</summary>
public class TrackedSearch
{
    public required string CategoryName { get; set; }

    public required string EbayCategoryId { get; set; }

    public required string Keywords { get; set; }

    public List<int> ConditionIds { get; set; } = [3000, 4000, 5000, 6000];
}

public class IngestionOptions
{
    public const string SectionName = "Ingestion";

    public List<TrackedSearch> TrackedSearches { get; set; } = [];

    /// <summary>Cron schedule for the polling job (default: every 30 minutes).</summary>
    public string CronSchedule { get; set; } = "0 0/30 * * * ?";

    /// <summary>Max result pages fetched per tracked search per run, to respect eBay rate limits.</summary>
    public int MaxPagesPerSearch { get; set; } = 4;
}
