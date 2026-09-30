# Nearer to Him

Working name for the app formerly called "Becoming Like Jesus" (domain: nearertohim.com / .org).
A private, non-judgmental self-assessment tool for reflecting on your walk with Christ.
Independent, noncommercial project. No Church sponsorship or endorsement.

This repo is the **first buildable slice** described in the v1.2 architecture review and build
plan (see the Claude Docs design document for the full reasoning). It is deliberately narrower
than the full product: no accounts, no sync, no AI companion, no attribute library, no journal —
just enough to prove the core loop (assessment → hidden score → history) is trustworthy and calm
to use on your own device.

## What's real right now

- **`packages/scoring`** — the pure scoring engine. Every worked example from the blueprint's
  Section 4 (all-7s → 100, all-1s → 0, the [1,7] → 50 pair, the covenant mix → 50, the 4-of-7 vs.
  3-of-7 eligibility boundary, the 100/50 → 75 equal-weight overall) is an automated test, and it
  passes at 100% branch coverage. This also includes the `overallScore` aggregation function the
  original blueprint described in prose but never wrote in code — that gap is closed here.
- **`packages/content`** — the instrument schema (Zod), a bundle-integrity fingerprint check,
  and a shape self-check (category counts must match their own manifest). Fails closed on any
  mismatch: it will throw rather than let the app score against unverified content.
- **`apps/web`** — a working React + TypeScript PWA shell: Home → full assessment (linear,
  autosaving to IndexedDB via Dexie) → mandatory unanswered-item review before finishing →
  gentle transition → reflection result (score shown directly, unapologetically, always preceded
  by the "not a measure of your worth" statement — never shown as "closer to Christ") → History.
  Builds cleanly with `vite build`.

## Content status: real text, pending your sign-off

`packages/content/src/instrument-1.0.json` now holds the **real 103-question instrument**,
extracted verbatim from your source Word document
(`Becoming_Like_Jesus_Beta_1.0.docx`) by `/home/claude/extract_instrument.py` (a `python-docx`
script that walks the document in order and pulls every question's title, prompt, anchors,
scripture references, Christ example/teaching, and reflection prompt — plus the front-matter
intro/instructions/disclaimer and the back-matter "Now Set the Score Aside" closing text,
`outro`, quoted verbatim). Nothing is paraphrased, corrected, or invented; every field is the
document's own words.

All 103 items are present with the correct category/count split
(12/9/8/8/8/8/9/8/10/8/6/9 = 103, matching the source exactly) and the correct response type per
category (scale 1–7 for categories 1–11, the four-state covenant scale for category 12). Spot
checks against the 54-page reference PDF (categories 1 and 12, multiple items each) found zero
drift between the editable Word source and the rendered PDF.

This is **not yet Phase 0 complete**, though. The blueprint's Phase 0 exit test is a *human*
verifying all 103 IDs, category counts, source wording, anchor completeness, scripture
references, and special instructions against the PDF — line by line, by you. The script has only
done the extraction half. So every question is marked `review_status: "pending"` and the
instrument as a whole is `content_status: "extracted_pending_review"` — a distinct, honest status
from both `"placeholder"` (fake text) and `"human_verified"` (your sign-off recorded). The app's
Home screen shows a banner reflecting exactly that: real wording, not yet your final check.

## Doctrinal source policy (Dave's standing decision, 29 Sep 2026)

`scripture_references` on every question is **canon only** — Old Testament, New Testament, Book
of Mormon, Doctrine and Covenants, Pearl of Great Price. This canon must always be sufficient on
its own to satisfy the doctrinal-reference criteria for every item; nothing in this instrument
ever depends on anything beyond it to be complete or accurate. General conference talks are
secondary, optional, supplemental material only — for pondering/further reading, never required
— and have their own separate schema field, `supplemental_references`, so they can never be
confused with or silently substituted for canon. v1.0 carries none yet; that field is empty
everywhere by design.

While re-verifying the canon-only rule, the extraction script was found to have a real citation
bug: the source uses `;` both between different books *and* between two citations in the same
book with the book name dropped the second time (e.g. `Ephesians 5:25; 6:1-4` means Ephesians
5:25 and Ephesians 6:1-4). The naive split silently produced 13 bare, unattributed citations
like `84:33-44` and `60:13`. Fixed in `scripts/extract_instrument.py` (a bare `chapter:verse`
fragment now inherits the previous fragment's book name) and re-extracted; counts are unchanged
(103 items, same 12/9/8/8/8/8/9/8/10/8/6/9 split). Covered by an automated regression test in
`packages/content/src/index.test.ts`.

Once you've done that page-by-page review, flip `content_status` to `"human_verified"`, set each
verified question's `review_status` to `"verified"`, and the bundle's `source_file_fingerprint`
should be computed and stored (see `packages/content/src/fingerprint.ts`) so future loads fail
closed if the content ever drifts from what you verified.

## M2 phase: mentor, conference talks, journal (Dave's standing decision, 30 Sep 2026)

M1 is the baseline self-assessment (the 103-question instrument and score). M2 answers "now I
have a score, what do I do with this" — a per-category mentor screen reachable from the result
screen's "Reflect further" link, with:

- A self-declared "where do I see myself right now" note (never generated or inferred).
- Curated general-conference talks for that category's topic.
- A running journal.

All three are local-only, in the person's own words, stored in new Dexie tables
(`mentorMemory`, `doctrinalStateNotes`, `journalEntries` — v3 migration, additive).

**Conference-talk corpus** (`packages/content/src/conference-talks-1.0.json`): each talk's
`primary_topic_category_id` is taken verbatim from the Church's own official general-conference
topic index pages (`source: "official_topic_index"`, `topic_index_url` recorded per talk and
verified live) — a topic classification, never a doctrinal value judgment made by this app. As
of 30 Sep 2026 (`bundle_version: "1.1"`) all 12 categories have curated talks, 3 each (36 total).
`content_status` stays `"curated_starter_slice"`: this is still a hand-picked sample per
category, not the full 1985-present archive Dave has asked for — the in-app disclosure says so
plainly rather than implying more coverage than exists.

## What isn't built yet, deliberately

Per the recommended build-first slice: the attribute library, focus journeys, daily reflection,
scripture encounter, the trend/heat-map view, note encryption, accounts/sync, and the AI companion
are all out of scope for this slice. They're specified in the design document, not this repo.

The M2 conference-talk corpus is a curated sample (3 talks/category), not the full 1985-present
archive; the "review and assist" mentor is still static curated content and links, not yet a live
AI conversation (that needs a real architecture decision — see below).

## Running it

```bash
npm install
npm test                 # scoring (14 tests, 100% branch coverage) + content (5 tests)
npm run build:web        # type-checks and builds apps/web to apps/web/dist
npm run dev:web          # local dev server
```

## Repo layout

```
packages/
  scoring/   pure functions only — categoryScore, overallScore, scoreSession
  content/   Zod schema, fingerprint check, shape self-check, placeholder instrument JSON
apps/
  web/       the React PWA shell
```
