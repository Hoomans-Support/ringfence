using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;
using RingfenceApi.Models.Enums;

namespace RingfenceApi.Models;

public record WebhookRejected
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("ok")]
    public bool? Ok { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("outcome")]
    public Outcome? Outcome { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
