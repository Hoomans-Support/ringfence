import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type HeldAccount = {
  accountId?: string;
  ringId?: string;
  holdGroupId?: string;
  reasons?: string[];
};

export const heldAccountSchema: Schema<HeldAccount> = s.object<HeldAccount>({
  accountId: s.optional(s.string()),
  ringId: s.optional(s.string()),
  holdGroupId: s.optional(s.string()),
  reasons: s.optional(s.array(s.string())),
  _keysMap: {
    accountId: "account_id",
    ringId: "ring_id",
    holdGroupId: "hold_group_id",
  },
});
