import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { errorSchema, type Error } from "../models/error.js";
import { importRunRequestSchema, type ImportRunRequest } from "../models/import-run-request.js";
import { runRequestSchema, type RunRequest } from "../models/run-request.js";
import { runResponseSchema, type RunResponse } from "../models/run-response.js";
import { screenResultSchema, type ScreenResult } from "../models/screen-result.js";
import type { Servers } from "../servers.js";

/**
 * Decide and send a payout run
 */
export class Runs {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Read a run's decisions and PayPal batch status
   *
   * @returns OK
   *
   * @throws {@link Runs.GetPayoutRunError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  getPayoutRun(
    request: Runs.GetPayoutRunRequest,
    options?: RequestOptions,
  ): ApiPromise<RunResponse, Runs.GetPayoutRunError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/v1/payout-runs/{id}"),
        auth: this.#auth.bearerAuth,
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: runResponseSchema },
        errorFactory: Runs.GetPayoutRunError,
      },
      options,
    );
  }

  /**
   * Record a run already paid straight through PayPal, so it's tracked and cancellable
   *
   * @remarks
   * Nothing is decided and nothing is sent; every item is recorded as already `sent`.
   *
   * @returns Already recorded.
   *
   * @throws {@link Runs.ImportPayoutRunError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  importPayoutRun(
    request: Runs.ImportPayoutRunRequest,
    options?: RequestOptions,
  ): ApiPromise<RunResponse, Runs.ImportPayoutRunError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/v1/payout-runs/import"),
        auth: this.#auth.bearerAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: importRunRequestSchema },
      },
      {
        success: { kind: "json", schema: runResponseSchema },
        errorFactory: Runs.ImportPayoutRunError,
      },
      options,
    );
  }

  /**
   * The decisions a run would get right now, with nothing stored or sent
   *
   * @remarks
   * The same decision function `POST /v1/payout-runs` uses, so an AI agent that screens a list
   * before paying it can't disagree with the real API. Available to the read-only MCP key as well
   * as the full key.
   *
   * @returns OK
   *
   * @throws {@link Runs.ScreenPayeesError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  screenPayees(
    request: Runs.ScreenPayeesRequest,
    options?: RequestOptions,
  ): ApiPromise<ScreenResult, Runs.ScreenPayeesError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/v1/screen"),
        auth: this.#auth.bearerAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: runRequestSchema },
      },
      {
        success: { kind: "json", schema: screenResultSchema },
        errorFactory: Runs.ScreenPayeesError,
      },
      options,
    );
  }

  /**
   * Decide a run and send the paid payees to PayPal as one batch
   *
   * @remarks
   * Resending a run with the same `sender_batch_id` is a no-op: it returns what was decided the
   * first time without deciding or sending anything again.
   *
   * @returns This run's `sender_batch_id` was already recorded; nothing new happened.
   *
   * @throws {@link Runs.SubmitPayoutRunError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  submitPayoutRun(
    request: Runs.SubmitPayoutRunRequest,
    options?: RequestOptions,
  ): ApiPromise<RunResponse, Runs.SubmitPayoutRunError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/v1/payout-runs"),
        auth: this.#auth.bearerAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: runRequestSchema },
      },
      {
        success: { kind: "json", schema: runResponseSchema },
        errorFactory: Runs.SubmitPayoutRunError,
      },
      options,
    );
  }
}

export namespace Runs {
  export type GetPayoutRunRequest = {
    /** A run's `sender_batch_id` */
    id: string;
  };

  export class GetPayoutRunError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Declared<"error2", Error> | Undeclared;

    static readonly errors: ErrorDecoders<GetPayoutRunError> = [
      { on: 401, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 404, kind: "error2", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type ImportPayoutRunRequest = {
    body: ImportRunRequest;
  };

  export class ImportPayoutRunError extends ApiError {
    declare readonly payload:
      | Declared<"error", Error>
      | Declared<"error2", Error>
      | Declared<"error3", Error>
      | Undeclared;

    static readonly errors: ErrorDecoders<ImportPayoutRunError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 401, kind: "error2", decode: { kind: "json", schema: errorSchema } },
      { on: 409, kind: "error3", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type ScreenPayeesRequest = {
    body: RunRequest;
  };

  export class ScreenPayeesError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Declared<"error2", Error> | Undeclared;

    static readonly errors: ErrorDecoders<ScreenPayeesError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 401, kind: "error2", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type SubmitPayoutRunRequest = {
    body: RunRequest;
  };

  export class SubmitPayoutRunError extends ApiError {
    declare readonly payload:
      | Declared<"error", Error>
      | Declared<"error2", Error>
      | Declared<"error3", Error>
      | Undeclared;

    static readonly errors: ErrorDecoders<SubmitPayoutRunError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 401, kind: "error2", decode: { kind: "json", schema: errorSchema } },
      { on: 409, kind: "error3", decode: { kind: "json", schema: errorSchema } },
    ];
  }
}
