using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace UsedGoodsTracker.Data;

/// <summary>Used only by `dotnet ef migrations add` at design time; the running apps configure the
/// context themselves via dependency injection with the real connection string.</summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<UsedGoodsTrackerDbContext>
{
    public UsedGoodsTrackerDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("USEDGOODSTRACKER_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=usedgoodstracker;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<UsedGoodsTrackerDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new UsedGoodsTrackerDbContext(optionsBuilder.Options);
    }
}
