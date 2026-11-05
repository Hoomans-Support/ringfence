namespace RingfenceApi.Requests.Runs;

/// <summary>
/// The inputs of the GetPayoutRun operation.
/// </summary>
public sealed record GetPayoutRunRequest
{
    /// <summary>
    /// A run's <c>sender_batch_id</c>
    /// </summary>
    public required string Id { get; init; }
}
