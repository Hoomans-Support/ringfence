import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { outcomeSchema, type Outcome } from "./outcome.js";

export type WebhookRejectedError = {
  ok?: boolean;
  outcome?: Outcome;
};

export const webhookRejectedErrorSchema: Schema<WebhookRejectedError> = s.object<WebhookRejectedError>({
  ok: s.optional(s.boolean()),
  outcome: s.optional(s.lazy(() => outcomeSchema)),
});
