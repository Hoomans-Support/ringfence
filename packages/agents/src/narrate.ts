/**
 * narrateClaims(caseFile) -> case file with LLM-rewritten claim prose. This is the real model seam
 * investigate.ts's module doc names ("same CaseFile shape, same checker downstream"): only a
 * claim's `text` ever changes here, never its `check` — checkClaims verifies `check` against real
 * data independently of this step, so a bad or missing model call can only make a claim read worse,
 * never make it pass a verification it shouldn't.
 *
 * One call per case file, not one per claim: free-tier model quotas run as low as 5 requests/minute
 * (confirmed against the real Gemini free tier), and a ring's case file can have 8+ claims - calling
 * per-claim blew that limit on a single page view. Batching means one ring detail page load costs
 * one call regardless of claim count.
 *
 * Fails safe on every edge: no API key configured, a network/model/parsing error, or the spend cap
 * being hit all fall back to the original scripted sentence(s) rather than breaking the page.
 *
 * Privacy: alias_key (ClaimCheck's one email-shaped field - see identity.ts's aliasPatternKey: a
 * normalized but still real-looking address, not a hash) is masked here, in narrateClaims itself,
 * before any generator - default or injected - ever sees it. That's deliberate: masking inside the
 * default Gemini call alone would leave a future swap to another provider's `generate` silently
 * unprotected. Matches the existing privacy boundary (see scripts/demo-generator/test/privacy.test.ts).
 */
import { maskEmail } from "@ringfence/engine";
import type { CaseFile, Claim, ClaimCheck } from "./types";
import { generateText, hasGeminiKey } from "./llm";
import type { SpendCap } from "./spend-cap";

/** Conservative placeholder cost per call, in case a provider without a free tier is swapped in. */
const ESTIMATED_COST_PER_CALL_USD = 0.001;

export type ClaimTextGenerator = (
  claims: { id: string; check: ClaimCheck }[],
  memberCount: number,
) => Promise<Record<string, string>>;

export interface NarrateOptions {
  /** Defaults to the real Gemini call. Inject a fake in tests, or to point at a different provider. */
  generate?: ClaimTextGenerator;
  /** Shared across calls so repeated demo runs in one process can't blow past the budget silently. */
  spendCap?: SpendCap;
}

/**
 * alias_key (ClaimCheck's one email-shaped field - see identity.ts's aliasPatternKey: a normalized
 * but still real-looking address, not a hash) must never reach an external model unmasked. Every
 * other field is already an internal id, a hash, or a number - see types.ts's ClaimCheck.
 */
function sanitizeForModel(check: ClaimCheck): ClaimCheck {
  return check.alias_key ? { ...check, alias_key: maskEmail(check.alias_key) } : check;
}

function promptFor(claims: { id: string; check: ClaimCheck }[], memberCount: number): string {
  return [
    "You are writing short, factual sentences for a fraud-review case file read by a human payout reviewer.",
    `There are ${memberCount} linked accounts in this ring. For each item below, write one sentence (under 20 words) describing only the evidence it gives, in plain English, with no speculation beyond it and no accusation of wrongdoing.`,
    "Respond with ONLY a JSON object mapping each id to its sentence, and nothing else - no markdown, no explanation:",
    JSON.stringify(Object.fromEntries(claims.map((c) => [c.id, c.check]))),
  ].join("\n");
}

async function defaultGenerate(
  claims: { id: string; check: ClaimCheck }[],
  memberCount: number,
): Promise<Record<string, string>> {
  const raw = await generateText(promptFor(claims, memberCount), {
    responseMimeType: "application/json",
    thinkingBudget: 0,
    maxOutputTokens: 60 * claims.length + 60,
  });
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object mapping claim id to sentence");
  }
  return parsed as Record<string, string>;
}

export async function narrateClaims(caseFile: CaseFile, options: NarrateOptions = {}): Promise<CaseFile> {
  if (!options.generate && !hasGeminiKey()) return caseFile;
  if (caseFile.claims.length === 0) return caseFile;

  const memberCount = new Set(caseFile.claims.flatMap((c) => c.check.account_ids)).size;
  const generate = options.generate ?? defaultGenerate;

  if (options.spendCap && !options.spendCap.canAfford(ESTIMATED_COST_PER_CALL_USD)) {
    console.warn("narrateClaims: falling back to scripted text — spend cap would be exceeded");
    return caseFile;
  }
  options.spendCap?.record(ESTIMATED_COST_PER_CALL_USD);

  const sanitizedClaims = caseFile.claims.map((c) => ({ id: c.id, check: sanitizeForModel(c.check) }));

  let rewritten: Record<string, string>;
  try {
    rewritten = await generate(sanitizedClaims, memberCount);
  } catch (err) {
    options.spendCap?.release(ESTIMATED_COST_PER_CALL_USD);
    // Never breaks the page over this - the scripted sentences are always a safe fallback - but a
    // silent catch with zero trace makes a real outage (bad key, quota, model rename) indistinguishable
    // from "working as designed, nothing to say." Server-side only; never touches the rendered page.
    console.warn("narrateClaims: falling back to scripted text —", err instanceof Error ? err.message : err);
    return caseFile;
  }

  const claims: Claim[] = caseFile.claims.map((c) => {
    const text = rewritten[c.id];
    return typeof text === "string" && text.trim() ? { ...c, text: text.trim() } : c;
  });
  return { ...caseFile, claims };
}
