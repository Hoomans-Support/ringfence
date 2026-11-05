using RingfenceApi.Models;

namespace RingfenceApi.Requests.Rules;

/// <summary>
/// The inputs of the ApproveRule operation.
/// </summary>
public sealed record ApproveRuleOperationRequest
{
    /// <summary>
    /// A rule id, e.g. <c>R-07</c>
    /// </summary>
    public required string Id { get; init; }

    public required ApproveRuleRequest Body { get; init; }
}
