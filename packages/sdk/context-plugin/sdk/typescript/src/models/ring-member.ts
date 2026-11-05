import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type RingMember = {
  senderItemId?: string;
  /** Masked, never the real address */
  payee?: string;
  state?: string;
};

export const ringMemberSchema: Schema<RingMember> = s.object<RingMember>({
  senderItemId: s.optional(s.string()),
  payee: s.optional(s.string()),
  state: s.optional(s.string()),
  _keysMap: {
    senderItemId: "sender_item_id",
  },
});
