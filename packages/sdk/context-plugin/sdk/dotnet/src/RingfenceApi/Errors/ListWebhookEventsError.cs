using System.Threading.Tasks;
using RingfenceApi.Core.ErrorResponse;
using RingfenceApi.Core.Models;
using RingfenceApi.Models;

namespace RingfenceApi.Errors;

public sealed class ListWebhookEventsError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private ListWebhookEventsError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static ListWebhookEventsError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static ListWebhookEventsError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<ListWebhookEventsError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            404 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<ListWebhookEventsError> Response { get; } = new(Create);
}
