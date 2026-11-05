using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Models;

public record SenderBatchHeader
{
    [JsonPropertyName("sender_batch_id")]
    [StringLength(100, MinimumLength = 1)]
    [RegularExpression("^[A-Za-z0-9_.:-]+$")]
    public required string SenderBatchId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("email_subject")]
    [MaxLength(255)]
    public string? EmailSubject { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
