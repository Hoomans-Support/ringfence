import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { approveRuleRequestSchema, type ApproveRuleRequest } from "../models/approve-rule-request.js";
import { errorSchema, type Error } from "../models/error.js";
import { proposeRuleRequestSchema, type ProposeRuleRequest } from "../models/propose-rule-request.js";
import { storedRuleSchema, type StoredRule } from "../models/stored-rule.js";
import type { Servers } from "../servers.js";

/**
 * Propose, backtest, red-team and approve learned rules
 */
export class Rules {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Approve the latest proposed version of a rule
   *
   * @returns Approved (or already was).
   *
   * @throws {@link Rules.ApproveRuleError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  approveRule(
    request: Rules.ApproveRuleRequestParams,
    options?: RequestOptions,
  ): ApiPromise<StoredRule, Rules.ApproveRuleError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/v1/rules/{id}/approve"),
        auth: this.#auth.bearerAuth,
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: approveRuleRequestSchema },
      },
      {
        success: { kind: "json", schema: storedRuleSchema },
        errorFactory: Rules.ApproveRuleError,
      },
      options,
    );
  }

  /**
   * List every proposed and approved learned rule
   *
   * @returns OK
   *
   * @throws {@link Rules.ListRulesError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  listRules(options?: RequestOptions): ApiPromise<StoredRule[], Rules.ListRulesError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/v1/rules"),
        auth: this.#auth.bearerAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: s.array(s.lazy(() => storedRuleSchema)) },
        errorFactory: Rules.ListRulesError,
      },
      options,
    );
  }

  /**
   * Propose a rule (backtested and red-teamed on the way in)
   *
   * @returns Proposed. `flags` is non-empty when it needs a deliberate second look before approval.
   *
   * @throws {@link Rules.ProposeRuleError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link RingfenceApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  proposeRule(
    request: Rules.ProposeRuleRequestParams,
    options?: RequestOptions,
  ): ApiPromise<StoredRule, Rules.ProposeRuleError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/v1/rules"),
        auth: this.#auth.bearerAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: proposeRuleRequestSchema },
      },
      {
        success: { kind: "json", schema: storedRuleSchema },
        errorFactory: Rules.ProposeRuleError,
      },
      options,
    );
  }
}

export namespace Rules {
  export type ApproveRuleRequestParams = {
    /** A rule id, e.g. `R-07` */
    id: string;
    body: ApproveRuleRequest;
  };

  export class ApproveRuleError extends ApiError {
    declare readonly payload:
      | Declared<"error", Error>
      | Declared<"error2", Error>
      | Declared<"error3", Error>
      | Undeclared;

    static readonly errors: ErrorDecoders<ApproveRuleError> = [
      { on: 401, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 404, kind: "error2", decode: { kind: "json", schema: errorSchema } },
      { on: 409, kind: "error3", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export class ListRulesError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Undeclared;

    static readonly errors: ErrorDecoders<ListRulesError> = [
      { on: 401, kind: "error", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type ProposeRuleRequestParams = {
    body: ProposeRuleRequest;
  };

  export class ProposeRuleError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Declared<"error2", Error> | Undeclared;

    static readonly errors: ErrorDecoders<ProposeRuleError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 401, kind: "error2", decode: { kind: "json", schema: errorSchema } },
    ];
  }
}
