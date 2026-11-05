using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;
using RingfenceApi.Models.Enums;

namespace RingfenceApi.Models;

public record RuleCondition
{
    /// <summary>
    /// <c>network_match</c> also exists but is a fixed starter signal (S-03) only, never proposable — a proposed rule naming it fails the schema check as an unknown signal.
    /// </summary>
    [JsonPropertyName("signal")]
    public required Signal Signal { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("same")]
    public Same? Same { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("window_min")]
    public double? WindowMin { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("min_accounts")]
    public double? MinAccounts { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("max")]
    public double? Max { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("min")]
    public double? Min { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
