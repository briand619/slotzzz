using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace UsedGoodsTracker.Core.Ebay;

/// <summary>
/// Fetches and caches an eBay application access token via the OAuth2 client-credentials grant.
/// This scope only permits reads against the public Browse API, no user data access.
/// </summary>
public class EbayAuthClient(HttpClient httpClient, IOptions<EbayOptions> options)
{
    private readonly EbayOptions _options = options.Value;
    private CachedToken? _cached;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken = default)
    {
        if (_cached is { } cached && cached.ExpiresAt > DateTimeOffset.UtcNow.AddMinutes(1))
        {
            return cached.AccessToken;
        }

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_cached is { } stillCached && stillCached.ExpiresAt > DateTimeOffset.UtcNow.AddMinutes(1))
            {
                return stillCached.AccessToken;
            }

            var credentials = Convert.ToBase64String(
                System.Text.Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}"));

            using var request = new HttpRequestMessage(
                HttpMethod.Post, $"{_options.AuthBaseUrl}/identity/v1/oauth2/token")
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "client_credentials",
                    ["scope"] = "https://api.ebay.com/oauth/api_scope",
                }),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            using var response = await httpClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            var token = await response.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken)
                ?? throw new InvalidOperationException("eBay token endpoint returned an empty response.");

            _cached = new CachedToken(token.AccessToken, DateTimeOffset.UtcNow.AddSeconds(token.ExpiresIn));
            return _cached.AccessToken;
        }
        finally
        {
            _lock.Release();
        }
    }

    private record CachedToken(string AccessToken, DateTimeOffset ExpiresAt);

    private class TokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = "";

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
    }
}
