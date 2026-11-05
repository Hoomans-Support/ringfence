import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type WebhookAck = {
  ok?: boolean;
  outcome?: string;
};

export const webhookAckSchema: Schema<WebhookAck> = s.object<WebhookAck>({
  ok: s.optional(s.boolean()),
  outcome: s.optional(s.string()),
});
