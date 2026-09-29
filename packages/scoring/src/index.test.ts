import { describe, expect, it } from 'vitest';
import { categoryScore, overallScore, scoreSession, roundForDisplay, CategoryDefinition } from './index.js';

function scaleItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `c.${i + 1}` }));
}

describe('categoryScore — scale_1_7 (blueprint Section 4, worked examples)', () => {
  it('all 7s -> 100', () => {
    const items = scaleItems(12);
    const answers = Object.fromEntries(items.map((q) => [q.id, 7]));
    const r = categoryScore(items, answers, 'scale_1_7');
    expect(r.score).toBe(100);
    expect(r.eligible).toBe(true);
  });

  it('all 1s -> 0', () => {
    const items = scaleItems(12);
    const answers = Object.fromEntries(items.map((q) => [q.id, 1]));
    const r = categoryScore(items, answers, 'scale_1_7');
    expect(r.score).toBe(0);
  });

  it('[1,7] -> 50', () => {
    const items = scaleItems(2);
    const answers = { 'c.1': 1, 'c.2': 7 };
    const r = categoryScore(items, answers as any, 'scale_1_7');
    expect(r.score).toBe(50);
  });

  it('9-item category, two N/E, four scored, three unanswered: 4/7 qualifies', () => {
    const items = scaleItems(9);
    const answers: Record<string, any> = {
      'c.1': 'NE',
      'c.2': 'NE',
      'c.3': 4,
      'c.4': 4,
      'c.5': 4,
      'c.6': 4,
      // c.7, c.8, c.9 unanswered
    };
    const r = categoryScore(items, answers, 'scale_1_7');
    expect(r.applicable).toBe(7); // 9 - 2 N/E
    expect(r.answered).toBe(4);
    expect(r.eligible).toBe(true); // ceil(7/2) = 4
  });

  it('same category, only three scored: does not qualify', () => {
    const items = scaleItems(9);
    const answers: Record<string, any> = {
      'c.1': 'NE',
      'c.2': 'NE',
      'c.3': 4,
      'c.4': 4,
      'c.5': 4,
      // c.6..c.9 unanswered
    };
    const r = categoryScore(items, answers, 'scale_1_7');
    expect(r.applicable).toBe(7);
    expect(r.answered).toBe(3);
    expect(r.eligible).toBe(false);
  });

  it('0 applicable -> null, not eligible', () => {
    const items = scaleItems(3);
    const answers = { 'c.1': 'NE', 'c.2': 'NE', 'c.3': 'NE' } as any;
    const r = categoryScore(items, answers, 'scale_1_7');
    expect(r.score).toBeNull();
    expect(r.eligible).toBe(false);
  });

  it('0 answered (all unanswered) -> null', () => {
    const items = scaleItems(4);
    const r = categoryScore(items, {}, 'scale_1_7');
    expect(r.score).toBeNull();
    expect(r.applicable).toBe(4);
    expect(r.answered).toBe(0);
  });
});

describe('categoryScore — covenant_4state (blueprint Section 4.2)', () => {
  it('[Needs Attention, Striving Faithfully, Deeply Rooted, Not Yet Applicable] -> 50 with three applicable', () => {
    const items = scaleItems(4);
    const answers = {
      'c.1': 'NEEDS_ATTENTION',
      'c.2': 'STRIVING_FAITHFULLY',
      'c.3': 'DEEPLY_ROOTED',
      'c.4': 'NOT_YET_APPLICABLE',
    } as any;
    const r = categoryScore(items, answers, 'covenant_4state');
    expect(r.score).toBe(50);
    expect(r.applicable).toBe(3);
    expect(r.answered).toBe(3);
    expect(r.eligible).toBe(true);
  });

  it('all Not Yet Applicable -> null, 0 applicable', () => {
    const items = scaleItems(2);
    const answers = { 'c.1': 'NOT_YET_APPLICABLE', 'c.2': 'NOT_YET_APPLICABLE' } as any;
    const r = categoryScore(items, answers, 'covenant_4state');
    expect(r.score).toBeNull();
    expect(r.applicable).toBe(0);
  });
});

describe('overallScore (blueprint Section 4.4, added by the v1.2 review)', () => {
  it('equal-weight overall of 100 (12-item category) and 50 (6-item category) is 75, regardless of item counts', () => {
    const categories = {
      cat1: { score: 100, answered: 12, applicable: 12, eligible: true },
      cat2: { score: 50, answered: 6, applicable: 6, eligible: true },
    };
    expect(overallScore(categories)).toBe(75);
  });

  it('never substitutes zero for a missing/ineligible category', () => {
    const categories = {
      cat1: { score: 100, answered: 12, applicable: 12, eligible: true },
      cat2: { score: null, answered: 2, applicable: 9, eligible: false },
    };
    expect(overallScore(categories)).toBe(100);
  });

  it('null when zero categories are eligible', () => {
    const categories = {
      cat1: { score: null, answered: 0, applicable: 5, eligible: false },
    };
    expect(overallScore(categories)).toBeNull();
  });
});

describe('scoreSession — session-level wrapper (v1.2 review addition)', () => {
  it('always starts as draft; coverage sums across categories', () => {
    const defs: CategoryDefinition[] = [
      { id: 'cat1', kind: 'scale_1_7', items: scaleItems(3) },
      { id: 'cat2', kind: 'covenant_4state', items: scaleItems(2) },
    ];
    const answers: Record<string, any> = { 'c.1': 7, 'c.2': 1, 'c.3': 4 };
    const result = scoreSession(defs, answers);
    expect(result.status).toBe('draft');
    // cat2 items are also named c.1/c.2 in this helper on purpose is avoided by using distinct ids in real content;
    // here we only assert the shape and that coverage is the sum of both categories' applicable counts.
    expect(result.coverage.applicable).toBe(defs[0].items.length + defs[1].items.length);
  });
});

describe('roundForDisplay', () => {
  it('rounds only at display time, never mutates the stored value', () => {
    expect(roundForDisplay(66.66666666, 0)).toBe(67);
    expect(roundForDisplay(66.66666666, 1)).toBe(66.7);
    expect(roundForDisplay(null)).toBeNull();
  });
});
