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
  gentle transition → reflection result (score hidden behind an explicit reveal, never shown as
  "closer to Christ") → History. Builds cleanly with `vite build`.

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

Once you've done that page-by-page review, flip `content_status` to `"human_verified"`, set each
verified question's `review_status` to `"verified"`, and the bundle's `source_file_fingerprint`
should be computed and stored (see `packages/content/src/fingerprint.ts`) so future loads fail
closed if the content ever drifts from what you verified.

## What isn't built yet, deliberately

Per the recommended build-first slice: the attribute library, focus journeys, daily reflection,
scripture encounter, the trend/heat-map view, note encryption, accounts/sync, and the AI companion
are all out of scope for this slice. They're specified in the design document, not this repo.

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
