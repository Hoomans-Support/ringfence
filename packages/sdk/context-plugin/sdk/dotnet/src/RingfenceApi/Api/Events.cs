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
using RingfenceApi.Requests.Events;

namespace RingfenceApi.Api;

/// <summary>
/// Sign-up and referral events reported ahead of payday (FR-21, stretch)
/// </summary>
public sealed class Events
{
    private readonly RawClient _rawClient;
    private readonly Server _server;
    private readonly AuthSchemes _auth;

    internal Events(RawClient rawClient, Server server, AuthSchemes auth)
    {
        _rawClient = rawClient;
        _server = server;
        _auth = auth;
    }

    /// <summary>
    /// Score every pending (not yet paid) account with the same graph engine a real run uses
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="AtRiskResult"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="GetAtRiskAccountsError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Only <c>disposable_email</c> and the graph's own link signals (shared device/address, alias pattern, IP neighborhood) can fire pre-payday — timing-based risk flags need data that isn't known until closer to payday.
    /// </remarks>
    public Task<AtRiskResult> GetAtRiskAccounts(RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/events/at-risk"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<AtRiskResult>(),
            GetAtRiskAccountsError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Report a sign-up or referral event ahead of any payout run (FR-21, stretch)
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="Acknowledged"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RecordEventError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Merges into whatever this <c>account_id</c> already has rather than replacing it — a referral touch can arrive before the account's payout email is known. IP prefixes are hashed before storage, the same privacy guarantee a real run gets.
    /// </remarks>
    public Task<Acknowledged> RecordEvent(RecordEventRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/events"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<Acknowledged>(),
            RecordEventError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);
}
