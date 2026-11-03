/**
 * Identity clean-up (FR-2).
 *
 * Two related but different normalizations live here:
 *
 * - `normalizeEmail`: what "the same mailbox" means. Used to link accounts
 *   that pay out to the same PayPal address (a hard link in the graph
 *   engine). Gmail-dot folding only applies to Gmail/Googlemail, because
 *   that is the one provider where dots are documented to be ignored by the
 *   mailbox itself; folding dots on an arbitrary domain would be wrong.
 * - `aliasPatternKey`: what "looks like the same naming pattern" means. This
 *   is a looser, deliberately aggressive key used only for the graph
 *   engine's soft "email alias pattern" signal (FR-3) — it strips dots on
 *   every domain and trailing digits too, because an operator naming
 *   accounts ring1@, ring2@, ring.operator+3@ is a pattern worth a weak
 *   (0.35) edge, not a claim that these are the same mailbox.
 */

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

// Representative, not exhaustive — enough to flag the common disposable
// providers seeded in the demo data and worth extending as real cases show up.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "getnada.com",
  "trashmail.com",
  "sharklasers.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mintemail.com",
  "mohmal.com",
  "moakt.com",
  "emailondeck.com",
  "spamgourmet.com",
  "mytemp.email",
]);

export interface NormalizedEmail {
  /** The address as given. */
  raw: string;
  /** Normalized full address: the identity key for "same payout address". */
  email: string;
  localPart: string;
  domain: string;
  disposable: boolean;
}

function splitEmail(raw: string): { local: string; domain: string } {
  const lower = raw.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at === -1) throw new Error(`Not an email address: ${raw}`);
  return { local: lower.slice(0, at), domain: lower.slice(at + 1) };
}

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.trim().toLowerCase());
}

export function normalizeEmail(raw: string): NormalizedEmail {
  const { local, domain } = splitEmail(raw);
  const noPlus = local.split("+")[0] ?? local;
  const noDots = GMAIL_DOMAINS.has(domain) ? noPlus.replace(/\./g, "") : noPlus;
  return {
    raw,
    email: `${noDots}@${domain}`,
    localPart: noDots,
    domain,
    disposable: isDisposableDomain(domain),
  };
}

export function aliasPatternKey(raw: string): string {
  const { local, domain } = splitEmail(raw);
  const noPlus = local.split("+")[0] ?? local;
  const noDots = noPlus.replace(/\./g, "");
  const noTrailingDigits = noDots.replace(/\d+$/, "");
  const base = noTrailingDigits.length > 0 ? noTrailingDigits : noDots;
  return `${base}@${domain}`;
}
