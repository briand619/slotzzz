using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Quartz;
using UsedGoodsTracker.Core.Ebay;
using UsedGoodsTracker.Core.Models;
using UsedGoodsTracker.Data;

namespace UsedGoodsTracker.Ingestion;

[DisallowConcurrentExecution]
public class EbayIngestionJob(
    EbayBrowseClient browseClient,
    UsedGoodsTrackerDbContext db,
    IOptions<IngestionOptions> options,
    ILogger<EbayIngestionJob> logger)
    : IJob
{
    private readonly IngestionOptions _options = options.Value;

    public async Task Execute(IJobExecutionContext context)
    {
        var cancellationToken = context.CancellationToken;
        var now = DateTimeOffset.UtcNow;

        foreach (var search in _options.TrackedSearches)
        {
            try
            {
                await RunSearchAsync(search, now, cancellationToken);
            }
            catch (Exception ex)
            {
                // One bad search (rate limit, transient network error) shouldn't stop the rest.
                logger.LogError(ex, "eBay ingestion failed for search {Keywords}", search.Keywords);
            }
        }
    }

    private async Task RunSearchAsync(TrackedSearch search, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var category = await GetOrCreateCategoryAsync(search, cancellationToken);
        var seenItemIds = new HashSet<string>();
        var offset = 0;
        var total = int.MaxValue;

        for (var page = 0; page < _options.MaxPagesPerSearch && offset < total; page++)
        {
            var response = await browseClient.SearchAsync(new EbaySearchQuery
            {
                Keywords = search.Keywords,
                EbayCategoryId = search.EbayCategoryId,
                ConditionIds = search.ConditionIds,
                Limit = 50,
                Offset = offset,
            }, cancellationToken);

            total = response.Total;
            var summaries = response.ItemSummaries ?? [];
            if (summaries.Count == 0)
            {
                break;
            }

            foreach (var summary in summaries)
            {
                seenItemIds.Add(summary.ItemId);
                await UpsertListingAsync(summary, category.Id, now, cancellationToken);
            }

            offset += summaries.Count;
        }

        await db.SaveChangesAsync(cancellationToken);
        await MarkStaleListingsAsync(category.Id, seenItemIds, cancellationToken);

        logger.LogInformation(
            "Ingested {Count} listings for '{Keywords}' (category {Category})",
            seenItemIds.Count, search.Keywords, search.CategoryName);
    }

    private async Task<Category> GetOrCreateCategoryAsync(TrackedSearch search, CancellationToken cancellationToken)
    {
        var category = await db.Categories
            .FirstOrDefaultAsync(c => c.EbayCategoryId == search.EbayCategoryId, cancellationToken);

        if (category is not null)
        {
            return category;
        }

        category = new Category
        {
            Name = search.CategoryName,
            EbayCategoryId = search.EbayCategoryId,
            SearchKeywords = search.Keywords,
        };
        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);
        return category;
    }

    private async Task UpsertListingAsync(
        EbayItemSummary summary, int categoryId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var listing = await db.Listings
            .FirstOrDefaultAsync(l => l.EbayItemId == summary.ItemId, cancellationToken);

        var newPrice = decimal.TryParse(summary.Price?.Value, out var parsed) ? parsed : 0m;

        if (listing is null)
        {
            listing = new Listing
            {
                EbayItemId = summary.ItemId,
                Title = summary.Title,
                FirstSeenAt = now,
                LastSeenAt = now,
            };
            EbayListingMapper.ApplyTo(listing, summary, categoryId, now);
            db.Listings.Add(listing);
            db.PriceObservations.Add(new PriceObservation
            {
                Listing = listing,
                ObservedAt = now,
                Price = listing.Price,
                Currency = listing.Currency,
            });
            return;
        }

        var priceChanged = listing.Price != newPrice;
        var wasInactive = listing.IsNoLongerActive;

        EbayListingMapper.ApplyTo(listing, summary, categoryId, now);
        listing.IsNoLongerActive = false;

        if (priceChanged || wasInactive)
        {
            db.PriceObservations.Add(new PriceObservation
            {
                ListingId = listing.Id,
                ObservedAt = now,
                Price = listing.Price,
                Currency = listing.Currency,
            });
        }
    }

    private async Task MarkStaleListingsAsync(
        int categoryId, HashSet<string> seenItemIds, CancellationToken cancellationToken)
    {
        var staleListings = await db.Listings
            .Where(l => l.CategoryId == categoryId && !l.IsNoLongerActive)
            .ToListAsync(cancellationToken);

        var newlyStale = staleListings.Where(l => !seenItemIds.Contains(l.EbayItemId)).ToList();
        foreach (var listing in newlyStale)
        {
            listing.IsNoLongerActive = true;
        }

        if (newlyStale.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
