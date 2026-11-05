import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { outcomeSchema, type Outcome } from "./outcome.js";

export type WebhookRejected = {
  ok?: boolean;
  outcome?: Outcome;
};

export const webhookRejectedSchema: Schema<WebhookRejected> = s.object<WebhookRejected>({
  ok: s.optional(s.boolean()),
  outcome: s.optional(s.lazy(() => outcomeSchema)),
});
