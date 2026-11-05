import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { acknowledgedSchema, type Acknowledged } from "../models/acknowledged.js";
import { atRiskResultSchema, type AtRiskResult } from "../models/at-risk-result.js";
import { errorSchema, type Error } from "../models/error.js";
import { signupEventSchema, type SignupEvent } from "../models/signup-event.js";
import type { Servers } from "../servers.js";

/**
 * Sign-up and referral events reported ahead of payday (FR-21, stretch)
 */
export class Events {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Score every pending (not yet paid) account with the same graph engine a real run uses
   *
   * @remarks
   * Only `disposable_email` and the graph's own link signals (shared device/address, alias pattern,
   * IP neighborhood) can fire pre-payday — timing-based risk flags need data that isn't known until
   * closer to payday.
   *
   * @returns OK
   *
   * @throws {@link Events.GetAtRiskAccountsError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  getAtRiskAccounts(options?: RequestOptions): ApiPromise<AtRiskResult, Events.GetAtRiskAccountsError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/v1/events/at-risk"),
        auth: this.#auth.bearerAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: atRiskResultSchema },
        errorFactory: Events.GetAtRiskAccountsError,
      },
      options,
    );
  }

  /**
   * Report a sign-up or referral event ahead of any payout run (FR-21, stretch)
   *
   * @remarks
   * Merges into whatever this `account_id` already has rather than replacing it — a referral touch
   * can arrive before the account's payout email is known. IP prefixes are hashed before storage,
   * the same privacy guarantee a real run gets.
   *
   * @returns Recorded.
   *
   * @throws {@link Events.RecordEventError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  recordEvent(
    request: Events.RecordEventRequest,
    options?: RequestOptions,
  ): ApiPromise<Acknowledged, Events.RecordEventError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/v1/events"),
        auth: this.#auth.bearerAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: signupEventSchema },
      },
      {
        success: { kind: "json", schema: acknowledgedSchema },
        errorFactory: Events.RecordEventError,
      },
      options,
    );
  }
}

export namespace Events {
  export class GetAtRiskAccountsError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Undeclared;

    static readonly errors: ErrorDecoders<GetAtRiskAccountsError> = [
      { on: 401, kind: "error", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type RecordEventRequest = {
    body: SignupEvent;
  };

  export class RecordEventError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Declared<"error2", Error> | Undeclared;

    static readonly errors: ErrorDecoders<RecordEventError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 401, kind: "error2", decode: { kind: "json", schema: errorSchema } },
    ];
  }
}
