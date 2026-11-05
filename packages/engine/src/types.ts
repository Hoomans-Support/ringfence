/**
 * Shapes shared with A's PayPal plumbing. The `context` block is Ringfence's
 * addition on top of the PayPal Payouts request body (see final-prd.docx,
 * Part 2, API contract); the executor strips it before the batch goes to
 * PayPal. Fields beyond the minimal contract (onboarding_seconds,
 * activity_after_onboarding, disposable_email) are what the demo generator
 * and, later, a real event feed compute for detection — they are not part
 * of what Ringfence sends PayPal.
 */
export interface PayoutItemContext {
  account_id: string;
  signup_at: string; // ISO 8601
  device_hash: string;
  ip_prefix: string; // e.g. "10.4.2.0/24"
  referrer_id?: string;
  answer?: string;
  /** Seconds from signup to finishing onboarding. <=120 is the "speed" risk flag. */
  onboarding_seconds?: number;
  /** Count of actions after onboarding finished. 0 is the "quiet" risk flag. */
  activity_after_onboarding?: number;
}

export interface PayoutItem {
  recipient_type: "EMAIL";
  receiver: string;
  amount: { value: string; currency: string };
  sender_item_id: string;
  context: PayoutItemContext;
}

export interface PayoutRun {
  sender_batch_header: { sender_batch_id: string; email_subject?: string };
  items: PayoutItem[];
}

export type Decision = "PAY" | "HOLD" | "BLOCK";

export interface ItemDecision {
  sender_item_id: string;
  decision: Decision;
  /** Set only for communities of 3+ (a "ring"): case-file eligible. */
  ring_id?: string;
  /** Set for any held group, ring or pair, so the console can bulk-decide it. */
  hold_group_id?: string;
  reasons: string[];
}

export interface RingSummary {
  ring_id: string;
  member_sender_item_ids: string[];
  size: number;
  /** Union of the signals and risk flags that formed this ring. */
  reasons: string[];
  /** How many Louvain sub-clusters this ring's accounts fall into (e.g. one per device). Structural detail, not a hold decision. */
  louvain_clusters: number;
}

export interface ScoreRunResult {
  decisions: ItemDecision[];
  rings: RingSummary[];
}

/**
 * Reserved for cross-run context (e.g. network matches against rings
 * confirmed at other programs, FR-19 — a P2 stretch item). Unused by the
 * graph-and-risk-flag baseline in this package; A's rule engine (FR-4,
 * FR-11) layers versioned starter and learned rules on top of this output.
 */
export interface ScoreRunContext {
  priorRings?: unknown;
  /** The number this run's first ring and first pair get. A program's rings and pairs keep their
   *  numbers for good, so its runs count on from where the last one stopped. Default 1. */
  firstRingNumber?: number;
  firstPairNumber?: number;
}
