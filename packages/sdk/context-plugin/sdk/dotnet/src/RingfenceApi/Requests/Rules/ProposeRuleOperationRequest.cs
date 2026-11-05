using RingfenceApi.Models;

namespace RingfenceApi.Requests.Rules;

/// <summary>
/// The inputs of the ProposeRule operation.
/// </summary>
public sealed record ProposeRuleOperationRequest
{
    public required ProposeRuleRequest Body { get; init; }
}
