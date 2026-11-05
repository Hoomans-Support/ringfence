import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { noneAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { errorSchema, type Error } from "../models/error.js";
import { webhookAckSchema, type WebhookAck } from "../models/webhook-ack.js";
import { webhookEventLogEntrySchema, type WebhookEventLogEntry } from "../models/webhook-event-log-entry.js";
import { webhookRejectedSchema, type WebhookRejected } from "../models/webhook-rejected.js";
import type { Servers } from "../servers.js";

/**
 * PayPal webhook delivery and its own verified-events log
 */
export class Webhooks {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * The last 20 verified webhook events
   *
   * @remarks
   * Guarded by a separate admin bearer token (`ADMIN_TOKEN`), not a program's API key. Answers 404
   * if no admin token is configured.
   *
   * @returns OK
   *
   * @throws {@link Webhooks.ListWebhookEventsError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  listWebhookEvents(
    options?: RequestOptions,
  ): ApiPromise<WebhookEventLogEntry[], Webhooks.ListWebhookEventsError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/v1/webhooks/events"),
        auth: this.#auth.adminBearerAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: s.array(s.lazy(() => webhookEventLogEntrySchema)) },
        errorFactory: Webhooks.ListWebhookEventsError,
      },
      options,
    );
  }

  /**
   * PayPal webhook delivery, signature-verified before anything changes
   *
   * @remarks
   * No API key — PayPal's own signature on the request is the authentication.
   *
   * @returns Verified (applied, or a recognized redelivery).
   *
   * @throws {@link Webhooks.ReceivePaypalWebhookError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  receivePaypalWebhook(
    request: Webhooks.ReceivePaypalWebhookRequest,
    options?: RequestOptions,
  ): ApiPromise<WebhookAck, Webhooks.ReceivePaypalWebhookError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/v1/webhooks/paypal"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: s.record(s.string(), s.unknown()) },
      },
      {
        success: { kind: "json", schema: webhookAckSchema },
        errorFactory: Webhooks.ReceivePaypalWebhookError,
      },
      options,
    );
  }
}

export namespace Webhooks {
  export class ListWebhookEventsError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Undeclared;

    static readonly errors: ErrorDecoders<ListWebhookEventsError> = [
      { on: 404, kind: "error", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type ReceivePaypalWebhookRequest = {
    body: Record<string, unknown>;
  };

  export class ReceivePaypalWebhookError extends ApiError {
    declare readonly payload: Declared<"webhookRejected", WebhookRejected> | Undeclared;

    static readonly errors: ErrorDecoders<ReceivePaypalWebhookError> = [
      { on: 400, kind: "webhookRejected", decode: { kind: "json", schema: webhookRejectedSchema } },
    ];
  }
}
