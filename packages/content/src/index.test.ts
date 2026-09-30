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

  it('every scripture reference names a canon book — no bare "chapter:verse" and no conference talk mixed in', async () => {
    const instrument = await loadInstrument();
    // A bare fragment like "84:33-44" (no book name) is a citation with the
    // book name silently dropped, not a valid reference. Regression test for
    // the extractor bug where the source's ";"-separated same-book follow-up
    // citations (e.g. "Doctrine and Covenants 20:77, 79; 84:33-44") lost the
    // book name on the second citation.
    const bareFragment = /^\s*\d+:/;
    // Standing rule: canon only in scripture_references. A conference talk
    // is never a valid entry here (see supplemental_references instead).
    const looksLikeConferenceTalk = /\b(elder|president|sister|bishop)\b/i;
    for (const q of instrument.questions) {
      for (const ref of q.scripture_references) {
        expect(ref).not.toMatch(bareFragment);
        expect(ref).not.toMatch(looksLikeConferenceTalk);
      }
    }
  });

  it('v1.0 carries no supplemental (conference-talk) references yet — canon alone is complete', async () => {
    const instrument = await loadInstrument();
    for (const q of instrument.questions) {
      expect(q.supplemental_references ?? []).toHaveLength(0);
    }
  });
});
