namespace RingfenceApi.Requests.WebhooksApi;

/// <summary>
/// The inputs of the ReceivePaypalWebhook operation.
/// </summary>
public sealed record ReceivePaypalWebhookRequest
{
    public required object Body { get; init; }
}
