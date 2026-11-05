import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type HealthStatus = {
  ok?: boolean;
  sandbox?: boolean;
};

export const healthStatusSchema: Schema<HealthStatus> = s.object<HealthStatus>({
  ok: s.optional(s.boolean()),
  sandbox: s.optional(s.boolean()),
});
