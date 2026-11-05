import { checkClaims, closeCaughtCases, investigate, recordOpenCases, redTeamRule, type ProposedRule } from "@ringfence/agents";
import { scoreRun, type PayoutRun } from "@ringfence/engine";
import type { GroundTruthLabel } from "./fixtures";

export function buildR12Learning(run: PayoutRun, truth: GroundTruthLabel[]) {
  const ringIds = new Set(truth.filter((label) => label.group === "ring" && label.ring_label === "R-12").map((label) => label.sender_item_id));
  const ring = scoreRun(run).rings
    .map((candidate) => ({ candidate, overlap: candidate.member_sender_item_ids.filter((id) => ringIds.has(id)).length }))
    .sort((a, b) => b.overlap - a.overlap)[0];
  if (!ring || ring.overlap < 3) return null;

  const caseFile = checkClaims(investigate(ring.candidate, run), run);
  const rule = redTeamRule(caseFile.proposed_rule);
  const openCases = recordOpenCases([], rule);
  const revisedBase: ProposedRule = openCases.length > 0
    ? investigate(ring.candidate, run, { openCases }).proposed_rule
    : rule;
  const revised = revisedBase.id !== rule.id ? redTeamRule(revisedBase) : null;
  const cases = revised ? closeCaughtCases(openCases, revised) : openCases;
  return {
    ring: ring.candidate,
    rule,
    revised,
    openCases,
    cases,
    closedCount: cases.filter((entry) => entry.status === "closed").length,
  };
}
