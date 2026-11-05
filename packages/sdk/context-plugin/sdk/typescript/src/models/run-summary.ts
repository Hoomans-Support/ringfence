import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type RunSummary = {
  paid?: number;
  held?: number;
  blocked?: number;
  paidUsd?: number;
  heldUsd?: number;
  blockedUsd?: number;
};

export const runSummarySchema: Schema<RunSummary> = s.object<RunSummary>({
  paid: s.optional(s.int()),
  held: s.optional(s.int()),
  blocked: s.optional(s.int()),
  paidUsd: s.optional(s.float64()),
  heldUsd: s.optional(s.float64()),
  blockedUsd: s.optional(s.float64()),
  _keysMap: {
    paidUsd: "paid_usd",
    heldUsd: "held_usd",
    blockedUsd: "blocked_usd",
  },
});
