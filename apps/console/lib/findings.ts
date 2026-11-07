// "What we found" on a case: a ring's checked case-file claims (packages/agents), or, for every other
// case, the same kind of finding read straight off its accounts. Each finding pairs a plain sentence
// with the raw evidence behind it, shown in mono underneath.
import type { Claim } from "@ringfence/agents";
import type { DemoMember } from "@/app/demo-store";

export interface Finding {
  text: string;
  evidence: string;
}

/** The raw evidence one case-file claim was checked against (moved from the old ring page). */
export function claimEvidence(claim: Claim): string {
  const c = claim.check;
  switch (c.kind) {
    case "shared_device":
      return `DEVICE ${c.device_hash}`;
    case "signup_window":
      return `WITHIN ${c.window_minutes} MINUTES`;
    case "onboarding_speed":
      return `${c.max_onboarding_seconds} SECONDS OR LESS`;
    case "quiet_after_onboarding":
      return "0 ACTIONS AFTER";
    case "alias_pattern":
      return `PATTERN ${c.alias_key}`;
    case "shared_referrer":
      return `REFERRER ${c.referrer_id}`;
    default:
      return "";
  }
}

/** A device name mid-sentence: "one laptop", but "one Android phone" / "one iPhone" keep their brand. */
export const deviceNoun = (name: string | undefined) => (!name ? "device" : /^(Laptop|Device|Tablet)$/.test(name) ? name.toLowerCase() : name);

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
const range = (xs: number[], unit: string) => {
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return xs.length <= 2 ? xs.map((x) => `${x} ${unit}`).join(" · ") : lo === hi ? `${lo} ${unit}` : `${lo}–${hi} ${unit}`;
};

export function deriveFindings(members: DemoMember[]): Finding[] {
  const n = members.length;
  const all = n === 2 ? "Both" : "All";
  const out: Finding[] = [];
  const referrers = new Set(members.map((m) => m.referrer));
  const byDevice = new Map<string, DemoMember[]>();
  for (const m of members) byDevice.set(m.device, [...(byDevice.get(m.device) ?? []), m]);
  const shared = [...byDevice].filter(([, ms]) => ms.length > 1);
  const ips = [...new Set(members.map((m) => m.ipPrefix))];
  const sorted = [...members].sort((a, b) => Date.parse(a.signupAt) - Date.parse(b.signupAt));
  const spanMin = Math.round((Date.parse(sorted.at(-1)!.signupAt) - Date.parse(sorted[0]!.signupAt)) / 60_000);
  const quiet = members.every((m) => m.activity === 0);

  if (referrers.size === 1 && n > 2) out.push({ text: `${all} ${n} were referred by the same account`, evidence: `REFERRER ${members[0]!.referrer}` });
  if (shared.length === 1 && n === 2) {
    const [id, ms] = shared[0]!;
    out.push({ text: `Both signed in from one ${deviceNoun(ms[0]!.deviceName)}`, evidence: `${ms[0]!.deviceName ? `${ms[0]!.deviceName} · ` : ""}${id}` });
  } else if (shared.length > 0) {
    out.push({ text: `They signed up on ${shared.length} shared device${shared.length === 1 ? "" : "s"}`, evidence: shared.map(([id, ms]) => `${id} ×${ms.length}`).join(" · ") });
  } else if (n > 2) {
    out.push({ text: "Each used a different device", evidence: `${byDevice.size} DEVICES` });
  }
  if (n === 2) out.push({ text: `Signed up ${Math.round(spanMin / 60)} hours apart`, evidence: sorted.map((m) => time(m.signupAt)).join(" · ") });
  else if (spanMin < 120) out.push({ text: `${all} signed up within ${spanMin} minutes${ips.length === 1 ? ", on one network" : ""}`, evidence: `${time(sorted[0]!.signupAt)} → ${time(sorted.at(-1)!.signupAt)}${ips.length === 1 ? ` · ${ips[0]}` : ""}` });
  if (members.every((m) => m.onboardingSeconds < 120)) {
    out.push(quiet
      ? { text: "Each finished sign-up in under 2 minutes, then did nothing", evidence: `${range(members.map((m) => m.onboardingSeconds), "SECONDS")} · 0 ACTIONS AFTER` }
      : { text: `${all} finished sign-up in under 2 minutes`, evidence: range(members.map((m) => m.onboardingSeconds), "SECONDS") });
  }
  if (!quiet) out.push({ text: "But they kept using the app afterwards", evidence: range(members.map((m) => m.activity), "ACTIONS") });
  if (ips.length > 1 && ips.length <= 5) out.push({ text: "And they used different networks", evidence: ips.join(" · ") });
  return out;
}
