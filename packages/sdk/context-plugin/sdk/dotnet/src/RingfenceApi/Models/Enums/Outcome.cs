using System;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Enum;

namespace RingfenceApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Outcome>))]
public sealed record Outcome : OpenStringEnum<Outcome>
{
    private Outcome(string value) : base(value)
    {
    }

    public static readonly Outcome Unverified = new("unverified");

    public TResult Match<TResult>(Func<TResult> onUnverified, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Unverified => onUnverified(),
            _ => otherwise(Value)
        };

    public void Match(Action onUnverified, Action<string> otherwise)
    {
        if (this == Unverified) onUnverified();
        else otherwise(Value);
    }
}
