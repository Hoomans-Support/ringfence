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
using RingfenceApi.Requests.Holds;

namespace RingfenceApi.Api;

/// <summary>
/// Release a held payee, or confirm a ring as fraud
/// </summary>
public sealed class Holds
{
    private readonly RawClient _rawClient;
    private readonly Server _server;
    private readonly AuthSchemes _auth;

    internal Holds(RawClient rawClient, Server server, AuthSchemes auth)
    {
        _rawClient = rawClient;
        _server = server;
        _auth = auth;
    }

    /// <summary>
    /// Block a ring, remember its devices and addresses, cancel its earlier unclaimed payouts
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="ConfirmRingResponse"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ConfirmRingError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// The ring's devices and payout addresses also join this deployment's ring network as one-way keyed hashes (FR-19), so another program can hold — never block — a repeat on first sight, without ever seeing this program's raw data.
    /// </remarks>
    public Task<ConfirmRingResponse> ConfirmRing(ConfirmRingOperationRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/rings/{id}/confirm"),
            [new TemplateParam("id", request.Id)],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<ConfirmRingResponse>(),
            ConfirmRingError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// A held ring's reasons and checked case file
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="RingExplanation"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ExplainRingError"/> when the server returns an error response.</exception>
    public Task<RingExplanation> ExplainRing(ExplainRingRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/rings/{id}"),
            [new TemplateParam("id", request.Id)],
            [new Param("run_id", request.RunId)],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<RingExplanation>(),
            ExplainRingError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Pay held payees in a batch of their own
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="ReleaseResponse"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ReleaseHoldsError"/> when the server returns an error response.</exception>
    public Task<ReleaseResponse> ReleaseHolds(ReleaseHoldsRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/holds/release"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<ReleaseResponse>(),
            ReleaseHoldsError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);
}
