import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type ConfirmRingRequest = {
  runId: string;
  confirmedBy?: string;
};

export const confirmRingRequestSchema: Schema<ConfirmRingRequest> = s.object<ConfirmRingRequest>({
  runId: s.string(),
  confirmedBy: s.optional(s.string()),
  _keysMap: {
    runId: "run_id",
    confirmedBy: "confirmed_by",
  },
});
