using System.Threading;
using System.Threading.Tasks;
using RingfenceApi.Core.Models;

namespace RingfenceApi.Core.ErrorResponse;

internal interface IErrorResponse<TError>
{
    Task<TError> Map(ResponseContext context, CancellationToken cancellationToken);
}
