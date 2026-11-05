using System;
using System.Collections.Generic;
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
using RingfenceApi.Requests.Rules;

namespace RingfenceApi.Api;

/// <summary>
/// Propose, backtest, red-team and approve learned rules
/// </summary>
public sealed class Rules
{
    private readonly RawClient _rawClient;
    private readonly Server _server;
    private readonly AuthSchemes _auth;

    internal Rules(RawClient rawClient, Server server, AuthSchemes auth)
    {
        _rawClient = rawClient;
        _server = server;
        _auth = auth;
    }

    /// <summary>
    /// Approve the latest proposed version of a rule
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="StoredRule"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ApproveRuleError"/> when the server returns an error response.</exception>
    public Task<StoredRule> ApproveRule(ApproveRuleOperationRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/rules/{id}/approve"),
            [new TemplateParam("id", request.Id)],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<StoredRule>(),
            ApproveRuleError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// List every proposed and approved learned rule
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="IReadOnlyList{T}"/> of <see cref="StoredRule"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ListRulesError"/> when the server returns an error response.</exception>
    public Task<IReadOnlyList<StoredRule>> ListRules(RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/rules"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<IReadOnlyList<StoredRule>>(),
            ListRulesError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Propose a rule (backtested and red-teamed on the way in)
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="StoredRule"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ProposeRuleError"/> when the server returns an error response.</exception>
    public Task<StoredRule> ProposeRule(ProposeRuleOperationRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/rules"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<StoredRule>(),
            ProposeRuleError.Response,
            _auth.BearerAuth,
            requestOptions,
            cancellationToken);
}
