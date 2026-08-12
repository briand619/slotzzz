namespace SlotDesignAPI.Controllers;

using Microsoft.AspNetCore.Mvc;

/// <summary>
/// Serves the repository's example configurations to the designer UI, so the
/// examples stay in one place instead of being duplicated into wwwroot.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ExamplesController : ControllerBase
{
    private readonly string? _examplesDirectory;

    public ExamplesController(IWebHostEnvironment environment)
    {
        _examplesDirectory = FindExamplesDirectory(environment.ContentRootPath);
    }

    [HttpGet]
    public ActionResult<IEnumerable<string>> List()
    {
        if (_examplesDirectory == null)
            return Ok(Array.Empty<string>());

        var names = Directory.GetFiles(_examplesDirectory, "*.json")
            .Select(Path.GetFileName)
            .OrderBy(name => name)
            .ToArray();

        return Ok(names);
    }

    [HttpGet("{name}")]
    public ActionResult Get(string name)
    {
        if (_examplesDirectory == null)
            return NotFound(new { error = "No examples directory found" });

        // Only serve names that actually appear in the directory listing, so a
        // crafted name cannot escape the examples folder.
        var match = Directory.GetFiles(_examplesDirectory, "*.json")
            .FirstOrDefault(path => string.Equals(Path.GetFileName(path), name, StringComparison.Ordinal));

        if (match == null)
            return NotFound(new { error = $"No example named '{name}'" });

        return Content(System.IO.File.ReadAllText(match), "application/json");
    }

    /// <summary>Walks up from the content root looking for the repo's examples
    /// folder, so the UI works whether the API is run from the project
    /// directory or a published output.</summary>
    private static string? FindExamplesDirectory(string contentRoot)
    {
        var directory = new DirectoryInfo(contentRoot);

        for (int depth = 0; depth < 6 && directory != null; depth++, directory = directory.Parent)
        {
            var candidate = Path.Combine(directory.FullName, "examples");
            if (Directory.Exists(candidate))
                return candidate;
        }

        return null;
    }
}
