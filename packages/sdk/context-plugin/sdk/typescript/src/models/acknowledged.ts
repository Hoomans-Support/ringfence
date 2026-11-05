import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Acknowledged = {
  ok?: boolean;
};

export const acknowledgedSchema: Schema<Acknowledged> = s.object<Acknowledged>({
  ok: s.optional(s.boolean()),
});
