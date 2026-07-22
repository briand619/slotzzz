using Microsoft.EntityFrameworkCore;
using UsedGoodsTracker.Core.Models;

namespace UsedGoodsTracker.Data;

public class UsedGoodsTrackerDbContext(DbContextOptions<UsedGoodsTrackerDbContext> options)
    : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Item> Items => Set<Item>();

    public DbSet<Listing> Listings => Set<Listing>();

    public DbSet<PriceObservation> PriceObservations => Set<PriceObservation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(c => c.EbayCategoryId).IsUnique();
        });

        modelBuilder.Entity<Item>(entity =>
        {
            entity.HasOne(i => i.Category)
                .WithMany(c => c.Items)
                .HasForeignKey(i => i.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Listing>(entity =>
        {
            entity.HasIndex(l => l.EbayItemId).IsUnique();
            entity.Property(l => l.Price).HasPrecision(12, 2);
            entity.Property(l => l.SoldPrice).HasPrecision(12, 2);

            entity.HasOne(l => l.Item)
                .WithMany(i => i.Listings)
                .HasForeignKey(l => l.ItemId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(l => l.Category)
                .WithMany()
                .HasForeignKey(l => l.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(l => new { l.CategoryId, l.Condition });
            entity.HasIndex(l => l.LocationStateOrProvince);
        });

        modelBuilder.Entity<PriceObservation>(entity =>
        {
            entity.Property(p => p.Price).HasPrecision(12, 2);

            entity.HasOne(p => p.Listing)
                .WithMany(l => l.PriceObservations)
                .HasForeignKey(p => p.ListingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(p => new { p.ListingId, p.ObservedAt });
        });
    }
}
