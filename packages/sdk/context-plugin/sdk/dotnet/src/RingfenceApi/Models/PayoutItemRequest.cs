using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;
using RingfenceApi.Core.Validation;
using RingfenceApi.Core.Validation.Attributes;

namespace RingfenceApi.Models;

public record PayoutItemRequest
{
    [JsonPropertyName("recipient_type")]
    public string RecipientType { get; } = "EMAIL";

    [JsonPropertyName("receiver")]
    [MaxLength(127)]
    [Format(FormatKind.Email)]
    public required string Receiver { get; init; }

    [JsonPropertyName("amount")]
    public required Money Amount { get; init; }

    [JsonPropertyName("sender_item_id")]
    [StringLength(63, MinimumLength = 1)]
    public required string SenderItemId { get; init; }

    /// <summary>
    /// Ringfence's addition to PayPal's own Payouts item; stripped before the batch goes to PayPal.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("context")]
    public PayoutItemContext? Context { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
