/**
 * An in-memory PayPal Payouts that keeps the rules Ringfence's money-safety depends on, so tests
 * and coding agents never touch the shared sandbox (PRD: "Mock first"):
 *
 * - PayPal-Request-Id replay returns the original response; a reused sender_batch_id under a new
 *   request id is rejected with a link to the original batch (Payouts v1 spec).
 * - Items start PENDING and settle the first time their batch is read: SUCCESS, or UNCLAIMED for
 *   a receiver that has no PayPal account (`isUnclaimed`).
 * - Only UNCLAIMED items cancel, and come back RETURNED; a second cancel is ITEM_ALREADY_CANCELLED.
 * - PayPal's sandbox test IDs (POSPOI002, ERRPYO007-009 on cancel, ERRPYOB001-004 on get batch)
 *   answer the way the sandbox documents, so the cancel flow can be driven by them on screen.
 * - Every status change emits a PAYMENT.PAYOUTS-ITEM.* event, signed so `verifyWebhook` accepts
 *   it and rejects anything tampered with.
 *
 * `paidCounts()` is the chaos test's ledger: how many times PayPal accepted each sender_item_id.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ITEM_EVENT_SUFFIX,
  PayPalError,
  type BatchStatus,
  type CreateBatchResult,
  type ItemStatus,
  type PayoutBatch,
  type PayoutBatchRequest,
  type PayoutItemDetails,
  type PayPalClient,
  type WebhookHeaders,
} from "./types";
import { recoverDuplicate } from "./real";

export interface WebhookEvent {
  id: string;
  event_type: string;
  create_time: string;
  resource_type: "payouts_item";
  resource: PayoutItemDetails;
}

export interface MockOptions {
  /** Receivers with no PayPal account; their items settle UNCLAIMED. */
  isUnclaimed?: (receiver: string) => boolean;
  webhookSecret?: string;
}

const SANDBOX_BATCH_STATUS: Record<string, BatchStatus> = {
  ERRPYOB001: "SUCCESS",
  ERRPYOB002: "PENDING",
  ERRPYOB003: "PROCESSING",
  ERRPYOB004: "DENIED",
};

const SANDBOX_CANCEL_ERRORS: Record<string, string> = {
  ERRPYO007: "ITEM_ALREADY_CANCELLED",
  ERRPYO008: "ITEM_CANCELLATION_FAILED",
  ERRPYO009: "ITEM_INCORRECT_STATUS",
};

const MAX_ITEMS = 15_000;
const MAX_SENDER_ITEM_ID = 63;

interface MockBatch {
  status: BatchStatus;
  senderBatchId: string;
  itemIds: string[];
}

export class MockPayPal implements PayPalClient {
  private readonly batches = new Map<string, MockBatch>();
  private readonly items = new Map<string, PayoutItemDetails>();
  private readonly bySenderBatchId = new Map<string, string>();
  private readonly byRequestId = new Map<string, CreateBatchResult>();
  private readonly paid = new Map<string, number>();
  private counter = 0;
  readonly events: WebhookEvent[] = [];
  /** Called for every emitted event (the mock server uses it to deliver webhooks). */
  readonly listeners: Array<(event: WebhookEvent) => void> = [];
  readonly secret: string;

  constructor(private readonly opts: MockOptions = {}) {
    this.secret = opts.webhookSecret ?? "mock-webhook-secret";
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}${String(this.counter).padStart(10, "0")}`;
  }

  async createBatch(body: PayoutBatchRequest, requestId: string): Promise<CreateBatchResult> {
    try {
      return await this.acceptBatch(body, requestId);
    } catch (err) {
      return recoverDuplicate(err, (id) => this.getBatch(id));
    }
  }

  /** PayPal's raw create: a reused sender_batch_id throws, as the HTTP API does. The mock server
   *  serves this one, so the real client's own recovery path is what gets exercised over HTTP. */
  async acceptBatch(body: PayoutBatchRequest, requestId: string): Promise<CreateBatchResult> {
    const replay = this.byRequestId.get(requestId);
    if (replay) return { ...replay };

    const senderBatchId = body.sender_batch_header.sender_batch_id;
    const original = this.bySenderBatchId.get(senderBatchId);
    if (original) {
      throw new PayPalError(400, "USER_BUSINESS_ERROR", `Batch with given sender_batch_id ${senderBatchId} already exists`, [
        { href: `https://api-m.sandbox.paypal.com/v1/payments/payouts/${original}`, rel: "self" },
      ]);
    }
    if (body.items.length === 0 || body.items.length > MAX_ITEMS) {
      throw new PayPalError(400, "VALIDATION_ERROR", `items must hold 1 to ${MAX_ITEMS} payouts`);
    }
    for (const item of body.items) {
      if (item.sender_item_id.length > MAX_SENDER_ITEM_ID) {
        throw new PayPalError(400, "VALIDATION_ERROR", `sender_item_id longer than ${MAX_SENDER_ITEM_ID} characters`);
      }
      if (!item.receiver.includes("@")) throw new PayPalError(400, "INVALID_EMAIL", `bad receiver ${item.receiver}`);
    }

    const payoutBatchId = this.nextId("MOCKB");
    const itemIds = body.items.map((item) => {
      const payoutItemId = this.nextId("MOCKI");
      this.items.set(payoutItemId, {
        payout_item_id: payoutItemId,
        payout_batch_id: payoutBatchId,
        transaction_status: "PENDING",
        sender_batch_id: senderBatchId,
        payout_item: { sender_item_id: item.sender_item_id, receiver: item.receiver, amount: { ...item.amount }, note: item.note },
      });
      this.paid.set(item.sender_item_id, (this.paid.get(item.sender_item_id) ?? 0) + 1);
      return payoutItemId;
    });
    this.batches.set(payoutBatchId, { status: "PENDING", senderBatchId, itemIds });
    this.bySenderBatchId.set(senderBatchId, payoutBatchId);

    const result: CreateBatchResult = { payout_batch_id: payoutBatchId, batch_status: "PENDING" };
    this.byRequestId.set(requestId, result);
    return { ...result };
  }

  async getBatch(payoutBatchId: string): Promise<PayoutBatch> {
    const testStatus = SANDBOX_BATCH_STATUS[payoutBatchId];
    if (testStatus) {
      return { batch_header: { payout_batch_id: payoutBatchId, batch_status: testStatus, sender_batch_header: { sender_batch_id: "sandbox_test" } }, items: [] };
    }
    const batch = this.batches.get(payoutBatchId);
    if (!batch) throw new PayPalError(404, "INVALID_RESOURCE_ID", `No batch ${payoutBatchId}`);
    if (batch.status === "PENDING") this.settle(batch);
    return {
      batch_header: { payout_batch_id: payoutBatchId, batch_status: batch.status, sender_batch_header: { sender_batch_id: batch.senderBatchId } },
      items: batch.itemIds.map((id) => this.copy(id)),
    };
  }

  async getItem(payoutItemId: string): Promise<PayoutItemDetails> {
    if (!this.items.has(payoutItemId)) throw new PayPalError(404, "INVALID_RESOURCE_ID", `No item ${payoutItemId}`);
    return this.copy(payoutItemId);
  }

  async cancelItem(payoutItemId: string): Promise<PayoutItemDetails> {
    if (payoutItemId === "POSPOI002") {
      return {
        payout_item_id: payoutItemId,
        payout_batch_id: "SANDBOXTEST",
        transaction_status: "RETURNED",
        payout_item: { sender_item_id: "sandbox_test", receiver: "sandbox@example.test", amount: { value: "20.00", currency: "USD" } },
      };
    }
    const testError = SANDBOX_CANCEL_ERRORS[payoutItemId];
    if (testError) throw new PayPalError(400, testError, `sandbox test value ${payoutItemId}`);

    const item = this.items.get(payoutItemId);
    if (!item) throw new PayPalError(404, "INVALID_RESOURCE_ID", `No item ${payoutItemId}`);
    if (item.transaction_status === "RETURNED") throw new PayPalError(400, "ITEM_ALREADY_CANCELLED", "Item already cancelled");
    if (item.transaction_status !== "UNCLAIMED") throw new PayPalError(400, "ITEM_INCORRECT_STATUS", `Item is ${item.transaction_status}`);
    item.transaction_status = "RETURNED";
    this.emit("PAYMENT.PAYOUTS-ITEM.CANCELED", item);
    return this.copy(payoutItemId);
  }

  async verifyWebhook(headers: WebhookHeaders, rawBody: string): Promise<boolean> {
    const given = headers["paypal-transmission-sig"];
    const sig = Array.isArray(given) ? given[0] : given;
    if (!sig) return false;
    const expected = Buffer.from(this.sign(rawBody));
    const actual = Buffer.from(sig);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  sign(rawBody: string): string {
    return createHmac("sha256", this.secret).update(rawBody).digest("hex");
  }

  /** The headers and raw body PayPal would POST for `event`, signed. */
  signedWebhook(event: WebhookEvent): { headers: Record<string, string>; body: string } {
    const body = JSON.stringify(event);
    return {
      body,
      headers: {
        "content-type": "application/json",
        "paypal-auth-algo": "MOCK-HMAC-SHA256",
        "paypal-cert-url": "mock",
        "paypal-transmission-id": event.id,
        "paypal-transmission-time": event.create_time,
        "paypal-transmission-sig": this.sign(body),
      },
    };
  }

  /** Every payout item PayPal holds, in creation order: the chaos CLI's ground truth. */
  ledger(): PayoutItemDetails[] {
    return [...this.items.keys()].map((id) => this.copy(id));
  }

  /** sender_item_id -> how many PayPal items were created for it. More than 1 is a double payment. */
  paidCounts(): Map<string, number> {
    return new Map(this.paid);
  }

  private settle(batch: MockBatch): void {
    for (const id of batch.itemIds) {
      const item = this.items.get(id);
      if (!item || item.transaction_status !== "PENDING") continue;
      const next: ItemStatus = this.opts.isUnclaimed?.(item.payout_item.receiver) ? "UNCLAIMED" : "SUCCESS";
      item.transaction_status = next;
      this.emit(`PAYMENT.PAYOUTS-ITEM.${ITEM_EVENT_SUFFIX[next]}`, item);
    }
    batch.status = "SUCCESS";
  }

  private emit(eventType: string, item: PayoutItemDetails): void {
    const event: WebhookEvent = {
      id: this.nextId("WH-MOCK-"),
      event_type: eventType,
      create_time: new Date().toISOString(),
      resource_type: "payouts_item",
      resource: structuredClone(item),
    };
    this.events.push(event);
    for (const listener of this.listeners) listener(event);
  }

  private copy(payoutItemId: string): PayoutItemDetails {
    return structuredClone(this.items.get(payoutItemId) as PayoutItemDetails);
  }
}
