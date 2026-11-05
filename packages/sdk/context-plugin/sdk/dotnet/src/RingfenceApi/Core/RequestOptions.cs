using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using RingfenceApi.Core.Hooks;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Core;

public sealed record RequestOptions
{
    public LogLevel? LogLevel { get; init; }

    public IReadOnlyList<HeaderParam>? Headers { get; init; }

    public IReadOnlyList<SdkHook>? Hooks { get; init; }
}
