namespace UsedGoodsTracker.Core.Ebay;

public class EbayOptions
{
    public const string SectionName = "Ebay";

    public required string ClientId { get; set; }

    public required string ClientSecret { get; set; }

    /// <summary>"Production" or "Sandbox".</summary>
    public string Environment { get; set; } = "Production";

    public string MarketplaceId { get; set; } = "EBAY_US";

    public string AuthBaseUrl => Environment == "Sandbox"
        ? "https://api.sandbox.ebay.com"
        : "https://api.ebay.com";

    public string ApiBaseUrl => Environment == "Sandbox"
        ? "https://api.sandbox.ebay.com"
        : "https://api.ebay.com";
}
