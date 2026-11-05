using RingfenceApi.Models;

namespace RingfenceApi.Requests.Runs;

/// <summary>
/// The inputs of the ScreenPayees operation.
/// </summary>
public sealed record ScreenPayeesRequest
{
    public required RunRequest Body { get; init; }
}
