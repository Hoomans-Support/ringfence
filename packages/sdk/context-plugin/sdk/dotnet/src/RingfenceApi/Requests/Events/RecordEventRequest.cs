using RingfenceApi.Models;

namespace RingfenceApi.Requests.Events;

/// <summary>
/// The inputs of the RecordEvent operation.
/// </summary>
public sealed record RecordEventRequest
{
    public required SignupEvent Body { get; init; }
}
