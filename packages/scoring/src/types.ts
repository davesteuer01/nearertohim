/**
 * Nearer to Him — scoring types.
 *
 * These mirror the exact scoring contract in the blueprint (v1.1, Section 4)
 * plus the additions from the architecture review (v1.2): an explicit
 * overall-aggregation function and a first-class coverage/status result.
 *
 * This module knows nothing about UI, storage, or the network. It is pure
 * math over plain data. That is deliberate: scoring correctness is the one
 * thing this app must never get wrong, and a pure module is the only kind
 * you can prove correct in isolation.
 */

export type ScaleAnswer = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ScaleValue = ScaleAnswer | 'NE';

export type CovenantState =
  | 'NEEDS_ATTENTION'
  | 'STRIVING_FAITHFULLY'
  | 'DEEPLY_ROOTED';
export type CovenantValue = CovenantState | 'NOT_YET_APPLICABLE';

export type AnswerValue = ScaleValue | CovenantValue;

export type CategoryKind = 'scale_1_7' | 'covenant_4state';

export interface ScoredItem {
  /** Stable question id, e.g. "1.1" .. "12.9". */
  id: string;
}

/**
 * Points mapping for the covenant scale (Section 4.2). Exported as a named
 * constant — per the architecture review — so content and scoring can never
 * drift on it independently.
 */
export const COVENANT_POINTS: Record<CovenantState, number> = {
  NEEDS_ATTENTION: 0,
  STRIVING_FAITHFULLY: 50,
  DEEPLY_ROOTED: 100,
};

export interface CategoryScoreResult {
  /** null when no applicable question has been answered yet. */
  score: number | null;
  /** Count of numerically-scored answers (excludes N/E and unanswered). */
  answered: number;
  /** Count of applicable questions (excludes N/E or Not Yet Applicable; includes unanswered). */
  applicable: number;
  /** True once answered/applicable meets the 50% (ceiling) threshold. */
  eligible: boolean;
}

export interface SessionScoreResult {
  overall: number | null;
  categories: Record<string, CategoryScoreResult>;
  /** draft = still being answered; the other two are only ever set by finalize(). */
  status: 'draft' | 'complete' | 'finished_with_unanswered';
  coverage: {
    /** total scoreable (non-excluded) questions across the whole instrument */
    applicable: number;
    /** total answered across the whole instrument */
    answered: number;
  };
}
