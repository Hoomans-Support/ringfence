using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using RingfenceApi.Core.Models;
using RingfenceApi.Core.Validation;
using RingfenceApi.Core.Validation.Attributes;

namespace RingfenceApi.Models;

public record SignupEvent
{
    [JsonPropertyName("account_id")]
    [StringLength(128, MinimumLength = 1)]
    public required string AccountId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("receiver")]
    [MaxLength(127)]
    [Format(FormatKind.Email)]
    public string? Receiver { get; init; }

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

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("onboarding_seconds")]
    [Minimum(0.0)]
    public double? OnboardingSeconds { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
