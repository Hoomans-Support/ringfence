using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using RingfenceApi.Core;
using RingfenceApi.Core.Authentication;
using RingfenceApi.Core.ErrorResponse;
using RingfenceApi.Core.Exceptions;
using RingfenceApi.Core.Request;
using RingfenceApi.Core.Response;
using RingfenceApi.Models;

namespace RingfenceApi.Api;

/// <summary>
/// Liveness and health
/// </summary>
public sealed class SystemApi
{
    private readonly RawClient _rawClient;
    private readonly Server _server;

    internal SystemApi(RawClient rawClient, Server server)
    {
        _rawClient = rawClient;
        _server = server;
    }

    /// <summary>
    /// Liveness check
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="HealthStatus"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    public Task<HealthStatus> Health(RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/health"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<HealthStatus>(),
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);
}
