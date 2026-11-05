import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type BacktestResult = {
  weeks?: number;
  caught?: number;
  usd?: number;
  falseHolds?: number;
};

export const backtestResultSchema: Schema<BacktestResult> = s.object<BacktestResult>({
  weeks: s.optional(s.int()),
  caught: s.optional(s.int()),
  usd: s.optional(s.float64()),
  falseHolds: s.optional(s.int()),
  _keysMap: {
    falseHolds: "false_holds",
  },
});
