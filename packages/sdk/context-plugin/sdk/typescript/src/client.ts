import { buildAuthSchemes, type AuthSchemes } from "./auth-schemes.js";
import type { ClientOptions } from "./client-options.js";
import { buildCoreClientOptions } from "./core/client-options.js";
import { RawClient } from "./core/raw-client.js";
import * as host from "./core/runtime-environment.js";
import * as s from "./core/validation/index.js";
import { Events } from "./resources/events.js";
import { Holds } from "./resources/holds.js";
import { Rules } from "./resources/rules.js";
import { Runs } from "./resources/runs.js";
import { System } from "./resources/system.js";
import { Webhooks } from "./resources/webhooks.js";
import { buildServers, type Servers } from "./servers.js";

/**
 * A drop-in for PayPal Payouts: accepts PayPal's own Payouts request body plus optional per-payee
 * context, decides every payee (PAY, HOLD or BLOCK), and sends the paid ones to PayPal as one
 * batch, exactly once. Every `/v1` route takes a program's API key as a bearer token; a program's
 * read-only MCP key may only call `GET` routes and `POST /v1/screen`. This spec covers the REST
 * surface only. `POST /mcp` (the MCP server for AI agents — `screen_payees`, `explain_ring`) speaks
 * the Model Context Protocol's own Streamable HTTP transport, not plain REST/JSON, and isn't
 * represented here.
 */
export class RingfenceApiClient {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;
  #runs?: Runs;
  #holds?: Holds;
  #rules?: Rules;
  #events?: Events;
  #webhooks?: Webhooks;
  #system?: System;

  constructor(options: ClientOptions = {}) {
    this.#rawClient = new RawClient({
      ...buildCoreClientOptions(options, "RINGFENCE_API_CLIENT_LOG"),
      defaultHeaders: [
        { name: "User-Agent", value: "RingfenceApiClient/0.0.1 TypeScript", schema: s.string() },
        { name: "X-APIMatic-Lang", value: "TypeScript", schema: s.string() },
        { name: "X-APIMatic-Package-Version", value: "0.0.1", schema: s.string() },
        { name: "X-APIMatic-Gen-Version", value: "4.0.0", schema: s.string() },
        { name: "X-APIMatic-OS", value: host.operatingSystem(), schema: s.optional(s.string()) },
        { name: "X-APIMatic-Runtime", value: host.runtimeDescription(), schema: s.optional(s.string()) },
      ],
      defaultQuery: [],
      defaultPathParams: [],
    });

    this.#servers = buildServers(options);

    this.#auth = buildAuthSchemes(options);
  }

  /**
   * Decide and send a payout run
   */
  get runs(): Runs {
    return (this.#runs ??= new Runs(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Release a held payee, or confirm a ring as fraud
   */
  get holds(): Holds {
    return (this.#holds ??= new Holds(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Propose, backtest, red-team and approve learned rules
   */
  get rules(): Rules {
    return (this.#rules ??= new Rules(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Sign-up and referral events reported ahead of payday (FR-21, stretch)
   */
  get events(): Events {
    return (this.#events ??= new Events(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * PayPal webhook delivery and its own verified-events log
   */
  get webhooks(): Webhooks {
    return (this.#webhooks ??= new Webhooks(this.#rawClient, this.#servers, this.#auth));
  }

  /**
   * Liveness and health
   */
  get system(): System {
    return (this.#system ??= new System(this.#rawClient, this.#servers));
  }
}
