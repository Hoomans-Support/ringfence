import type { PayoutRun } from "@ringfence/engine";

export type TruthGroup = "ring" | "ring_match" | "roommates" | "coworkers" | "honest";

export interface GroundTruthLabel {
  sender_item_id: string;
  account_id: string;
  group: TruthGroup;
  /** Narrative label for the story/console (e.g. "R-12"), not the engine's own ring id. */
  ring_label?: string;
}

export interface WeekFixture {
  run: PayoutRun;
  truth: GroundTruthLabel[];
  /** Optional scenario-only facts that are part of the demo story, not PayPal API payload fields. */
  demo?: WeekDemoMetadata;
}

export interface WeekDemoMetadata {
  kind: "cross_program_recovery";
  recovery: {
    /** Simulated by this demo fixture; this is not a PayPal cancellation response. */
    status: "fixture_cancelled_unclaimed";
    source_run_id: string;
    sender_item_ids: string[];
    amount_usd: number;
  };
}
