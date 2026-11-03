import type { PayoutRun } from "@ringfence/engine";

export type TruthGroup = "ring" | "roommates" | "coworkers" | "honest";

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
}
