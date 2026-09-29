import type { Instrument, Question } from '@nearertohim/content';

export interface FlatQuestion extends Question {
  categoryTitle: string;
  categoryOrder: number;
}

/** All 103 questions in canonical category → question order, for the
 * linear full-assessment flow (blueprint Section 3B). */
export function flattenQuestions(instrument: Instrument): FlatQuestion[] {
  const catById = Object.fromEntries(instrument.categories.map((c) => [c.id, c]));
  return instrument.questions
    .slice()
    .sort((a, b) => {
      const ca = catById[a.category_id];
      const cb = catById[b.category_id];
      if (ca.order !== cb.order) return ca.order - cb.order;
      return a.order - b.order;
    })
    .map((q) => ({ ...q, categoryTitle: catById[q.category_id].title, categoryOrder: catById[q.category_id].order }));
}
