import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** 200 disguised copies of the ring this rule came from, 50 of them held out. */
export type RedTeamResult = {
  variants?: number;
  caught?: number;
  heldOut?: number;
  heldOutCaught?: number;
  misses?: string[];
};

export const redTeamResultSchema: Schema<RedTeamResult> = s.object<RedTeamResult>({
  variants: s.optional(s.int()),
  caught: s.optional(s.int()),
  heldOut: s.optional(s.int()),
  heldOutCaught: s.optional(s.int()),
  misses: s.optional(s.array(s.string())),
  _keysMap: {
    heldOut: "held_out",
    heldOutCaught: "held_out_caught",
  },
});
