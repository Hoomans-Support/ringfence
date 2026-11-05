namespace RingfenceApi.Requests.Holds;

/// <summary>
/// The inputs of the ExplainRing operation.
/// </summary>
public sealed record ExplainRingRequest
{
    /// <summary>
    /// A ring id (e.g. <c>R-01</c>), or any other hold group id (e.g. a learned rule's <c>R-07</c>, or a pair's <c>P-01</c>)
    /// </summary>
    public required string Id { get; init; }

    public required string RunId { get; init; }
}
