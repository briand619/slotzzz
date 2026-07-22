namespace UsedGoodsTracker.Core.Models;

public class Category
{
    public int Id { get; set; }

    public required string Name { get; set; }

    /// <summary>eBay's category tree leaf node id, used when querying the Browse API.</summary>
    public required string EbayCategoryId { get; set; }

    public string? SearchKeywords { get; set; }

    public ICollection<Item> Items { get; set; } = new List<Item>();
}
