import { describe, expect, it } from 'vitest';
import { loadInstrument } from './index.js';

describe('loadInstrument', () => {
  it('loads the placeholder bundle, validates its shape, and freezes it', async () => {
    const instrument = await loadInstrument();
    expect(instrument.categories).toHaveLength(12);
    expect(instrument.questions).toHaveLength(103);
    expect(instrument.content_status).toBe('placeholder');
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
});
