using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using RingfenceApi.Core;
using RingfenceApi.Core.Authentication;
using RingfenceApi.Core.Exceptions;
using RingfenceApi.Core.Models;
using RingfenceApi.Core.Request;
using RingfenceApi.Core.Response;
using RingfenceApi.Errors;
using RingfenceApi.Models;
using RingfenceApi.Requests.WebhooksApi;

namespace RingfenceApi.Api;

/// <summary>
/// PayPal webhook delivery and its own verified-events log
/// </summary>
public sealed class WebhooksApi
{
    private readonly RawClient _rawClient;
    private readonly Server _server;
    private readonly AuthSchemes _auth;

    internal WebhooksApi(RawClient rawClient, Server server, AuthSchemes auth)
    {
        _rawClient = rawClient;
        _server = server;
        _auth = auth;
    }

    /// <summary>
    /// The last 20 verified webhook events
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="IReadOnlyList{T}"/> of <see cref="WebhookEventLogEntry"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ListWebhookEventsError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Guarded by a separate admin bearer token (<c>ADMIN_TOKEN</c>), not a program's API key. Answers 404 if no admin token is configured.
    /// </remarks>
    public Task<IReadOnlyList<WebhookEventLogEntry>> ListWebhookEvents(RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/webhooks/events"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<IReadOnlyList<WebhookEventLogEntry>>(),
            ListWebhookEventsError.Response,
            _auth.AdminBearerAuth,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// PayPal webhook delivery, signature-verified before anything changes
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="WebhookAck"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="ReceivePaypalWebhookError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// No API key — PayPal's own signature on the request is the authentication.
    /// </remarks>
    public Task<WebhookAck> ReceivePaypalWebhook(ReceivePaypalWebhookRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/v1/webhooks/paypal"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<WebhookAck>(),
            ReceivePaypalWebhookError.Response,
            AuthScheme.None,
            requestOptions,
            cancellationToken);
}
