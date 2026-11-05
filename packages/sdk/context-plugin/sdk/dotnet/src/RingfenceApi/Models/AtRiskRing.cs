using System.Collections.Generic;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Models;

public record AtRiskRing
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("ring_id")]
    public string? RingId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("member_sender_item_ids")]
    public IReadOnlyList<string>? MemberSenderItemIds { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("size")]
    public int? Size { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("reasons")]
    public IReadOnlyList<string>? Reasons { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("louvain_clusters")]
    public int? LouvainClusters { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
