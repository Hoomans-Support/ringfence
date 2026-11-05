using System.Threading.Tasks;
using RingfenceApi.Core.ErrorResponse;
using RingfenceApi.Core.Models;
using RingfenceApi.Models;

namespace RingfenceApi.Errors;

public sealed class ExplainRingError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private ExplainRingError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static ExplainRingError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static ExplainRingError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<ExplainRingError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            401 or 404 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<ExplainRingError> Response { get; } = new(Create);
}
