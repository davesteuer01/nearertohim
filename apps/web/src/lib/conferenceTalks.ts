// Same relative-import pattern as lib/instrument.ts, for the same reason:
// Vite bundles the JSON directly; the package's own Node-only
// loadConferenceTalks() reads the identical file from disk for tests.
import conferenceTalksJson from '../../../../packages/content/src/conference-talks-1.0.json';
import {
  ConferenceTalkBundleSchema,
  type ConferenceTalkBundle,
} from '../../../../packages/content/src/conference-talks-schema';

let cached: ConferenceTalkBundle | null = null;

export async function getConferenceTalks(): Promise<ConferenceTalkBundle> {
  if (cached) return cached;
  cached = deepFreeze(ConferenceTalkBundleSchema.parse(conferenceTalksJson)) as ConferenceTalkBundle;
  return cached;
}

export function talksForCategory(bundle: ConferenceTalkBundle, categoryId: string) {
  return bundle.talks.filter((t) => t.primary_topic_category_id === categoryId);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
