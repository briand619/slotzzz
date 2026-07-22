namespace UsedGoodsTracker.Core.Models;

/// <summary>
/// A canonical product that individual marketplace listings are grouped under
/// (e.g. "Apple iPhone 12 64GB Unlocked"), so price trends can be computed per-product
/// rather than per-listing.
/// </summary>
public class Item
{
    public int Id { get; set; }

    public required string Title { get; set; }

    public int CategoryId { get; set; }

    public Category? Category { get; set; }

    public string? Brand { get; set; }

    public string? Model { get; set; }

    /// <summary>eBay Product ID, when the listing was matched to a catalog product.</summary>
    public string? EbayEpid { get; set; }

    public ICollection<Listing> Listings { get; set; } = new List<Listing>();
}
