import { maskEmail } from "@ringfence/engine";
import type { CaseFile, ClaimCheck } from "./types";
import { generateText, hasGeminiKey } from "./llm";
import type { SpendCap } from "./spend-cap";

export interface AnalystMoney { keptUsd: number; leakedUsd: number }
export type RingAnalystGenerator = (caseFile: CaseFile, money: AnalystMoney) => Promise<string>;
export interface RingAnalystOptions {
  generate?: RingAnalystGenerator;
  spendCap?: SpendCap;
}

const ESTIMATED_COST_PER_CALL_USD = 0.001;

function sanitizeCheck(check: ClaimCheck): ClaimCheck {
  return check.alias_key ? { ...check, alias_key: maskEmail(check.alias_key) } : check;
}

function sanitizeCaseFile(caseFile: CaseFile): CaseFile {
  return { ...caseFile, claims: caseFile.claims.map((claim) => ({ ...claim, check: sanitizeCheck(claim.check) })) };
}

function fallback(caseFile: CaseFile, money: AnalystMoney): string {
  const ringCaught = money.keptUsd > 0;
  return ringCaught
    ? `The evidence links ${caseFile.claims.length} checked signals to ${caseFile.ring_id}; ${money.keptUsd.toLocaleString("en-US")} dollars are held and ${money.leakedUsd.toLocaleString("en-US")} leaked. Confirm the ring before changing the hold.`
    : `The evidence for ${caseFile.ring_id} is limited and no ring-linked funds are held yet. Keep watching this case before changing payout decisions.`;
}

async function defaultGenerate(caseFile: CaseFile, money: AnalystMoney): Promise<string> {
  const prompt = [
    "Write one short plain-English paragraph for a human payout analyst.",
    "State the risk read, cite only checked evidence, and recommend exactly one next action: confirm, release, or keep watching.",
    "Do not expose raw email addresses or claim details beyond the supplied checks.",
    JSON.stringify({ ring_id: caseFile.ring_id, claims: caseFile.claims.filter((claim) => claim.checked).map((claim) => ({ text: claim.text, check: claim.check })), money }),
  ].join("\n");
  return (await generateText(prompt, { maxOutputTokens: 110, thinkingBudget: 0 })).trim();
}

/** A single, privacy-sanitized risk read and recommended action for the control tower. */
export async function summarizeForAnalyst(caseFile: CaseFile, money: AnalystMoney, options: RingAnalystOptions = {}): Promise<string> {
  if (!options.generate && !hasGeminiKey()) return fallback(caseFile, money);
  if (options.spendCap && !options.spendCap.canAfford(ESTIMATED_COST_PER_CALL_USD)) return fallback(caseFile, money);
  try {
    const text = await (options.generate ?? defaultGenerate)(sanitizeCaseFile(caseFile), money);
    if (!text.trim()) return fallback(caseFile, money);
    options.spendCap?.record(ESTIMATED_COST_PER_CALL_USD);
    return text.trim();
  } catch (err) {
    console.warn("summarizeForAnalyst: using scripted note —", err instanceof Error ? err.message : err);
    return fallback(caseFile, money);
  }
}
