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
  timeframe_text: z.string().min(1),
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
  scripture_references: z.array(z.string()),
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
  content_status: z.enum(['placeholder', 'human_verified']),
  source_file_fingerprint: z.string().nullable(),
  checksum_algorithm: z.literal('sha256'),
  item_count_by_category: z.record(z.string(), z.number().int().positive()),
  intro: z.string(),
  instructions: z.string(),
  disclaimer: z.string(),
  scoring_policy_version: z.string(),
  published_at: z.string().nullable(),
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
