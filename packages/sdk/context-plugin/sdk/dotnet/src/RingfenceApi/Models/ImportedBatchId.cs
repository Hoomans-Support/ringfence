using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Models;

public record ImportedBatchId
{
    [JsonPropertyName("payout_batch_id")]
    [StringLength(64, MinimumLength = 1)]
    public required string PayoutBatchId { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
