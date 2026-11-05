import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { moneySchema, type Money } from "./money.js";
import { payoutItemContextSchema, type PayoutItemContext } from "./payout-item-context.js";

export type PayoutItemRequest = {
  /** @default "EMAIL" */
  recipientType?: "EMAIL";
  receiver: string;
  amount: Money;
  senderItemId: string;
  /**
   * Ringfence's addition to PayPal's own Payouts item; stripped before the batch goes to PayPal.
   */
  context?: PayoutItemContext;
};

export const payoutItemRequestSchema: Schema<PayoutItemRequest> = s.object<PayoutItemRequest>({
  recipientType: s.defaulted(s.literal("EMAIL"), "EMAIL"),
  receiver: s.string(),
  amount: moneySchema,
  senderItemId: s.string(),
  context: s.optional(s.lazy(() => payoutItemContextSchema)),
  _keysMap: {
    recipientType: "recipient_type",
    senderItemId: "sender_item_id",
  },
});
