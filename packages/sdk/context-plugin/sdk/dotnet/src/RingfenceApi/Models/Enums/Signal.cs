using System;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Enum;

namespace RingfenceApi.Models.Enums;

/// <summary>
/// <c>network_match</c> also exists but is a fixed starter signal (S-03) only, never proposable — a proposed rule naming it fails the schema check as an unknown signal.
/// </summary>
[JsonConverter(typeof(StringEnumConverter<Signal>))]
public sealed record Signal : OpenStringEnum<Signal>
{
    private Signal(string value) : base(value)
    {
    }

    public static readonly Signal SignupBurst = new("signup_burst");

    public static readonly Signal OnboardingSeconds = new("onboarding_seconds");

    public static readonly Signal ActivityAfterOnboarding = new("activity_after_onboarding");

    public static readonly Signal DisposableEmail = new("disposable_email");

    public static readonly Signal GraphCommunity = new("graph_community");

    public static readonly Signal KnownFraud = new("known_fraud");

    public TResult Match<TResult>(Func<TResult> onSignupBurst,
        Func<TResult> onOnboardingSeconds,
        Func<TResult> onActivityAfterOnboarding,
        Func<TResult> onDisposableEmail,
        Func<TResult> onGraphCommunity,
        Func<TResult> onKnownFraud,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == SignupBurst => onSignupBurst(),
            _ when this == OnboardingSeconds => onOnboardingSeconds(),
            _ when this == ActivityAfterOnboarding => onActivityAfterOnboarding(),
            _ when this == DisposableEmail => onDisposableEmail(),
            _ when this == GraphCommunity => onGraphCommunity(),
            _ when this == KnownFraud => onKnownFraud(),
            _ => otherwise(Value)
        };

    public void Match(Action onSignupBurst,
        Action onOnboardingSeconds,
        Action onActivityAfterOnboarding,
        Action onDisposableEmail,
        Action onGraphCommunity,
        Action onKnownFraud,
        Action<string> otherwise)
    {
        if (this == SignupBurst) onSignupBurst();
        else if (this == OnboardingSeconds) onOnboardingSeconds();
        else if (this == ActivityAfterOnboarding) onActivityAfterOnboarding();
        else if (this == DisposableEmail) onDisposableEmail();
        else if (this == GraphCommunity) onGraphCommunity();
        else if (this == KnownFraud) onKnownFraud();
        else otherwise(Value);
    }
}
