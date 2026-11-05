using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Models;

public record PaypalBatchStatus
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("sender_batch_id")]
    public string? SenderBatchId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("payout_batch_id")]
    public string? PayoutBatchId { get; init; }

    /// <summary>
    /// PayPal's own status once sent; QUEUED or NOT_SENT before that.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("batch_status")]
    public string? BatchStatus { get; init; }

    /// <summary>
    /// PayPal's last refusal (e.g. INSUFFICIENT_FUNDS) while unsent
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("error")]
    public string? Error { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
