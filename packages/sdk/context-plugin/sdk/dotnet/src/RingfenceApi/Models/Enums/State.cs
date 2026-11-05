using System;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Enum;

namespace RingfenceApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<State>))]
public sealed record State : OpenStringEnum<State>
{
    private State(string value) : base(value)
    {
    }

    public static readonly State Held = new("held");

    public static readonly State Blocked = new("blocked");

    public static readonly State Queued = new("queued");

    public static readonly State Sent = new("sent");

    public static readonly State Paid = new("paid");

    public static readonly State Unclaimed = new("unclaimed");

    public static readonly State Returned = new("returned");

    public static readonly State Failed = new("failed");

    public TResult Match<TResult>(Func<TResult> onHeld,
        Func<TResult> onBlocked,
        Func<TResult> onQueued,
        Func<TResult> onSent,
        Func<TResult> onPaid,
        Func<TResult> onUnclaimed,
        Func<TResult> onReturned,
        Func<TResult> onFailed,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Held => onHeld(),
            _ when this == Blocked => onBlocked(),
            _ when this == Queued => onQueued(),
            _ when this == Sent => onSent(),
            _ when this == Paid => onPaid(),
            _ when this == Unclaimed => onUnclaimed(),
            _ when this == Returned => onReturned(),
            _ when this == Failed => onFailed(),
            _ => otherwise(Value)
        };

    public void Match(Action onHeld,
        Action onBlocked,
        Action onQueued,
        Action onSent,
        Action onPaid,
        Action onUnclaimed,
        Action onReturned,
        Action onFailed,
        Action<string> otherwise)
    {
        if (this == Held) onHeld();
        else if (this == Blocked) onBlocked();
        else if (this == Queued) onQueued();
        else if (this == Sent) onSent();
        else if (this == Paid) onPaid();
        else if (this == Unclaimed) onUnclaimed();
        else if (this == Returned) onReturned();
        else if (this == Failed) onFailed();
        else otherwise(Value);
    }
}
