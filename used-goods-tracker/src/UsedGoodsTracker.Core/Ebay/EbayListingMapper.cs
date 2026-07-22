using System.Globalization;
using UsedGoodsTracker.Core.Models;

namespace UsedGoodsTracker.Core.Ebay;

public static class EbayListingMapper
{
    public static void ApplyTo(Listing listing, EbayItemSummary summary, int categoryId, DateTimeOffset observedAt)
    {
        listing.EbayItemId = summary.ItemId;
        listing.Title = summary.Title;
        listing.CategoryId = categoryId;
        listing.Condition = ParseCondition(summary.ConditionId);
        listing.Format = ParseFormat(summary.BuyingOptions);
        listing.Price = ParsePrice(summary.Price?.Value);
        listing.Currency = summary.Price?.Currency ?? "USD";
        listing.ItemWebUrl = summary.ItemWebUrl;
        listing.ImageUrl = summary.Image?.ImageUrl;
        listing.SellerUsername = summary.Seller?.Username;
        listing.SellerFeedbackScore = summary.Seller?.FeedbackScore;
        listing.LocationCountry = summary.ItemLocation?.Country;
        listing.LocationStateOrProvince = summary.ItemLocation?.StateOrProvince;
        listing.LocationCity = summary.ItemLocation?.City;
        listing.LocationPostalCode = summary.ItemLocation?.PostalCode;
        listing.ListedAt = summary.ItemCreationDate;
        listing.LastSeenAt = observedAt;
        listing.IsNoLongerActive = false;
    }

    public static ItemCondition ParseCondition(string? conditionId)
    {
        if (int.TryParse(conditionId, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id)
            && Enum.IsDefined(typeof(ItemCondition), id))
        {
            return (ItemCondition)id;
        }

        return ItemCondition.Unknown;
    }

    private static ListingFormat ParseFormat(List<string>? buyingOptions)
    {
        if (buyingOptions is null)
        {
            return ListingFormat.Unknown;
        }

        if (buyingOptions.Contains("AUCTION"))
        {
            return ListingFormat.Auction;
        }

        if (buyingOptions.Contains("FIXED_PRICE"))
        {
            return ListingFormat.FixedPrice;
        }

        return ListingFormat.Unknown;
    }

    private static decimal ParsePrice(string? value) =>
        decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var price) ? price : 0m;
}
