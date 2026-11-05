import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type SignupEvent = {
  accountId: string;
  receiver?: string;
  signupAt?: Date;
  deviceHash?: string;
  ipPrefix?: string;
  referrerId?: string;
  answer?: string;
  onboardingSeconds?: number;
};

export const signupEventSchema: Schema<SignupEvent> = s.object<SignupEvent>({
  accountId: s.string(),
  receiver: s.optional(s.string()),
  signupAt: s.optional(s.dateTime()),
  deviceHash: s.optional(s.string()),
  ipPrefix: s.optional(s.string()),
  referrerId: s.optional(s.string()),
  answer: s.optional(s.string()),
  onboardingSeconds: s.optional(s.float64()),
  _keysMap: {
    accountId: "account_id",
    signupAt: "signup_at",
    deviceHash: "device_hash",
    ipPrefix: "ip_prefix",
    referrerId: "referrer_id",
    onboardingSeconds: "onboarding_seconds",
  },
});
