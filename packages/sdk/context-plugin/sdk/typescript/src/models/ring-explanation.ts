import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { caseFileSchema, type CaseFile } from "./case-file.js";
import { ringMemberSchema, type RingMember } from "./ring-member.js";

export type RingExplanation = {
  ringId?: string;
  runId?: string;
  size?: number;
  reasons?: string[];
  rules?: string[];
  members?: RingMember[];
  caseFile?: CaseFile;
};

export const ringExplanationSchema: Schema<RingExplanation> = s.object<RingExplanation>({
  ringId: s.optional(s.string()),
  runId: s.optional(s.string()),
  size: s.optional(s.int()),
  reasons: s.optional(s.array(s.string())),
  rules: s.optional(s.array(s.string())),
  members: s.optional(s.array(s.lazy(() => ringMemberSchema))),
  caseFile: s.optional(s.lazy(() => caseFileSchema)),
  _keysMap: {
    ringId: "ring_id",
    runId: "run_id",
    caseFile: "case_file",
  },
});
