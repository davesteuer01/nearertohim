import { z } from 'zod';

/**
 * Conference-talk content, per Dave's 30 Sep 2026 decision: talks are
 * organized by PRIMARY TOPIC (what the talk is about), never by any
 * doctrinal "value" or ranking Claude assigns. To keep that honest, every
 * talk's `primary_topic_category_id` here is imported directly from the
 * Church's own official general-conference topic index
 * (churchofjesuschrist.org/general-conference/topics/<topic>) — nothing in
 * this package classifies a talk's topic itself. `topic_index_url` records
 * exactly which official page it was sourced from, so the classification
 * is always traceable back to the Church's own tagging, not ours.
 *
 * Canon (scripture) remains the only material that must always be
 * sufficient on its own for the 103-question instrument (see schema.ts's
 * scripture_references / supplemental_references split). Conference talks
 * are a wholly separate, secondary layer used only by the M2 mentor —
 * never mixed into the instrument's own doctrinal-reference criteria.
 */

export const ConferenceTalkSchema = z.object({
  id: z.string(), // e.g. "2013-04-holland-lord-i-believe"
  title: z.string().min(1),
  speaker: z.string().min(1),
  conference_year: z.number().int().min(1971).max(2100),
  conference_month: z.enum(['04', '10']),
  // Cross-references one of the instrument's 12 category ids ("1".."12") —
  // NOT a new taxonomy. A talk's fit is by topic only, never doctrinal rank.
  primary_topic_category_id: z.string(),
  // Where this talk's topic classification came from. 'official_topic_index'
  // is the only sanctioned source right now: the Church's own topic pages.
  source: z.literal('official_topic_index'),
  topic_index_url: z.string().url(),
  // Deep link to the talk itself — omitted rather than guessed at slug
  // patterns; filled in only once a real, verified URL is confirmed.
  talk_url: z.string().url().optional(),
  review_status: z.enum(['pending', 'verified']),
});

export const ConferenceTalkBundleSchema = z.object({
  bundle_version: z.string(),
  content_status: z.enum(['curated_starter_slice', 'human_verified']),
  // Which of the instrument's 12 categories this bundle currently has ANY
  // talks for — a starter slice, not the full 1985-present corpus. Grows
  // over time; the app must never imply coverage it doesn't have.
  categories_covered: z.array(z.string()),
  talks: z.array(ConferenceTalkSchema),
});

export type ConferenceTalk = z.infer<typeof ConferenceTalkSchema>;
export type ConferenceTalkBundle = z.infer<typeof ConferenceTalkBundleSchema>;
