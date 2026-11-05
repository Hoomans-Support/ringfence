import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Claim = {
  text?: string;
  evidence?: Record<string, unknown>;
};

export const claimSchema: Schema<Claim> = s.object<Claim>({
  text: s.optional(s.string()),
  evidence: s.optional(s.record(s.string(), s.unknown())),
});
