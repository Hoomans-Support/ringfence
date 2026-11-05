using RingfenceApi.Models;

namespace RingfenceApi.Requests.Runs;

/// <summary>
/// The inputs of the SubmitPayoutRun operation.
/// </summary>
public sealed record SubmitPayoutRunRequest
{
    public required RunRequest Body { get; init; }
}
