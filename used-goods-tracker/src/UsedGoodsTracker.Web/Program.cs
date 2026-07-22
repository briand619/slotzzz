using Microsoft.EntityFrameworkCore;
using Radzen;
using UsedGoodsTracker.Data;
using UsedGoodsTracker.Data.Analytics;
using UsedGoodsTracker.Web.Components;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddRadzenComponents();

var connectionString = builder.Configuration.GetConnectionString("UsedGoodsTracker")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:UsedGoodsTracker configuration.");

builder.Services.AddDbContext<UsedGoodsTrackerDbContext>(opt => opt.UseNpgsql(connectionString));
builder.Services.AddScoped<DashboardQueries>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<UsedGoodsTrackerDbContext>();
    db.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseStaticFiles();
app.UseAntiforgery();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
