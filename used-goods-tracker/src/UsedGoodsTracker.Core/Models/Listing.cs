namespace UsedGoodsTracker.Core.Models;

public enum ListingFormat
{
    FixedPrice,
    Auction,
    Unknown,
}

/// <summary>
/// A single marketplace listing, tracked from when we first observe it through to sale (when
/// sold-listing data becomes available) or removal. Price history over time lives in
/// <see cref="PriceObservation"/>; this row holds the latest known state.
/// </summary>
public class Listing
{
    public int Id { get; set; }

    /// <summary>eBay's itemId, e.g. "v1|123456789012|0".</summary>
    public required string EbayItemId { get; set; }

    public int? ItemId { get; set; }

    public Item? Item { get; set; }

    public int CategoryId { get; set; }

    public Category? Category { get; set; }

    public required string Title { get; set; }

    public ItemCondition Condition { get; set; } = ItemCondition.Unknown;

    public ListingFormat Format { get; set; } = ListingFormat.Unknown;

    public decimal Price { get; set; }

    public string Currency { get; set; } = "USD";

    public string? ItemWebUrl { get; set; }

    public string? ImageUrl { get; set; }

    public string? SellerUsername { get; set; }

    public int? SellerFeedbackScore { get; set; }

    public string? LocationCountry { get; set; }

    public string? LocationStateOrProvince { get; set; }

    public string? LocationCity { get; set; }

    public string? LocationPostalCode { get; set; }

    /// <summary>When eBay reports the listing as having been created (if available).</summary>
    public DateTimeOffset? ListedAt { get; set; }

    /// <summary>First time our ingestion job observed this listing.</summary>
    public DateTimeOffset FirstSeenAt { get; set; }

    /// <summary>Most recent time our ingestion job observed this listing still active.</summary>
    public DateTimeOffset LastSeenAt { get; set; }

    /// <summary>
    /// True once the listing disappears from active search results (a proxy for "sold or
    /// removed" until Marketplace Insights access provides a definitive sold signal).
    /// </summary>
    public bool IsNoLongerActive { get; set; }

    /// <summary>Set only once confirmed via Marketplace Insights (sold-listing) data.</summary>
    public bool IsConfirmedSold { get; set; }

    public DateTimeOffset? SoldAt { get; set; }

    public decimal? SoldPrice { get; set; }

    /// <summary>Computed once sold: SoldAt - ListedAt (or FirstSeenAt if ListedAt is unknown).</summary>
    public int? DaysToSell { get; set; }

    /// <summary>Raw API payload, kept so we can reprocess without re-fetching.</summary>
    public string? RawJson { get; set; }

    public ICollection<PriceObservation> PriceObservations { get; set; } = new List<PriceObservation>();
}
