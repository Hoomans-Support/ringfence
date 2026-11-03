// Plain-English evidence labels for the engine's reason codes. The full case file ("each claim
// opens its evidence") is task 5 — this is just enough translation so the review queue reads as
// a sentence, not a snake_case dump, per design.md's voice rules.
const REASON_LABELS: Record<string, string> = {
  shared_payout_address: "shares a payout address with another account",
  alias_pattern: "email looks like a patterned alias",
  ip_neighborhood: "same network, signed up close together",
  onboarding_speed: "onboarded in under 2 minutes",
  quiet_after_onboarding: "no activity since onboarding",
  disposable_email: "disposable email domain",
};

export function prettifyReason(code: string): string {
  if (code.startsWith("shared_device:")) return "shares a device with another account";
  return REASON_LABELS[code] ?? code.replace(/_/g, " ");
}
