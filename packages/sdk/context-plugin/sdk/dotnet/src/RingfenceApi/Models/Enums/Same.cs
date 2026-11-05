using System;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Enum;

namespace RingfenceApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Same>))]
public sealed record Same : OpenStringEnum<Same>
{
    private Same(string value) : base(value)
    {
    }

    public static readonly Same Referrer = new("referrer");

    public TResult Match<TResult>(Func<TResult> onReferrer, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Referrer => onReferrer(),
            _ => otherwise(Value)
        };

    public void Match(Action onReferrer, Action<string> otherwise)
    {
        if (this == Referrer) onReferrer();
        else otherwise(Value);
    }
}
