import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type ConfirmRingResponse = {
  ringId?: string;
  blocked?: number;
  devices?: number;
  payoutAddresses?: number;
  cancelsQueued?: number;
  cancelUsd?: number;
};

export const confirmRingResponseSchema: Schema<ConfirmRingResponse> = s.object<ConfirmRingResponse>({
  ringId: s.optional(s.string()),
  blocked: s.optional(s.int()),
  devices: s.optional(s.int()),
  payoutAddresses: s.optional(s.int()),
  cancelsQueued: s.optional(s.int()),
  cancelUsd: s.optional(s.float64()),
  _keysMap: {
    ringId: "ring_id",
    payoutAddresses: "payout_addresses",
    cancelsQueued: "cancels_queued",
    cancelUsd: "cancel_usd",
  },
});
