using System.Net.Http;

namespace RingfenceApi.Core.Request;

internal interface IRequest
{
    HttpContent Get();

    bool CanRetry { get; }
}
