import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { claimSchema, type Claim } from "./claim.js";

export type CaseFile = {
  claimsChecked?: string;
  claims?: Claim[];
};

export const caseFileSchema: Schema<CaseFile> = s.object<CaseFile>({
  claimsChecked: s.optional(s.string()),
  claims: s.optional(s.array(s.lazy(() => claimSchema))),
  _keysMap: {
    claimsChecked: "claims_checked",
  },
});
