using System.Text.Json.Serialization;

namespace UsedGoodsTracker.Core.Ebay;

public class EbaySearchResponse
{
    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("itemSummaries")]
    public List<EbayItemSummary>? ItemSummaries { get; set; }

    [JsonPropertyName("next")]
    public string? Next { get; set; }
}

public class EbayItemSummary
{
    [JsonPropertyName("itemId")]
    public required string ItemId { get; set; }

    [JsonPropertyName("title")]
    public required string Title { get; set; }

    [JsonPropertyName("price")]
    public EbayPrice? Price { get; set; }

    [JsonPropertyName("condition")]
    public string? Condition { get; set; }

    [JsonPropertyName("conditionId")]
    public string? ConditionId { get; set; }

    [JsonPropertyName("itemWebUrl")]
    public string? ItemWebUrl { get; set; }

    [JsonPropertyName("image")]
    public EbayImage? Image { get; set; }

    [JsonPropertyName("seller")]
    public EbaySeller? Seller { get; set; }

    [JsonPropertyName("itemLocation")]
    public EbayItemLocation? ItemLocation { get; set; }

    [JsonPropertyName("itemCreationDate")]
    public DateTimeOffset? ItemCreationDate { get; set; }

    [JsonPropertyName("buyingOptions")]
    public List<string>? BuyingOptions { get; set; }

    [JsonPropertyName("categories")]
    public List<EbayCategoryRef>? Categories { get; set; }
}

public class EbayPrice
{
    [JsonPropertyName("value")]
    public string? Value { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }
}

public class EbayImage
{
    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }
}

public class EbaySeller
{
    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("feedbackScore")]
    public int? FeedbackScore { get; set; }
}

/// <summary>
/// eBay's Browse API only exposes country and a (frequently truncated) postal code for privacy
/// reasons — no city/state and no lat/long. "Demand by area" is necessarily coarse until a
/// richer location source is added.
/// </summary>
public class EbayItemLocation
{
    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [JsonPropertyName("postalCode")]
    public string? PostalCode { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("stateOrProvince")]
    public string? StateOrProvince { get; set; }
}

public class EbayCategoryRef
{
    [JsonPropertyName("categoryId")]
    public string? CategoryId { get; set; }
}
