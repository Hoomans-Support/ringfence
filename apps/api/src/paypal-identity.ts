import { createHmac, timingSafeEqual } from "node:crypto";

export interface IdentityProvider {
  authorizeUrl(state: string): string;
  exchangeCode(code: string): Promise<{ email: string }>;
}

export interface SelfReleaseState {
  program_id: string;
  run_id: string;
  sender_item_id: string;
  exp: number;
}

export function createPayPalIdentityProvider(opts: {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  redirectUrl?: string;
}): IdentityProvider {
  const redirectUrl = opts.redirectUrl ?? process.env.RINGFENCE_SELF_RELEASE_REDIRECT_URL ??
    `${process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${process.env.PORT ?? 3000}`}/self-release/callback`;
  const connectHost = new URL(opts.baseUrl).hostname.includes("sandbox") ? "www.sandbox.paypal.com" : "www.paypal.com";
  return {
    authorizeUrl(state) {
      const url = new URL(`https://${connectHost}/connect`);
      url.searchParams.set("flowEntry", "static");
      url.searchParams.set("client_id", opts.clientId);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid email");
      url.searchParams.set("redirect_uri", redirectUrl);
      url.searchParams.set("state", state);
      return url.toString();
    },
    async exchangeCode(code) {
      const apiBase = opts.baseUrl.replace(/\/$/, "");
      const tokenRes = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUrl }),
      });
      if (!tokenRes.ok) throw new Error("PayPal token exchange failed");
      const token = await tokenRes.json() as { access_token?: string };
      if (!token.access_token) throw new Error("PayPal token response had no access token");
      const userRes = await fetch(`${apiBase}/v1/identity/openidconnect/userinfo?schema=openid`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!userRes.ok) throw new Error("PayPal identity lookup failed");
      const user = await userRes.json() as { email?: unknown };
      if (typeof user.email !== "string" || !user.email) throw new Error("PayPal did not return an email address");
      return { email: user.email };
    },
  };
}

export function signState(payload: SelfReleaseState, key = process.env.RINGFENCE_SELF_RELEASE_KEY): string {
  if (!key) throw new Error("RINGFENCE_SELF_RELEASE_KEY is not configured");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyState(token: string, key = process.env.RINGFENCE_SELF_RELEASE_KEY, now = Date.now()): SelfReleaseState | undefined {
  if (!key) return undefined;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return undefined;
  const expected = createHmac("sha256", key).update(body).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "base64url"); } catch { return undefined; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SelfReleaseState;
    if (!payload.program_id || !payload.run_id || !payload.sender_item_id || !Number.isFinite(payload.exp) || payload.exp <= now) return undefined;
    return payload;
  } catch {
    return undefined;
  }
}
