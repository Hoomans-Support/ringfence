import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type SenderBatchHeader = {
  senderBatchId: string;
  emailSubject?: string;
};

export const senderBatchHeaderSchema: Schema<SenderBatchHeader> = s.object<SenderBatchHeader>({
  senderBatchId: s.string(),
  emailSubject: s.optional(s.string()),
  _keysMap: {
    senderBatchId: "sender_batch_id",
    emailSubject: "email_subject",
  },
});
