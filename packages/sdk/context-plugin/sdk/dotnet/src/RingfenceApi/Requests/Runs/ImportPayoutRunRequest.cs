using RingfenceApi.Models;

namespace RingfenceApi.Requests.Runs;

/// <summary>
/// The inputs of the ImportPayoutRun operation.
/// </summary>
public sealed record ImportPayoutRunRequest
{
    public required ImportRunRequest Body { get; init; }
}
