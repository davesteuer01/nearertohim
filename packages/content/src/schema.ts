import { z } from 'zod';

/**
 * Entity schema for the Nearer to Him instrument (blueprint Section 5,
 * plus the v1.2 review's additions: checksum_algorithm,
 * item_count_by_category, and tradition_id for future non-LDS instruments).
 *
 * This schema validates content; it never produces it. Question wording,
 * scripture references, and the Christ example/teaching text must come
 * from a human-verified extraction of the actual source document
 * (the Word file + 54-page PDF named in the blueprint) — nothing in this
 * package or repo invents any of that text.
 */

export const ResponseKind = z.enum(['scale_1_7', 'covenant_4state']);

export const QuestionSchema = z.object({
  id: z.string().regex(/^\d{1,2}\.\d{1,2}$/), // "1.1" .. "12.9"
  instrument_version: z.string(),
  category_id: z.string(),
  order: z.number().int().positive(),
  title: z.string().min(1),
  prompt: z.string().min(1),
  // Empty when the source item's prompt doesn't isolate a separate "During the past X,"
  // clause (most items phrase the timeframe inline in varied ways) — real content, not an
  // extraction gap; only ~8 of 103 items match the isolable pattern.
  timeframe_text: z.string(),
  anchors: z
    .object({ 1: z.string(), 4: z.string(), 7: z.string() })
    .partial()
    .optional(),
  covenant_choices: z
    .tuple([
      z.literal('NEEDS_ATTENTION'),
      z.literal('STRIVING_FAITHFULLY'),
      z.literal('DEEPLY_ROOTED'),
      z.literal('NOT_YET_APPLICABLE'),
    ])
    .optional(),
  // Canon doctrinal sources ONLY (Old Testament, New Testament, Book of Mormon,
  // Doctrine and Covenants, Pearl of Great Price). Per Dave's explicit standing
  // decision, this canon must always be sufficient on its own to satisfy the
  // instrument's doctrinal-reference criteria for every item — nothing here
  // ever depends on a conference talk to be complete or accurate.
  scripture_references: z.array(z.string()),
  // General conference talks — secondary, optional, supplemental-only material
  // for pondering/further reading. Never required, never counted toward the
  // doctrinal-reference criteria, and never mixed into scripture_references
  // above. Empty for the whole v1.0 instrument by design; kept as its own
  // field precisely so a future addition can't accidentally blur the two.
  supplemental_references: z.array(z.string()).optional(),
  christ_example: z.string(),
  reflection_prompt: z.string(),
  source_locator: z.string(),
  review_status: z.enum(['verified', 'pending', 'placeholder']),
});

export const CategorySchema = z.object({
  id: z.string(),
  instrument_version: z.string(),
  order: z.number().int().positive(),
  title: z.string().min(1),
  intro: z.string(),
  response_kind: ResponseKind,
  item_count: z.number().int().positive(),
});

export const InstrumentSchema = z.object({
  id: z.string(),
  version: z.string(),
  tradition_id: z.string(), // "lds" for beta 1.0 — see v1.2 review, "why tradition_id now"
  status: z.enum(['draft', 'published', 'superseded']),
  content_status: z.enum(['placeholder', 'extracted_pending_review', 'human_verified']),
  source_file_fingerprint: z.string().nullable(),
  checksum_algorithm: z.literal('sha256'),
  item_count_by_category: z.record(z.string(), z.number().int().positive()),
  intro: z.string(),
  instructions: z.string(),
  disclaimer: z.string(),
  scoring_policy_version: z.string(),
  published_at: z.string().nullable(),
  /** The source document's own "Now Set the Score Aside" closing text, verbatim,
   * one paragraph per array entry. The gentle-transition and reflection-result
   * screens should quote this directly rather than paraphrasing it. */
  outro: z.array(z.string()).optional(),
  categories: z.array(CategorySchema),
  questions: z.array(QuestionSchema),
});

export type Instrument = z.infer<typeof InstrumentSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Question = z.infer<typeof QuestionSchema>;

/**
 * Self-check per the v1.2 review: verify the loaded instrument's category
 * and item counts against its own manifest, and that every question's
 * category has the right response kind. Call this at load time, before
 * any scoring happens. On failure, the app must fail closed.
 */
export function verifyInstrumentShape(instrument: Instrument): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  for (const cat of instrument.categories) {
    const declared = instrument.item_count_by_category[cat.id];
    const actual = instrument.questions.filter((q) => q.category_id === cat.id).length;
    if (declared !== cat.item_count) {
      errors.push(`Category ${cat.id}: item_count_by_category (${declared}) != category.item_count (${cat.item_count})`);
    }
    if (actual !== cat.item_count) {
      errors.push(`Category ${cat.id}: declared item_count (${cat.item_count}) != actual question count (${actual})`);
    }
  }

  const totalDeclared = Object.values(instrument.item_count_by_category).reduce((a, b) => a + b, 0);
  if (totalDeclared !== instrument.questions.length) {
    errors.push(`Total declared items (${totalDeclared}) != total questions in bundle (${instrument.questions.length})`);
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}
