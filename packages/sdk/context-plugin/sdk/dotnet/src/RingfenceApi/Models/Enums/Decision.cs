using System;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Enum;

namespace RingfenceApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Decision>))]
public sealed record Decision : OpenStringEnum<Decision>
{
    private Decision(string value) : base(value)
    {
    }

    public static readonly Decision Pay = new("PAY");

    public static readonly Decision Hold = new("HOLD");

    public static readonly Decision Block = new("BLOCK");

    public TResult Match<TResult>(Func<TResult> onPay,
        Func<TResult> onHold,
        Func<TResult> onBlock,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Pay => onPay(),
            _ when this == Hold => onHold(),
            _ when this == Block => onBlock(),
            _ => otherwise(Value)
        };

    public void Match(Action onPay, Action onHold, Action onBlock, Action<string> otherwise)
    {
        if (this == Pay) onPay();
        else if (this == Hold) onHold();
        else if (this == Block) onBlock();
        else otherwise(Value);
    }
}
