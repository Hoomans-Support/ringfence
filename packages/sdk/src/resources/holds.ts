import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { confirmRingRequestSchema, type ConfirmRingRequest } from "../models/confirm-ring-request.js";
import { confirmRingResponseSchema, type ConfirmRingResponse } from "../models/confirm-ring-response.js";
import { errorSchema, type Error } from "../models/error.js";
import { releaseRequestSchema, type ReleaseRequest } from "../models/release-request.js";
import { releaseResponseSchema, type ReleaseResponse } from "../models/release-response.js";
import { ringExplanationSchema, type RingExplanation } from "../models/ring-explanation.js";
import type { Servers } from "../servers.js";

/**
 * Release a held payee, or confirm a ring as fraud
 */
export class Holds {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Block a ring, remember its devices and addresses, cancel its earlier unclaimed payouts
   *
   * @remarks
   * The ring's devices and payout addresses also join this deployment's ring network as one-way
   * keyed hashes (FR-19), so another program can hold — never block — a repeat on first sight,
   * without ever seeing this program's raw data.
   *
   * @returns OK
   *
   * @throws {@link Holds.ConfirmRingError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  confirmRing(
    request: Holds.ConfirmRingRequestParams,
    options?: RequestOptions,
  ): ApiPromise<ConfirmRingResponse, Holds.ConfirmRingError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/v1/rings/{id}/confirm"),
        auth: this.#auth.bearerAuth,
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: confirmRingRequestSchema },
      },
      {
        success: { kind: "json", schema: confirmRingResponseSchema },
        errorFactory: Holds.ConfirmRingError,
      },
      options,
    );
  }

  /**
   * A held ring's reasons and checked case file
   *
   * @returns OK
   *
   * @throws {@link Holds.ExplainRingError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  explainRing(
    request: Holds.ExplainRingRequest,
    options?: RequestOptions,
  ): ApiPromise<RingExplanation, Holds.ExplainRingError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/v1/rings/{id}"),
        auth: this.#auth.bearerAuth,
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [{ name: "run_id", value: request.runId, schema: s.string() }],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: ringExplanationSchema },
        errorFactory: Holds.ExplainRingError,
      },
      options,
    );
  }

  /**
   * Pay held payees in a batch of their own
   *
   * @returns This release was already recorded; its batch is returned unchanged.
   *
   * @throws {@link Holds.ReleaseHoldsError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  releaseHolds(
    request: Holds.ReleaseHoldsRequest,
    options?: RequestOptions,
  ): ApiPromise<ReleaseResponse, Holds.ReleaseHoldsError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/v1/holds/release"),
        auth: this.#auth.bearerAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: releaseRequestSchema },
      },
      {
        success: { kind: "json", schema: releaseResponseSchema },
        errorFactory: Holds.ReleaseHoldsError,
      },
      options,
    );
  }
}

export namespace Holds {
  export type ConfirmRingRequestParams = {
    /**
     * A ring id (e.g. `R-01`), or any other hold group id (e.g. a learned rule's `R-07`, or a
     * pair's `P-01`)
     */
    id: string;
    body: ConfirmRingRequest;
  };

  export class ConfirmRingError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Declared<"error2", Error> | Undeclared;

    static readonly errors: ErrorDecoders<ConfirmRingError> = [
      { on: 401, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 404, kind: "error2", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type ExplainRingRequest = {
    /**
     * A ring id (e.g. `R-01`), or any other hold group id (e.g. a learned rule's `R-07`, or a
     * pair's `P-01`)
     */
    id: string;
    runId: string;
  };

  export class ExplainRingError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Declared<"error2", Error> | Undeclared;

    static readonly errors: ErrorDecoders<ExplainRingError> = [
      { on: 401, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 404, kind: "error2", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type ReleaseHoldsRequest = {
    body: ReleaseRequest;
  };

  export class ReleaseHoldsError extends ApiError {
    declare readonly payload:
      | Declared<"error", Error>
      | Declared<"error2", Error>
      | Declared<"error3", Error>
      | Undeclared;

    static readonly errors: ErrorDecoders<ReleaseHoldsError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 401, kind: "error2", decode: { kind: "json", schema: errorSchema } },
      { on: 409, kind: "error3", decode: { kind: "json", schema: errorSchema } },
    ];
  }
}
