using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Models;

/// <summary>
/// Give <c>sender_item_ids</c>, <c>hold_group_id</c>, or both.
/// </summary>
public record ReleaseRequest
{
    [JsonPropertyName("run_id")]
    [MinLength(1)]
    public required string RunId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("sender_item_ids")]
    [MaxLength(15000)]
    public IReadOnlyList<string>? SenderItemIds { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("hold_group_id")]
    [MaxLength(63)]
    public string? HoldGroupId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("released_by")]
    [MaxLength(255)]
    public string? ReleasedBy { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
