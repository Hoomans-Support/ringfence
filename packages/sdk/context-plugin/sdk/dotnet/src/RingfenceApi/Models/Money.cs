using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Models;

public record Money
{
    [JsonPropertyName("value")]
    [RegularExpression("^\\d{1,10}(\\.\\d{1,2})?$")]
    public required string Value { get; init; }

    [JsonPropertyName("currency")]
    [RegularExpression("^[A-Z]{3}$")]
    public required string Currency { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
