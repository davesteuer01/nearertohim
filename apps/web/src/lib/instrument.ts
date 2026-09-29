// Relative import (not a package subpath) so Vite can bundle this JSON
// directly without needing an `exports` map on @nearertohim/content — the
// package's own Node-only loadInstrument() reads the identical file from
// disk for tests/build scripts. Both paths run the content through the
// exact same schema/shape/fingerprint checks below.
import instrumentJson from '../../../../packages/content/src/instrument-1.0.json';
// Imported by relative path directly into schema.ts/fingerprint.ts, not the
// package root (@nearertohim/content/src/index.ts) — that root also exports
// a Node-only loadInstrument() (node:fs) meant for tests/build scripts,
// which Vite can't bundle for the browser. Both entry points run the exact
// same schema/shape/fingerprint code; only the file-reading step differs.
import { InstrumentSchema, verifyInstrumentShape, type Instrument } from '../../../../packages/content/src/schema';
import { verifyFingerprint } from '../../../../packages/content/src/fingerprint';
import type { CategoryDefinition } from '@nearertohim/scoring';

/**
 * The app-side counterpart to @nearertohim/content's Node-only
 * loadInstrument(): same schema, same shape check, same fingerprint
 * check, but reading the JSON through Vite's bundler instead of node:fs
 * so it works in the browser. Fails closed on any check failure — see
 * the v1.2 architecture review, "bundle integrity".
 */
let cached: Instrument | null = null;

export async function getInstrument(): Promise<Instrument> {
  if (cached) return cached;

  const parsed = InstrumentSchema.parse(instrumentJson);

  const shape = verifyInstrumentShape(parsed);
  if (!shape.ok) {
    throw new Error(`Instrument failed shape self-check:\n${shape.errors.join('\n')}`);
  }

  if (parsed.content_status === 'human_verified') {
    const fp = await verifyFingerprint(parsed);
    if (!fp.ok) {
      throw new Error('Instrument fingerprint mismatch — refusing to score against unverified content.');
    }
  }

  cached = deepFreeze(parsed) as Instrument;
  return cached;
}

export function toCategoryDefinitions(instrument: Instrument): CategoryDefinition[] {
  return instrument.categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((cat) => ({
      id: cat.id,
      kind: cat.response_kind,
      items: instrument.questions.filter((q) => q.category_id === cat.id).map((q) => ({ id: q.id })),
    }));
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
