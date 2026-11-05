using System.Net.Http;
using RingfenceApi.Api;
using RingfenceApi.Core;
using RingfenceApi.Core.Configuration;
using RingfenceApi.Core.Logging;
using RingfenceApi.Core.Models;

namespace RingfenceApi;

/// <summary>
/// A drop-in for PayPal Payouts: accepts PayPal's own Payouts request body plus optional per-payee context, decides every payee (PAY, HOLD or BLOCK), and sends the paid ones to PayPal as one batch, exactly once. Every <c>/v1</c> route takes a program's API key as a bearer token; a program's read-only MCP key may only call <c>GET</c> routes and <c>POST /v1/screen</c>.
/// This spec covers the REST surface only. <c>POST /mcp</c> (the MCP server for AI agents — <c>screen_payees</c>, <c>explain_ring</c>) speaks the Model Context Protocol's own Streamable HTTP transport, not plain REST/JSON, and isn't represented here.
/// </summary>
public sealed class RingfenceApiClient
{
    private readonly RawClient _rawClient;
    private readonly Server _server;
    private readonly AuthSchemes _auth;

    public RingfenceApiClient(HttpClient httpClient, RingfenceApiClientOptions options)
    {
        _server = new Server(options.Environment, options.Server);
        var queryParameterFactory = new QueryParameterFactory([]);
        var templateParamsFactory = new TemplateParamsFactory([]);
        var urlFactory = new UriFactory(queryParameterFactory, templateParamsFactory);
        var httpStatusPolicy = new HttpStatusPolicy([]);
        var headersFactory = new HeadersFactory([
            new HeaderParam("User-Agent", "RingfenceApiClient/0.0.1 CSharp"),
            new HeaderParam("X-APIMatic-Lang", "CSharp"),
            new HeaderParam("X-APIMatic-Package-Version", "0.0.1"),
            new HeaderParam("X-APIMatic-Gen-Version", "4.0.0"),
            new HeaderParam("X-APIMatic-OS", RuntimeEnvironment.Os),
            new HeaderParam("X-APIMatic-Runtime", RuntimeEnvironment.Runtime),
        ]);
        var resiliencePipelineFactory = new ResiliencePipelineFactory(options.Retry, options.TimeProvider);
        var httpLogger = new HttpLogger(
            options.Logging.WithEnvironmentDefaults("RINGFENCE_API_LOG"),
            "RingfenceApiClient",
            options.TimeProvider);
        var responseContexts = new ResponseContextFactory(options.TimeProvider, options.StreamReadTimeout);
        _rawClient =
            new RawClient(
                httpClient,
                urlFactory,
                httpStatusPolicy,
                headersFactory,
                resiliencePipelineFactory,
                httpLogger,
                options.Hooks,
                responseContexts);
        _auth = new AuthSchemes(options);
    }

    /// <summary>
    /// Sign-up and referral events reported ahead of payday (FR-21, stretch)
    /// </summary>
    public Events Events => field ??= new Events(_rawClient, _server, _auth);

    /// <summary>
    /// Release a held payee, or confirm a ring as fraud
    /// </summary>
    public Holds Holds => field ??= new Holds(_rawClient, _server, _auth);

    /// <summary>
    /// Propose, backtest, red-team and approve learned rules
    /// </summary>
    public Rules Rules => field ??= new Rules(_rawClient, _server, _auth);

    /// <summary>
    /// Decide and send a payout run
    /// </summary>
    public Runs Runs => field ??= new Runs(_rawClient, _server, _auth);

    /// <summary>
    /// Liveness and health
    /// </summary>
    public SystemApi SystemApi => field ??= new SystemApi(_rawClient, _server);

    /// <summary>
    /// PayPal webhook delivery and its own verified-events log
    /// </summary>
    public WebhooksApi WebhooksApi => field ??= new WebhooksApi(_rawClient, _server, _auth);
}
