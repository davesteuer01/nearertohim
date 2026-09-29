import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { InstrumentSchema, verifyInstrumentShape, type Instrument } from './schema.js';
import { verifyFingerprint } from './fingerprint.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const instrumentJson = JSON.parse(readFileSync(resolve(__dirname, './instrument-1.0.json'), 'utf-8'));

export * from './schema.js';
export * from './fingerprint.js';

/**
 * Loads and verifies the instrument bundle. This is the ONLY sanctioned
 * way to get instrument content into the app — never import the JSON
 * directly elsewhere. Fails closed: throws rather than returning content
 * that didn't pass schema validation, the shape self-check, or the
 * fingerprint check.
 *
 * This implementation reads from disk via node:fs, so it is meant for
 * Node contexts — tests, build scripts, and the content-freeze pipeline.
 * The web app (apps/web) bundles the same JSON through Vite's native JSON
 * import instead and runs it through the exact same `InstrumentSchema`,
 * `verifyInstrumentShape`, and `verifyFingerprint` exported here, so the
 * verification logic never forks between the two runtimes.
 */
export async function loadInstrument(): Promise<Instrument> {
  const parsed = InstrumentSchema.parse(instrumentJson);

  const shape = verifyInstrumentShape(parsed);
  if (!shape.ok) {
    throw new Error(`Instrument failed shape self-check:\n${shape.errors.join('\n')}`);
  }

  if (parsed.content_status === 'human_verified') {
    const fp = await verifyFingerprint(parsed);
    if (!fp.ok) {
      throw new Error(
        `Instrument fingerprint mismatch — refusing to score against unverified content.\nExpected: ${fp.expected}\nActual: ${fp.actual}`,
      );
    }
  }
  // content_status === 'placeholder': fingerprint intentionally not enforced yet.
  // The app must still surface a visible "placeholder content" banner —
  // see apps/web — so a placeholder build can never be mistaken for real.

  return deepFreeze(parsed) as Instrument;
}

/** Object.freeze is shallow; content correctness depends on nested
 * questions/categories being immutable too, so freeze recursively. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
