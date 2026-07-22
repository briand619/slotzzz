using Microsoft.EntityFrameworkCore;
using Quartz;
using UsedGoodsTracker.Core.Ebay;
using UsedGoodsTracker.Data;
using UsedGoodsTracker.Ingestion;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<EbayOptions>(builder.Configuration.GetSection(EbayOptions.SectionName));
builder.Services.Configure<IngestionOptions>(builder.Configuration.GetSection(IngestionOptions.SectionName));

builder.Services.AddHttpClient<EbayAuthClient>();
builder.Services.AddHttpClient<EbayBrowseClient>();

var connectionString = builder.Configuration.GetConnectionString("UsedGoodsTracker")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:UsedGoodsTracker configuration.");

builder.Services.AddDbContext<UsedGoodsTrackerDbContext>(opt => opt.UseNpgsql(connectionString));

builder.Services.AddQuartz(q =>
{
    var jobKey = new JobKey("EbayIngestionJob");
    q.AddJob<EbayIngestionJob>(opts => opts.WithIdentity(jobKey));

    q.AddTrigger(t => t
        .ForJob(jobKey)
        .WithIdentity("EbayIngestionJob-trigger")
        .WithCronSchedule(builder.Configuration[$"{IngestionOptions.SectionName}:CronSchedule"] ?? "0 0/30 * * * ?")
        .StartNow());
});
builder.Services.AddQuartzHostedService(opt => opt.WaitForJobsToComplete = true);

var host = builder.Build();

using (var scope = host.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<UsedGoodsTrackerDbContext>();
    db.Database.Migrate();
}

host.Run();
