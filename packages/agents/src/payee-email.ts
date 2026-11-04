/**
 * FR-24: hold and release emails to payees, simulated in the demo (never actually sent). Done
 * when the wording never accuses the payee - see design.md's Voice table, which goes further for
 * payee-facing copy than the staff-facing console: a payee is never told "ring", "fraud", or that
 * they're under review at all. Takes only the amount, on purpose - these functions have no access
 * to ring or fraud-check details, so there's nothing accusatory they could leak even by mistake.
 */
import type { PayoutItem } from "@ringfence/engine";

export interface PayeeEmail {
  subject: string;
  body: string;
}

function formatAmount(amount: PayoutItem["amount"]): string {
  return `${amount.value} ${amount.currency}`;
}

export function holdEmailCopy(amount: PayoutItem["amount"]): PayeeEmail {
  return {
    subject: "Your payout is on hold",
    body: `Hi, your payout of ${formatAmount(amount)} is on hold while we finish a routine review. No action is needed from you right now - we'll follow up as soon as it's resolved, usually within a few days. Thanks for your patience.`,
  };
}

export function releaseEmailCopy(amount: PayoutItem["amount"]): PayeeEmail {
  return {
    subject: "Your payout is on its way",
    body: `Good news - your payout of ${formatAmount(amount)} has cleared and is on its way. Thanks for your patience.`,
  };
}
