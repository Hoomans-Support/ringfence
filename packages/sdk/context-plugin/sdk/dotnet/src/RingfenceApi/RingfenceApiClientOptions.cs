using System;
using System.Collections.Generic;
using RingfenceApi.Core.Authentication;
using RingfenceApi.Core.Configuration;
using RingfenceApi.Core.Hooks;
using RingfenceApi.Servers;

namespace RingfenceApi;

public class RingfenceApiClientOptions
{
    public ServerEnvironment Environment { get; set; } = ServerEnvironment.Default();
    public RetryOptions Retry { get; set; } = RetryOptions.Default();
    public LoggingOptions Logging { get; set; } = new();
    public TimeProvider TimeProvider { get; set; } = TimeProvider.System;
    public ServerOptions Server { get; set; } = new();
    /// <summary>
    /// Maximum time to wait for the next frame of a streaming (SSE) response before the stream is
    /// torn down with a timeout. Bounds only the wait for the server between frames, never the
    /// caller's own processing time. Set to null to wait indefinitely.
    /// </summary>
    public TimeSpan? StreamReadTimeout { get; set; } = TimeSpan.FromSeconds(60);
    public IReadOnlyList<SdkHook> Hooks { get; set; } = [];
    /// <summary>
    /// A program's full API key, or its read-only MCP key for <c>GET</c> routes and <c>POST /v1/screen</c>.
    /// </summary>
    public string? BearerAuth { get; set; }
    public CredentialProvider<string>? BearerAuthProvider { get; set; }
    /// <summary>
    /// The deployment's <c>ADMIN_TOKEN</c>, unrelated to any program's key.
    /// </summary>
    public string? AdminBearerAuth { get; set; }
    public CredentialProvider<string>? AdminBearerAuthProvider { get; set; }
}
