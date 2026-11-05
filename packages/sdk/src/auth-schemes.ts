import type { ClientOptions } from "./client-options.js";
import type { AuthScheme } from "./core/api-request.js";
import { bearerAuth } from "./core/auth/schemes.js";

export type AuthSchemes = {
  readonly bearerAuth: AuthScheme;
  readonly adminBearerAuth: AuthScheme;
};

export function buildAuthSchemes(options: ClientOptions): AuthSchemes {
  return {
    bearerAuth: bearerAuth(options.bearerAuth),
    adminBearerAuth: bearerAuth(options.adminBearerAuth),
  };
}
