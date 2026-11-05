using System.Threading.Tasks;
using RingfenceApi.Core.ErrorResponse;
using RingfenceApi.Core.Models;
using RingfenceApi.Models;

namespace RingfenceApi.Errors;

public sealed class ReceivePaypalWebhookError : ApiError
{
    private readonly Optional<WebhookRejected> _webhookRejectedValue;

    private ReceivePaypalWebhookError(Optional<WebhookRejected> webhookRejectedValue,
        Optional<RawError> fallback) : base(fallback)
    {
        _webhookRejectedValue = webhookRejectedValue;
    }

    private static ReceivePaypalWebhookError AsWebhookRejected(WebhookRejected value) =>
        new(Optional<WebhookRejected>.Some(value), default);

    private static ReceivePaypalWebhookError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetWebhookRejected(out WebhookRejected value) => _webhookRejectedValue.TryGetValue(out value);

    private static Task<ReceivePaypalWebhookError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            400 => response.Json<WebhookRejected>().As(AsWebhookRejected),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<ReceivePaypalWebhookError> Response { get; } = new(Create);
}
