import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** Ringfence's addition to PayPal's own Payouts item; stripped before the batch goes to PayPal. */
export type PayoutItemContext = {
  accountId?: string;
  signupAt?: Date;
  deviceHash?: string;
  ipPrefix?: string;
  referrerId?: string;
  answer?: string;
  /** Seconds from signup to finishing onboarding. <=120 is the "speed" risk flag. */
  onboardingSeconds?: number;
  /** Count of actions after onboarding finished. 0 is the "quiet" risk flag. */
  activityAfterOnboarding?: number;
};

export const payoutItemContextSchema: Schema<PayoutItemContext> = s.object<PayoutItemContext>({
  accountId: s.optional(s.string()),
  signupAt: s.optional(s.dateTime()),
  deviceHash: s.optional(s.string()),
  ipPrefix: s.optional(s.string()),
  referrerId: s.optional(s.string()),
  answer: s.optional(s.string()),
  onboardingSeconds: s.optional(s.float64()),
  activityAfterOnboarding: s.optional(s.int()),
  _keysMap: {
    accountId: "account_id",
    signupAt: "signup_at",
    deviceHash: "device_hash",
    ipPrefix: "ip_prefix",
    referrerId: "referrer_id",
    onboardingSeconds: "onboarding_seconds",
    activityAfterOnboarding: "activity_after_onboarding",
  },
});
