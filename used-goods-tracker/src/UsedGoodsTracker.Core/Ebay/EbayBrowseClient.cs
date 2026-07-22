using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;
using Microsoft.Extensions.Options;

namespace UsedGoodsTracker.Core.Ebay;

public class EbaySearchQuery
{
    public required string Keywords { get; init; }

    public string? EbayCategoryId { get; init; }

    /// <summary>eBay numeric condition ids to filter on, e.g. 3000,4000,5000,6000 for used tiers.</summary>
    public IReadOnlyCollection<int>? ConditionIds { get; init; }

    public int Limit { get; init; } = 50;

    public int Offset { get; init; } = 0;
}

/// <summary>
/// Thin wrapper over eBay's Buy Browse API `item_summary/search` endpoint. This only covers
/// active listings (current asking price) — it cannot see sold price or time-to-sell, which
/// requires eBay's restricted Marketplace Insights API.
/// </summary>
public class EbayBrowseClient(HttpClient httpClient, EbayAuthClient authClient, IOptions<EbayOptions> options)
{
    private readonly EbayOptions _options = options.Value;

    public async Task<EbaySearchResponse> SearchAsync(
        EbaySearchQuery query, CancellationToken cancellationToken = default)
    {
        var token = await authClient.GetAccessTokenAsync(cancellationToken);

        var queryString = HttpUtility.ParseQueryString(string.Empty);
        queryString["q"] = query.Keywords;
        queryString["limit"] = query.Limit.ToString();
        queryString["offset"] = query.Offset.ToString();

        if (!string.IsNullOrEmpty(query.EbayCategoryId))
        {
            queryString["category_ids"] = query.EbayCategoryId;
        }

        if (query.ConditionIds is { Count: > 0 })
        {
            var conditionFilter = string.Join('|', query.ConditionIds);
            queryString["filter"] = $"conditionIds:{{{conditionFilter}}}";
        }

        var url = $"{_options.ApiBaseUrl}/buy/browse/v1/item_summary/search?{queryString}";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("X-EBAY-C-MARKETPLACE-ID", _options.MarketplaceId);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<EbaySearchResponse>(cancellationToken)
            ?? new EbaySearchResponse();
    }
}
