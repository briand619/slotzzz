namespace UsedGoodsTracker.Core.Models;

/// <summary>
/// Mirrors eBay's numeric conditionId values so API responses map directly onto this enum.
/// </summary>
public enum ItemCondition
{
    New = 1000,
    NewOther = 1500,
    CertifiedRefurbished = 2000,
    ExcellentRefurbished = 2010,
    VeryGoodRefurbished = 2020,
    GoodRefurbished = 2030,
    SellerRefurbished = 2500,
    Used = 3000,
    VeryGood = 4000,
    Good = 5000,
    Acceptable = 6000,
    ForPartsOrNotWorking = 7000,
    Unknown = 0,
}
