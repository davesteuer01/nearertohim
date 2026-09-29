import { describe, expect, it } from 'vitest';
import { loadInstrument } from './index.js';

describe('loadInstrument', () => {
  it('loads the bundle, validates its shape, and freezes it', async () => {
    const instrument = await loadInstrument();
    expect(instrument.categories).toHaveLength(12);
    expect(instrument.questions).toHaveLength(103);
    // Phase 0 extraction is in: real source text, not yet human-verified against the PDF.
    expect(instrument.content_status).toBe('extracted_pending_review');
    expect(() => {
      // @ts-expect-error — deep-frozen at runtime; ES module strict mode
      // turns this into a thrown TypeError rather than a silent no-op,
      // which is the stronger and preferred guarantee.
      instrument.questions[0].title = 'mutated';
    }).toThrow(/read only|frozen/i);
    expect(instrument.questions[0].title).not.toBe('mutated');
  });

  it('every category\'s declared item_count matches its actual question count', async () => {
    const instrument = await loadInstrument();
    for (const cat of instrument.categories) {
      const actual = instrument.questions.filter((q) => q.category_id === cat.id).length;
      expect(actual).toBe(cat.item_count);
    }
  });

  it('category 12 is covenant_4state; categories 1-11 are scale_1_7', async () => {
    const instrument = await loadInstrument();
    const byId = Object.fromEntries(instrument.categories.map((c) => [c.id, c]));
    expect(byId['12'].response_kind).toBe('covenant_4state');
    for (let i = 1; i <= 11; i++) {
      expect(byId[String(i)].response_kind).toBe('scale_1_7');
    }
  });

  it('carries the source document\'s verbatim "Now Set the Score Aside" closing text', async () => {
    const instrument = await loadInstrument();
    expect(instrument.outro).toBeDefined();
    expect(instrument.outro?.[0]).toBe('Now Set the Score Aside');
    expect(instrument.outro?.at(-1)).toBe('The scorecard is not the destination. Jesus Christ is.');
  });

  it('every question is marked pending human review, not yet verified', async () => {
    const instrument = await loadInstrument();
    for (const q of instrument.questions) {
      expect(q.review_status).toBe('pending');
    }
  });
});
