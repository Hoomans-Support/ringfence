import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Same = {
  Referrer: "referrer",
} as const;
export type Same = (typeof Same)[keyof typeof Same] | (string & {});

export const sameSchema: EnumSchema<Same> = s.enumOf<Same>(Same);
