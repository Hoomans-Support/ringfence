using System;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Enum;

namespace RingfenceApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Status>))]
public sealed record Status : OpenStringEnum<Status>
{
    private Status(string value) : base(value)
    {
    }

    public static readonly Status Proposed = new("proposed");

    public static readonly Status Approved = new("approved");

    public TResult Match<TResult>(Func<TResult> onProposed,
        Func<TResult> onApproved,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Proposed => onProposed(),
            _ when this == Approved => onApproved(),
            _ => otherwise(Value)
        };

    public void Match(Action onProposed, Action onApproved, Action<string> otherwise)
    {
        if (this == Proposed) onProposed();
        else if (this == Approved) onApproved();
        else otherwise(Value);
    }
}
