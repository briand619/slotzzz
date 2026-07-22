# Used Goods Pricing Tracker

Tracks used-goods pricing from eBay to give sellers a data-backed baseline price: current
asking prices by category/condition, price trends over time, and listing volume by seller
location.

## Architecture

| Project | Type | Responsibility |
|---|---|---|
| `UsedGoodsTracker.Core` | Class library | Domain models (`Listing`, `Item`, `Category`, `PriceObservation`), eBay Browse API client |
| `UsedGoodsTracker.Data` | Class library | EF Core `DbContext` (PostgreSQL via Npgsql), migrations, dashboard queries |
| `UsedGoodsTracker.Ingestion` | Worker service | Quartz-scheduled job that polls eBay and upserts listings |
| `UsedGoodsTracker.Web` | Blazor Server app | Dashboard UI (Radzen.Blazor components) — pure C#, no JS framework |

No React/Angular/etc. — the dashboard is Blazor Server, so all interactivity is C# running
over a SignalR connection.

## Important limitation: active listings only, not sold prices

eBay's self-serve **Browse API** only returns *active* listings (current asking price). Actual
*sold* comparables (sold price, true time-to-sell) require the **Marketplace Insights API**,
which eBay only grants to approved partners on application — there's no self-serve access and
no guaranteed timeline.

This build ingests Browse API data as the real, working baseline (asking price, price trend,
listing volume), and the schema already has `IsConfirmedSold` / `SoldAt` / `SoldPrice` fields on
`Listing` ready to populate once Marketplace Insights access is granted — that's a fast-follow,
not a blocker for using this today. In the meantime, `IsNoLongerActive` (a listing dropping out
of active search results) is tracked as a coarse, *unconfirmed* proxy — it means "sold or
removed," not "sold."

Similarly, "demand by area" is really **listing volume by seller location** — eBay's Browse API
exposes seller location (country, and often only a partial postal code), not buyer/demand
location, and rarely includes city/state. Treat area charts as a supply-side proxy, not true
demand.

## Prerequisites

- .NET 8 SDK
- Docker (for local PostgreSQL)
- An eBay Developer account with a **production keyset** (Client ID + Client Secret) —
  register at the eBay Developers Program. No special approval is needed for Browse API access.

## Running locally

1. Start PostgreSQL:
   ```
   docker compose up -d
   ```

2. Configure eBay credentials as user secrets (never commit them):
   ```
   cd src/UsedGoodsTracker.Ingestion
   dotnet user-secrets init
   dotnet user-secrets set "Ebay:ClientId" "<your client id>"
   dotnet user-secrets set "Ebay:ClientSecret" "<your client secret>"
   ```

3. Edit `src/UsedGoodsTracker.Ingestion/appsettings.json` → `Ingestion:TrackedSearches` to pick
   what to track (eBay category id + search keywords + condition ids). Two examples are
   pre-configured (iPhone 12, MacBook Pro 13").

4. Run the ingestion worker (applies EF Core migrations automatically on startup, then polls
   eBay immediately and every 30 minutes thereafter, per `Ingestion:CronSchedule`):
   ```
   dotnet run --project src/UsedGoodsTracker.Ingestion
   ```

5. In another terminal, run the dashboard:
   ```
   dotnet run --project src/UsedGoodsTracker.Web
   ```
   Browse to `https://localhost:7019` (or the URL printed on startup). It'll show "no listings
   yet" until the ingestion worker completes its first poll.

## Adding a new EF Core migration

```
dotnet ef migrations add <Name> --project src/UsedGoodsTracker.Data --startup-project src/UsedGoodsTracker.Data
```

Both `Web` and `Ingestion` call `Database.Migrate()` on startup, so migrations apply
automatically — no manual `dotnet ef database update` step needed once you've added one.

## Roadmap

- Apply for eBay Marketplace Insights API access to get real sold price / time-to-sell data
- Condition-vs-price scoring model (currently just tracks condition and price side by side)
- Additional marketplaces once official API access is available for them
