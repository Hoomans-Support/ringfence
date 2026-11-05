using RingfenceApi.Models;

namespace RingfenceApi.Requests.Holds;

/// <summary>
/// The inputs of the ReleaseHolds operation.
/// </summary>
public sealed record ReleaseHoldsRequest
{
    public required ReleaseRequest Body { get; init; }
}
