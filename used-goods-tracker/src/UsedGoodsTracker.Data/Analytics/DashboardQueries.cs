using Microsoft.EntityFrameworkCore;
using UsedGoodsTracker.Core.Models;

namespace UsedGoodsTracker.Data.Analytics;

public class DashboardQueries(UsedGoodsTrackerDbContext db)
{
    public Task<List<Category>> GetCategoriesAsync(CancellationToken cancellationToken = default) =>
        db.Categories.OrderBy(c => c.Name).ToListAsync(cancellationToken);

    public Task<List<CategorySummary>> GetCategorySummariesAsync(CancellationToken cancellationToken = default) =>
        db.Listings
            .Where(l => !l.IsNoLongerActive)
            .GroupBy(l => new { l.CategoryId, l.Category!.Name })
            .Select(g => new CategorySummary
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.Name,
                ActiveListingCount = g.Count(),
                AveragePrice = g.Average(l => l.Price),
                MinPrice = g.Min(l => l.Price),
                MaxPrice = g.Max(l => l.Price),
            })
            .OrderByDescending(c => c.ActiveListingCount)
            .ToListAsync(cancellationToken);

    public async Task<List<PriceTrendPoint>> GetPriceTrendAsync(
        int categoryId, int days = 30, CancellationToken cancellationToken = default)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-days);

        // Grouped in-memory (not translated to SQL) since per-category observation volume is
        // small at this polling cadence; revisit if a category's history grows large.
        var observations = await db.PriceObservations
            .Where(p => p.Listing!.CategoryId == categoryId && p.ObservedAt >= since)
            .Select(p => new { p.ObservedAt, p.Price })
            .ToListAsync(cancellationToken);

        return observations
            .GroupBy(o => o.ObservedAt.UtcDateTime.Date)
            .Select(g => new PriceTrendPoint { Date = g.Key, AveragePrice = (double)g.Average(o => o.Price) })
            .OrderBy(p => p.Date)
            .ToList();
    }

    /// <summary>
    /// Listing counts by seller state/province, as a coarse demand-by-area proxy. eBay's Browse
    /// API only exposes seller location (not buyer/demand location), and often just country +
    /// partial postal code, so state-level data will be sparse for many listings.
    /// </summary>
    public Task<List<AreaDemand>> GetDemandByAreaAsync(int categoryId, CancellationToken cancellationToken = default) =>
        db.Listings
            .Where(l => l.CategoryId == categoryId && l.LocationStateOrProvince != null)
            .GroupBy(l => l.LocationStateOrProvince!)
            .Select(g => new AreaDemand { Area = g.Key, ListingCount = g.Count() })
            .OrderByDescending(a => a.ListingCount)
            .ToListAsync(cancellationToken);

    public Task<List<Listing>> GetRecentListingsAsync(
        int? categoryId, int take = 50, CancellationToken cancellationToken = default)
    {
        var query = db.Listings.Include(l => l.Category).AsQueryable();
        if (categoryId is not null)
        {
            query = query.Where(l => l.CategoryId == categoryId);
        }

        return query.OrderByDescending(l => l.LastSeenAt).Take(take).ToListAsync(cancellationToken);
    }
}
