import {
  AnswerValue,
  CategoryKind,
  CategoryScoreResult,
  COVENANT_POINTS,
  CovenantState,
  ScoredItem,
  SessionScoreResult,
} from './types.js';

export * from './types.js';

const EXCLUDED_VALUE: Record<CategoryKind, AnswerValue> = {
  scale_1_7: 'NE',
  covenant_4state: 'NOT_YET_APPLICABLE',
};

function isScaleAnswer(v: AnswerValue | undefined): v is 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7;
}

function isCovenantAnswer(v: AnswerValue | undefined): v is CovenantState {
  return v === 'NEEDS_ATTENTION' || v === 'STRIVING_FAITHFULLY' || v === 'DEEPLY_ROOTED';
}

/**
 * Blueprint Section 4.1–4.3, worked examples verified in index.test.ts.
 *
 * - 1–11 (scale_1_7): mean = sum(value)/count over numerically-answered
 *   items only; score = ((mean - 1) / 6) * 100. N/E and unanswered excluded
 *   from the numerator; unanswered stays in the denominator (`applicable`).
 * - 12 (covenant_4state): mean of {0, 50, 100} points over applicable
 *   answered items; Not Yet Applicable excluded from both numerator and
 *   denominator.
 * - Eligibility: applicable > 0 AND answered >= ceil(applicable / 2).
 */
export function categoryScore(
  items: ScoredItem[],
  answers: Record<string, AnswerValue | undefined>,
  kind: CategoryKind,
): CategoryScoreResult {
  const excluded = EXCLUDED_VALUE[kind];
  const applicableItems = items.filter((q) => answers[q.id] !== excluded);

  const scoredValues = applicableItems
    .map((q) => answers[q.id])
    .filter((v): v is AnswerValue => (kind === 'covenant_4state' ? isCovenantAnswer(v) : isScaleAnswer(v)));

  if (!scoredValues.length) {
    return { score: null, answered: 0, applicable: applicableItems.length, eligible: false };
  }

  const points =
    kind === 'covenant_4state'
      ? scoredValues.map((v) => COVENANT_POINTS[v as CovenantState])
      : scoredValues.map((v) => (((v as number) - 1) / 6) * 100);

  const score = points.reduce((a, b) => a + b, 0) / points.length;
  const applicable = applicableItems.length;
  const answered = scoredValues.length;

  return {
    score,
    answered,
    applicable,
    eligible: applicable > 0 && answered >= Math.ceil(applicable / 2),
  };
}

/**
 * Blueprint Section 4.4, added by the v1.2 architecture review: the
 * aggregation the blueprint states in prose but never codified. Equal
 * weight across every *eligible* category; null if none qualify. Never
 * substitutes zero for a missing category.
 */
export function overallScore(categories: Record<string, CategoryScoreResult>): number | null {
  const eligible = Object.values(categories).filter((c) => c.eligible && c.score !== null);
  if (!eligible.length) return null;
  return eligible.reduce((sum, c) => sum + (c.score as number), 0) / eligible.length;
}

export interface CategoryDefinition {
  id: string;
  kind: CategoryKind;
  items: ScoredItem[];
}

/**
 * Session-level wrapper, added by the v1.2 review: makes coverage and
 * finalization status first-class outputs instead of something the UI
 * re-derives in several places. `status` is always 'draft' here — only an
 * explicit finalize step (in the app layer, never here) may set 'complete'
 * or 'finished_with_unanswered', per Section 4.5.
 */
export function scoreSession(
  categoryDefs: CategoryDefinition[],
  answers: Record<string, AnswerValue | undefined>,
): SessionScoreResult {
  const categories: Record<string, CategoryScoreResult> = {};
  let totalApplicable = 0;
  let totalAnswered = 0;

  for (const def of categoryDefs) {
    const result = categoryScore(def.items, answers, def.kind);
    categories[def.id] = result;
    totalApplicable += result.applicable;
    totalAnswered += result.answered;
  }

  return {
    overall: overallScore(categories),
    categories,
    status: 'draft',
    coverage: { applicable: totalApplicable, answered: totalAnswered },
  };
}

/** Round only at display time — never store or compare rounded values. */
export function roundForDisplay(score: number | null, decimals: 0 | 1 = 0): number | null {
  if (score === null) return null;
  const factor = 10 ** decimals;
  return Math.round(score * factor) / factor;
}
