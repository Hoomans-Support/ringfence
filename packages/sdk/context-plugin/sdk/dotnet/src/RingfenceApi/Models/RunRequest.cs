using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Models;

public record RunRequest
{
    [JsonPropertyName("sender_batch_header")]
    public required SenderBatchHeader SenderBatchHeader { get; init; }

    [JsonPropertyName("items")]
    [MinLength(1)]
    [MaxLength(15000)]
    public required IReadOnlyList<PayoutItemRequest> Items { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
