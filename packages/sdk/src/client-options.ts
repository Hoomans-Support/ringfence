import type { TokenProvider } from "./core/auth/credentials.js";
import type { CoreClientOptions } from "./core/client-options.js";
import { ServerEnvironment } from "./servers.js";

export type ClientOptions = SdkClientOptions & CoreClientOptions;

type SdkClientOptions = ServerOptions & {
  /** A program's full API key, or its read-only MCP key for `GET` routes and `POST /v1/screen`. */
  readonly bearerAuth?: TokenProvider | undefined;
  /** The deployment's `ADMIN_TOKEN`, unrelated to any program's key. */
  readonly adminBearerAuth?: TokenProvider | undefined;
};

type ServerOptions =
  | {
      readonly serverEnvironment?: typeof ServerEnvironment.Production;
      /** Local (PGlite in memory, mock PayPal by default) */
      readonly serverOptions?: {
        baseUrl?: string;
      };
    }
  | {
      readonly serverEnvironment: typeof ServerEnvironment.Environment2;
      /** Local (PGlite in memory, mock PayPal by default) */
      readonly serverOptions?: {
        baseUrl?: string;
        /** @default "your-api-host.onrender.com" */
        host?: string;
      };
    };
