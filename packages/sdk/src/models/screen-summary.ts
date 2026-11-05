import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type ScreenSummary = {
  pay?: number;
  hold?: number;
  block?: number;
};

export const screenSummarySchema: Schema<ScreenSummary> = s.object<ScreenSummary>({
  pay: s.optional(s.int()),
  hold: s.optional(s.int()),
  block: s.optional(s.int()),
});
