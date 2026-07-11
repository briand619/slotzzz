namespace SlotMathEngine.Models;

public record SymbolProbability(string SymbolId, decimal Probability);

public class SlotConfiguration
{
    public string Name { get; set; }
    public int NumReels { get; set; }

    /// <summary>The symbol catalog. Symbol.Weight is used as the shared
    /// distribution for every reel when no explicit Reels are configured.</summary>
    public List<Symbol> Symbols { get; set; }

    /// <summary>Optional per-reel strips. When set, must contain exactly NumReels
    /// entries and overrides the shared Symbol weights; each reel then has its own
    /// symbol distribution. When null or empty, every reel uses the catalog weights.</summary>
    public List<ReelStrip>? Reels { get; set; }

    public Paytable Paytable { get; set; }

    public SlotConfiguration(string name, int numReels)
    {
        Name = name;
        NumReels = numReels;
        Symbols = new List<Symbol>();
        Paytable = new Paytable();
    }

    public bool HasExplicitReels => Reels is { Count: > 0 };

    /// <summary>
    /// The symbol distribution of each reel: for reel r, the distinct symbols it can
    /// show with their probabilities (summing to 1). This is the single source of
    /// truth for reel behavior, used by both the exact analyzer and the simulator.
    /// </summary>
    public IReadOnlyList<IReadOnlyList<SymbolProbability>> GetReelDistributions()
    {
        if (!HasExplicitReels)
        {
            decimal totalWeight = Symbols.Sum(s => s.Weight);
            var shared = Symbols
                .Select(s => new SymbolProbability(s.Id, s.Weight / totalWeight))
                .ToList();
            return Enumerable.Repeat((IReadOnlyList<SymbolProbability>)shared, NumReels).ToList();
        }

        return Reels!
            .Select(reel =>
            {
                decimal totalWeight = reel.Stops.Sum(st => st.Weight);
                return (IReadOnlyList<SymbolProbability>)reel.Stops
                    .GroupBy(st => st.SymbolId)
                    .Select(g => new SymbolProbability(g.Key, g.Sum(st => st.Weight) / totalWeight))
                    .ToList();
            })
            .ToList();
    }

    public bool Validate() => GetValidationErrors().Count == 0;

    public IReadOnlyList<string> GetValidationErrors()
    {
        var errors = new List<string>();

        if (NumReels <= 0)
            errors.Add("Number of reels must be positive");

        if (Symbols.Count == 0)
            errors.Add("Configuration must define at least one symbol");

        var duplicateIds = Symbols.GroupBy(s => s.Id).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
        if (duplicateIds.Count > 0)
            errors.Add($"Duplicate symbol ids: {string.Join(", ", duplicateIds)}");

        var symbolIds = Symbols.Select(s => s.Id).ToHashSet();

        if (HasExplicitReels)
        {
            if (Reels!.Count != NumReels)
                errors.Add($"Configuration declares {NumReels} reels but defines {Reels.Count} reel strips");

            for (int r = 0; r < Reels.Count; r++)
            {
                var strip = Reels[r];
                if (strip.Stops == null || strip.Stops.Count == 0)
                {
                    errors.Add($"Reel {r}: strip has no stops");
                    continue;
                }

                if (strip.Stops.Any(st => st.Weight <= 0))
                    errors.Add($"Reel {r}: all stop weights must be positive");

                var unknown = strip.Stops
                    .Select(st => st.SymbolId)
                    .Where(id => !symbolIds.Contains(id))
                    .Distinct()
                    .ToList();
                if (unknown.Count > 0)
                    errors.Add($"Reel {r}: strip references unknown symbol ids: {string.Join(", ", unknown)}");
            }
        }
        else
        {
            // The catalog weights are the shared distribution for every reel.
            if (Symbols.Any(s => s.Weight <= 0))
                errors.Add("All symbol weights must be positive");
        }

        if (Paytable.BaseWager <= 0)
            errors.Add("Base wager must be positive");

        if (Paytable.PayLines.Count == 0)
            errors.Add("Paytable must define at least one payline");

        foreach (var payLine in Paytable.PayLines)
        {
            if (payLine.ReelPositions == null || payLine.ReelPositions.Count == 0)
            {
                errors.Add($"Payline {payLine.Id}: reel positions are missing");
                continue;
            }

            if (payLine.ReelPositions.Any(p => p < 0 || p >= NumReels))
                errors.Add($"Payline {payLine.Id}: reel positions must be between 0 and {NumReels - 1}");

            if (payLine.Rules == null || payLine.Rules.Count == 0)
            {
                errors.Add($"Payline {payLine.Id}: must define at least one rule");
                continue;
            }

            foreach (var rule in payLine.Rules)
            {
                if (rule.SymbolIds == null)
                {
                    errors.Add($"Payline {payLine.Id}: a rule is missing its symbol ids");
                    continue;
                }

                if (rule.SymbolIds.Count != payLine.ReelPositions.Count)
                    errors.Add($"Payline {payLine.Id}: rule has {rule.SymbolIds.Count} symbols but the payline has {payLine.ReelPositions.Count} positions");

                var unknown = rule.SymbolIds.Where(id => !symbolIds.Contains(id)).Distinct().ToList();
                if (unknown.Count > 0)
                    errors.Add($"Payline {payLine.Id}: rule references unknown symbol ids: {string.Join(", ", unknown)}");
            }
        }

        return errors;
    }

    public void EnsureValid()
    {
        var errors = GetValidationErrors();
        if (errors.Count > 0)
            throw new ArgumentException($"Invalid slot configuration: {string.Join("; ", errors)}");
    }
}
