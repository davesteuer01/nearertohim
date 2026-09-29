#!/usr/bin/env node
/**
 * Generates packages/content/src/instrument-1.0.json as a STRUCTURAL
 * placeholder: correct category order, ids, item counts, and response
 * kinds per the blueprint's Section 2 table — but every question's title,
 * prompt, anchors, scripture references, Christ example, and reflection
 * prompt is an explicit placeholder string, not real content.
 *
 * This exists so the app, scoring, and schema validation can all be built
 * and tested end to end right now. It is NOT Phase 0 (source freeze).
 * Phase 0 requires the actual Word/PDF source document, a script-based
 * extraction from it, and a human review against the PDF, per Section 5
 * of the blueprint. Nothing in this generator invents scripture, doctrine,
 * or question wording — it only fills a structural skeleton with visibly
 * fake text so no one mistakes a placeholder for real content.
 *
 * Re-run: node packages/content/scripts/generate-placeholder-instrument.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../src/instrument-1.0.json');

// Category table, verbatim counts from blueprint v1.1 Section 2.
const CATEGORIES = [
  { n: 1, title: 'Faith in & Devotion to Jesus Christ / Relationship with the Godhead', items: 12, kind: 'scale_1_7' },
  { n: 2, title: 'Love & Charity', items: 9, kind: 'scale_1_7' },
  { n: 3, title: 'Humility, Meekness & Teachability', items: 8, kind: 'scale_1_7' },
  { n: 4, title: 'Integrity, Virtue & Purity', items: 8, kind: 'scale_1_7' },
  { n: 5, title: 'Patience, Temperance & Self-Mastery', items: 8, kind: 'scale_1_7' },
  { n: 6, title: 'Mercy, Forgiveness & Compassion', items: 8, kind: 'scale_1_7' },
  { n: 7, title: 'Peacemaking & Christlike Relationships', items: 9, kind: 'scale_1_7' },
  { n: 8, title: 'Faithfulness, Courage & Steadfastness in Doing Good', items: 8, kind: 'scale_1_7' },
  { n: 9, title: 'Hope, Gratitude, Joy & Peace in Christ', items: 10, kind: 'scale_1_7' },
  { n: 10, title: 'Service, Generosity & Stewardship', items: 8, kind: 'scale_1_7' },
  { n: 11, title: 'Daily Discipleship & Spiritual Devotion', items: 6, kind: 'scale_1_7' },
  { n: 12, title: 'Covenant Faithfulness & Consecration', items: 9, kind: 'covenant_4state' },
];

const INSTRUMENT_VERSION = '1.0';
const PLACEHOLDER = '[PLACEHOLDER — awaiting verified extraction from the source Word/PDF document; do not treat as real content]';

const categories = CATEGORIES.map((c) => ({
  id: String(c.n),
  instrument_version: INSTRUMENT_VERSION,
  order: c.n,
  title: c.title,
  intro: PLACEHOLDER,
  response_kind: c.kind,
  item_count: c.items,
}));

const questions = [];
for (const c of CATEGORIES) {
  for (let i = 1; i <= c.items; i++) {
    const base = {
      id: `${c.n}.${i}`,
      instrument_version: INSTRUMENT_VERSION,
      category_id: String(c.n),
      order: i,
      title: PLACEHOLDER,
      prompt: PLACEHOLDER,
      timeframe_text: PLACEHOLDER,
      scripture_references: [],
      christ_example: PLACEHOLDER,
      reflection_prompt: PLACEHOLDER,
      source_locator: PLACEHOLDER,
      review_status: 'placeholder',
    };
    if (c.kind === 'scale_1_7') {
      base.anchors = { 1: PLACEHOLDER, 4: PLACEHOLDER, 7: PLACEHOLDER };
    } else {
      base.covenant_choices = ['NEEDS_ATTENTION', 'STRIVING_FAITHFULLY', 'DEEPLY_ROOTED', 'NOT_YET_APPLICABLE'];
    }
    questions.push(base);
  }
}

const item_count_by_category = Object.fromEntries(CATEGORIES.map((c) => [String(c.n), c.items]));

const instrument = {
  id: 'nearertohim',
  version: INSTRUMENT_VERSION,
  tradition_id: 'lds',
  status: 'draft',
  content_status: 'placeholder',
  source_file_fingerprint: null, // set only once real content is human-verified (Phase 0)
  checksum_algorithm: 'sha256',
  item_count_by_category,
  intro: PLACEHOLDER,
  instructions: PLACEHOLDER,
  disclaimer:
    'Independent, noncommercial personal discipleship project. No Church sponsorship or endorsement. This is a reflective tool, not a judgment.',
  scoring_policy_version: '1.0',
  published_at: null,
  categories,
  questions,
};

writeFileSync(outPath, JSON.stringify(instrument, null, 2) + '\n');

const total = questions.length;
console.log(`Wrote ${outPath}`);
console.log(`Categories: ${categories.length}, Questions: ${total} (expected 103: ${total === 103 ? 'OK' : 'MISMATCH'})`);
