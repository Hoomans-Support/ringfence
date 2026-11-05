import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { atRiskRingSchema, type AtRiskRing } from "./at-risk-ring.js";
import { heldAccountSchema, type HeldAccount } from "./held-account.js";

export type AtRiskResult = {
  checked?: number;
  rings?: AtRiskRing[];
  held?: HeldAccount[];
};

export const atRiskResultSchema: Schema<AtRiskResult> = s.object<AtRiskResult>({
  checked: s.optional(s.int()),
  rings: s.optional(s.array(s.lazy(() => atRiskRingSchema))),
  held: s.optional(s.array(s.lazy(() => heldAccountSchema))),
});
