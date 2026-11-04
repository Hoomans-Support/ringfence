/**
 * The non-functional "Up for judging" requirement: a cap on model spend. Called from narrate.ts's
 * narrateClaims() right before each real model call (see apps/console/lib/llm-spend-cap.ts for the
 * shared, per-process instance the console actually uses), so a runaway loop can't blow through the
 * budget silently.
 */

export class ModelSpendCapExceededError extends Error {
  constructor(attemptedUsd: number, spentUsd: number, limitUsd: number) {
    super(
      `Model spend cap of $${limitUsd.toFixed(2)} exceeded: already spent $${spentUsd.toFixed(2)}, this call would add $${attemptedUsd.toFixed(2)}`,
    );
    this.name = "ModelSpendCapExceededError";
  }
}

export interface SpendCap {
  /** Running total recorded so far, in USD. */
  readonly spentUsd: number;
  /** Records a model call's cost. Throws ModelSpendCapExceededError instead of recording it if that would exceed the cap. */
  record(costUsd: number): void;
}

export function createSpendCap(limitUsd: number): SpendCap {
  let spent = 0;
  return {
    get spentUsd() {
      return spent;
    },
    record(costUsd: number) {
      if (spent + costUsd > limitUsd) throw new ModelSpendCapExceededError(costUsd, spent, limitUsd);
      spent += costUsd;
    },
  };
}

/** Reads LLM_SPEND_CAP_USD from the environment (see .env.example), falling back to the PRD's own $50 cap. */
export function spendCapUsdFromEnv(defaultUsd = 50): number {
  const parsed = Number(process.env.LLM_SPEND_CAP_USD);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultUsd;
}
