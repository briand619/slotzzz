namespace SlotMathEngine.Models;

public record SymbolProbability(string SymbolId, decimal Probability);

public class SlotConfiguration
{
    public string Name { get; set; }
    public int NumReels { get; set; }

    /// <summary>Number of visible rows per reel. With more than one row, a spin
    /// stops each reel on a strip position and displays that stop plus the
    /// following NumRows−1 stops (wrapping), so rows on the same reel are
    /// correlated exactly like a physical reel. Requires explicit Reels strips,
    /// since strip order determines the windows. Defaults to 1.</summary>
    public int NumRows { get; set; } = 1;

    /// <summary>The symbol catalog. Symbol.Weight is used as the shared
    /// distribution for every reel when no explicit Reels are configured.</summary>
    public List<Symbol> Symbols { get; set; }

    /// <summary>Optional per-reel strips. When set, must contain exactly NumReels
    /// entries and overrides the shared Symbol weights; each reel then has its own
    /// symbol distribution. When null or empty, every reel uses the catalog weights.</summary>
    public List<ReelStrip>? Reels { get; set; }

    public Paytable Paytable { get; set; }

    /// <summary>Optional Lightning Link–style hold-and-spin bonus, triggered by
    /// coin symbols landing anywhere on the base-game grid.</summary>
    public HoldAndSpinFeature? HoldAndSpin { get; set; }

    /// <summary>Optional free-spins bonus, triggered by scatter-marked symbols
    /// landing anywhere on the base-game grid.</summary>
    public FreeSpinsFeature? FreeSpins { get; set; }

    public SlotConfiguration(string name, int numReels)
    {
        Name = name;
        NumReels = numReels;
        Symbols = new List<Symbol>();
        Paytable = new Paytable();
    }

    public bool HasExplicitReels => Reels is { Count: > 0 };

    /// <summary>
    /// The effective ordered strip of each reel — the single source of truth for
    /// reel behavior, used by both the exact analyzer and the simulator. A spin
    /// stops the reel on one stop (probability proportional to its weight) and
    /// the visible window is that stop plus the following NumRows−1 stops
    /// (wrapping). With explicit Reels, strips are returned as configured (order
    /// and duplicate stops preserved); otherwise every reel shares the symbol
    /// catalog as its strip, which is only meaningful for single-row games.
    /// </summary>
    public IReadOnlyList<IReadOnlyList<ReelStop>> GetEffectiveStrips()
    {
        if (HasExplicitReels)
            return Reels!.Select(reel => (IReadOnlyList<ReelStop>)reel.Stops).ToList();

        var shared = Symbols.Select(s => new ReelStop(s.Id, s.Weight)).ToList();
        return Enumerable.Repeat((IReadOnlyList<ReelStop>)shared, NumReels).ToList();
    }

    /// <summary>
    /// The symbol distribution of each reel: for reel r, the distinct symbols it
    /// can show with their probabilities (summing to 1), aggregated over the
    /// effective strip.
    /// </summary>
    public IReadOnlyList<IReadOnlyList<SymbolProbability>> GetReelDistributions()
    {
        return GetEffectiveStrips()
            .Select(strip =>
            {
                decimal totalWeight = strip.Sum(st => st.Weight);
                return (IReadOnlyList<SymbolProbability>)strip
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

        if (NumRows <= 0)
            errors.Add("Number of rows must be positive");

        if (NumRows > 1 && !HasExplicitReels)
            errors.Add("Multi-row grids require explicit per-reel strips, since strip order determines the visible windows");

        if (Symbols.Count == 0)
            errors.Add("Configuration must define at least one symbol");

        var duplicateIds = Symbols.GroupBy(s => s.Id).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
        if (duplicateIds.Count > 0)
            errors.Add($"Duplicate symbol ids: {string.Join(", ", duplicateIds)}");

        foreach (var symbol in Symbols.Where(s => s.IsWild && s.IsScatter))
            errors.Add($"Symbol '{symbol.Id}': cannot be both wild and scatter");

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

                if (NumRows > 1 && strip.Stops.Count < NumRows)
                    errors.Add($"Reel {r}: strip has {strip.Stops.Count} stops but the grid needs {NumRows} rows per window");

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

        foreach (var scatterRule in Paytable.ScatterRules)
        {
            var scatterSymbol = Symbols.FirstOrDefault(s => s.Id == scatterRule.SymbolId);
            if (scatterSymbol == null)
                errors.Add($"Scatter rule: references unknown symbol id '{scatterRule.SymbolId}'");
            else if (!scatterSymbol.IsScatter)
                errors.Add($"Scatter rule: symbol '{scatterRule.SymbolId}' is not marked as a scatter");

            int gridCells = NumReels * NumRows;
            if (scatterRule.Count < 1 || scatterRule.Count > gridCells)
                errors.Add($"Scatter rule for '{scatterRule.SymbolId}': count {scatterRule.Count} is outside the grid's range of 1 to {gridCells} cells");
        }

        if (HoldAndSpin != null)
        {
            var coinSymbol = Symbols.FirstOrDefault(s => s.Id == HoldAndSpin.CoinSymbolId);
            if (coinSymbol == null)
                errors.Add($"Hold-and-spin: references unknown coin symbol id '{HoldAndSpin.CoinSymbolId}'");
            else if (!coinSymbol.IsScatter)
                errors.Add($"Hold-and-spin: coin symbol '{HoldAndSpin.CoinSymbolId}' must be marked as a scatter (coins pay anywhere and wilds must not substitute for them)");

            int gridCells = NumReels * NumRows;
            if (HoldAndSpin.TriggerCount < 1 || HoldAndSpin.TriggerCount > gridCells)
                errors.Add($"Hold-and-spin: trigger count {HoldAndSpin.TriggerCount} is outside the grid's range of 1 to {gridCells} cells");

            if (HoldAndSpin.RespinCount < 1)
                errors.Add("Hold-and-spin: respin count must be at least 1");

            if (HoldAndSpin.CoinProbability < 0 || HoldAndSpin.CoinProbability > 1)
                errors.Add("Hold-and-spin: coin probability must be between 0 and 1");

            if (HoldAndSpin.CoinValues.Count == 0)
                errors.Add("Hold-and-spin: must define at least one coin value");
            else if (HoldAndSpin.CoinValues.Any(v => v.Value <= 0 || v.Weight <= 0))
                errors.Add("Hold-and-spin: all coin values and weights must be positive");

            if (HoldAndSpin.GrandMultiplier < 0)
                errors.Add("Hold-and-spin: grand multiplier cannot be negative");
        }

        if (FreeSpins != null)
        {
            var triggerSymbol = Symbols.FirstOrDefault(s => s.Id == FreeSpins.TriggerSymbolId);
            if (triggerSymbol == null)
                errors.Add($"Free spins: references unknown trigger symbol id '{FreeSpins.TriggerSymbolId}'");
            else if (!triggerSymbol.IsScatter)
                errors.Add($"Free spins: trigger symbol '{FreeSpins.TriggerSymbolId}' must be marked as a scatter (triggers count anywhere and wilds must not substitute for them)");

            int gridCells = NumReels * NumRows;
            if (FreeSpins.TriggerCount < 1 || FreeSpins.TriggerCount > gridCells)
                errors.Add($"Free spins: trigger count {FreeSpins.TriggerCount} is outside the grid's range of 1 to {gridCells} cells");

            if (FreeSpins.SpinsAwarded < 1)
                errors.Add("Free spins: spins awarded must be at least 1");

            if (FreeSpins.WinMultiplier <= 0)
                errors.Add("Free spins: win multiplier must be positive");
        }

        foreach (var payLine in Paytable.PayLines)
        {
            if (payLine.ReelPositions == null || payLine.ReelPositions.Count == 0)
            {
                errors.Add($"Payline {payLine.Id}: reel positions are missing");
                continue;
            }

            if (payLine.ReelPositions.Any(p => p < 0 || p >= NumReels))
                errors.Add($"Payline {payLine.Id}: reel positions must be between 0 and {NumReels - 1}");

            if (payLine.RowPositions != null)
            {
                if (payLine.RowPositions.Count != payLine.ReelPositions.Count)
                    errors.Add($"Payline {payLine.Id}: has {payLine.RowPositions.Count} row positions but {payLine.ReelPositions.Count} reel positions");

                if (payLine.RowPositions.Any(r => r < 0 || r >= NumRows))
                    errors.Add($"Payline {payLine.Id}: row positions must be between 0 and {NumRows - 1}");
            }

            int ruleCount = (payLine.Rules?.Count ?? 0) + (payLine.KindRules?.Count ?? 0);
            if (ruleCount == 0)
            {
                errors.Add($"Payline {payLine.Id}: must define at least one rule");
                continue;
            }

            foreach (var kindRule in payLine.KindRules ?? Enumerable.Empty<NOfAKindRule>())
            {
                if (kindRule.SymbolId == null || !symbolIds.Contains(kindRule.SymbolId))
                    errors.Add($"Payline {payLine.Id}: kind rule references unknown symbol id '{kindRule.SymbolId}'");

                if (kindRule.Count < 1 || kindRule.Count > payLine.ReelPositions.Count)
                    errors.Add($"Payline {payLine.Id}: kind rule count {kindRule.Count} is outside the line's range of 1 to {payLine.ReelPositions.Count} positions");
            }

            foreach (var rule in payLine.Rules ?? Enumerable.Empty<PayLineRule>())
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
