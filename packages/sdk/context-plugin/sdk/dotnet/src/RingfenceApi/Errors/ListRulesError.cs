using System.Threading.Tasks;
using RingfenceApi.Core.ErrorResponse;
using RingfenceApi.Core.Models;
using RingfenceApi.Models;

namespace RingfenceApi.Errors;

public sealed class ListRulesError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private ListRulesError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static ListRulesError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static ListRulesError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<ListRulesError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            401 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<ListRulesError> Response { get; } = new(Create);
}
