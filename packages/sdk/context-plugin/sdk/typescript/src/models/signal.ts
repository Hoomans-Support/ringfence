import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/**
 * `network_match` also exists but is a fixed starter signal (S-03) only, never proposable — a
 * proposed rule naming it fails the schema check as an unknown signal.
 */
export const Signal = {
  SignupBurst: "signup_burst",
  OnboardingSeconds: "onboarding_seconds",
  ActivityAfterOnboarding: "activity_after_onboarding",
  DisposableEmail: "disposable_email",
  GraphCommunity: "graph_community",
  KnownFraud: "known_fraud",
} as const;
export type Signal = (typeof Signal)[keyof typeof Signal] | (string & {});

export const signalSchema: EnumSchema<Signal> = s.enumOf<Signal>(Signal);
