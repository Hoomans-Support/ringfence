using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;
using RingfenceApi.Core.Validation.Attributes;

namespace RingfenceApi.Models;

/// <summary>
/// Ringfence's addition to PayPal's own Payouts item; stripped before the batch goes to PayPal.
/// </summary>
public record PayoutItemContext
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("account_id")]
    [MaxLength(128)]
    public string? AccountId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("signup_at")]
    public DateTimeOffset? SignupAt { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("device_hash")]
    [MaxLength(128)]
    public string? DeviceHash { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("ip_prefix")]
    [MaxLength(64)]
    public string? IpPrefix { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("referrer_id")]
    [MaxLength(128)]
    public string? ReferrerId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("answer")]
    [MaxLength(2000)]
    public string? Answer { get; init; }

    /// <summary>
    /// Seconds from signup to finishing onboarding. &lt;=120 is the "speed" risk flag.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("onboarding_seconds")]
    [Minimum(0.0)]
    public double? OnboardingSeconds { get; init; }

    /// <summary>
    /// Count of actions after onboarding finished. 0 is the "quiet" risk flag.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("activity_after_onboarding")]
    [Minimum(0)]
    public int? ActivityAfterOnboarding { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
