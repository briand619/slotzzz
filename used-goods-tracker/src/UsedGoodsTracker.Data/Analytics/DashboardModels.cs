namespace UsedGoodsTracker.Data.Analytics;

public class CategorySummary
{
    public int CategoryId { get; set; }

    public required string CategoryName { get; set; }

    public int ActiveListingCount { get; set; }

    public decimal AveragePrice { get; set; }

    public decimal MinPrice { get; set; }

    public decimal MaxPrice { get; set; }
}

public class PriceTrendPoint
{
    public DateTime Date { get; set; }

    public double AveragePrice { get; set; }
}

public class AreaDemand
{
    public required string Area { get; set; }

    public int ListingCount { get; set; }
}
