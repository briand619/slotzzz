namespace UsedGoodsTracker.Core.Models;

/// <summary>A price snapshot for a listing at a point in time, forming the price-trend series.</summary>
public class PriceObservation
{
    public int Id { get; set; }

    public int ListingId { get; set; }

    public Listing? Listing { get; set; }

    public DateTimeOffset ObservedAt { get; set; }

    public decimal Price { get; set; }

    public string Currency { get; set; } = "USD";
}
