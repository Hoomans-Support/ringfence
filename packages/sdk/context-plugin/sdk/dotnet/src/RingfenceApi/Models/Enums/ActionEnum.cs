using System;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Enum;

namespace RingfenceApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<ActionEnum>))]
public sealed record ActionEnum : OpenStringEnum<ActionEnum>
{
    private ActionEnum(string value) : base(value)
    {
    }

    public static readonly ActionEnum Hold = new("HOLD");

    public static readonly ActionEnum Block = new("BLOCK");

    public TResult Match<TResult>(Func<TResult> onHold, Func<TResult> onBlock, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Hold => onHold(),
            _ when this == Block => onBlock(),
            _ => otherwise(Value)
        };

    public void Match(Action onHold, Action onBlock, Action<string> otherwise)
    {
        if (this == Hold) onHold();
        else if (this == Block) onBlock();
        else otherwise(Value);
    }
}
