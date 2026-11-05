import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Money = {
  value: string;
  currency: string;
};

export const moneySchema: Schema<Money> = s.object<Money>({
  value: s.string(),
  currency: s.string(),
});
