using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using RingfenceApi.Core;
using RingfenceApi.Core.Exceptions;
using RingfenceApi.Core.Models;
using RingfenceApi.Core.Request;
using RingfenceApi.Core.Response;
using RingfenceApi.Errors;
using RingfenceApi.Models;
using RingfenceApi.Requests.Runs;

namespace RingfenceApi.Api;

/// <summary>
/// Decide and send a payout run
/// </summary>
public sealed class Runs
{
    private readonly RawClient _rawClient;
    private readonly Server _server;
    private readonly AuthSchemes _auth;

    internal Runs(RawClient rawClient, Server server, AuthSchemes auth)
    {
        _rawClient = rawClient;
        _server = server;
        _auth = auth;
    }

    /// <summary>
    /// Read a run's decisions and PayPal batch status
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="RunResponse"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="GetPayoutRunError"/> when the server returns an error response.</exception>
    public Task<RunResponse> GetPayoutRun(GetPayoutRunRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/payout-runs/{id}"),
            [new TemplateParam("id", request.Id)],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<RunResponse>(),
            GetPayoutRunError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Record a run already paid straight through PayPal, so it's tracked and cancellable
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="RunResponse"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ImportPayoutRunError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Nothing is decided and nothing is sent; every item is recorded as already <c>sent</c>.
    /// </remarks>
    public Task<RunResponse> ImportPayoutRun(ImportPayoutRunRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/payout-runs/import"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<RunResponse>(),
            ImportPayoutRunError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// The decisions a run would get right now, with nothing stored or sent
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="ScreenResult"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ScreenPayeesError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// The same decision function <c>POST /v1/payout-runs</c> uses, so an AI agent that screens a list before paying it can't disagree with the real API. Available to the read-only MCP key as well as the full key.
    /// </remarks>
    public Task<ScreenResult> ScreenPayees(ScreenPayeesRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/screen"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<ScreenResult>(),
            ScreenPayeesError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Decide a run and send the paid payees to PayPal as one batch
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="RunResponse"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="SubmitPayoutRunError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Resending a run with the same <c>sender_batch_id</c> is a no-op: it returns what was decided the first time without deciding or sending anything again.
    /// </remarks>
    public Task<RunResponse> SubmitPayoutRun(SubmitPayoutRunRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/payout-runs"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<RunResponse>(),
            SubmitPayoutRunError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);
}
