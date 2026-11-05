using RingfenceApi.Core;
using RingfenceApi.Core.Authentication;
using RingfenceApi.Core.Authentication.Bearer;

namespace RingfenceApi;

internal sealed class AuthSchemes
{
    public IAuthScheme BearerAuth { get; }
    public IAuthScheme AdminBearerAuth { get; }

    public AuthSchemes(RingfenceApiClientOptions options)
    {
        BearerAuth =
            BearerAuthScheme.Create(
                "BearerAuth",
                options.BearerAuthProvider,
                options.BearerAuth ?? EnvironmentVariables.Get("RINGFENCE_API_BEARER_AUTH"));
        AdminBearerAuth =
            BearerAuthScheme.Create(
                "AdminBearerAuth",
                options.AdminBearerAuthProvider,
                options.AdminBearerAuth ?? EnvironmentVariables.Get("RINGFENCE_API_ADMIN_BEARER_AUTH"));
    }
}
