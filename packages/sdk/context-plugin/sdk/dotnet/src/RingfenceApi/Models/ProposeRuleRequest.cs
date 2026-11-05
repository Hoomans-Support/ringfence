using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Models;

public record ProposeRuleRequest
{
    [JsonPropertyName("rule")]
    public required Rule Rule { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("source")]
    [MaxLength(255)]
    public string? Source { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
