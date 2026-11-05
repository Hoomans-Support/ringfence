using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Models;

public record ApproveRuleRequest
{
    [JsonPropertyName("approved_by")]
    [StringLength(255, MinimumLength = 1)]
    public required string ApprovedBy { get; init; }

    /// <summary>
    /// Required (true) to approve a rule that holds more than 5% of any past run.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("acknowledge_flags")]
    public bool? AcknowledgeFlags { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
