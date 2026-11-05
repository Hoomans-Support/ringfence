using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;
using RingfenceApi.Models.Enums;

namespace RingfenceApi.Models;

public record Rule
{
    [JsonPropertyName("id")]
    [RegularExpression("^[A-Z]-\\d{2,}$")]
    public required string Id { get; init; }

    [JsonPropertyName("action")]
    public required ActionEnum Action { get; init; }

    [JsonPropertyName("when")]
    public required RuleWhen When { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("source")]
    public string? Source { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
