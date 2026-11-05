using System.Threading.Tasks;
using RingfenceApi.Core.ErrorResponse;
using RingfenceApi.Core.Models;
using RingfenceApi.Models;

namespace RingfenceApi.Errors;

public sealed class SubmitPayoutRunError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private SubmitPayoutRunError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static SubmitPayoutRunError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static SubmitPayoutRunError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<SubmitPayoutRunError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            400 or 401 or 409 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<SubmitPayoutRunError> Response { get; } = new(Create);
}
