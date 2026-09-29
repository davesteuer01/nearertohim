/**
 * Bundle integrity, per the v1.2 architecture review: compute a fingerprint
 * of the canonical instrument content at build time, and verify it at
 * load time before anything is allowed to score against it. On mismatch,
 * fail closed — never score against unverified content.
 *
 * Uses Web Crypto's SubtleCrypto, available in both browsers and modern
 * Node, so the same function runs at build time (Node) and load time
 * (the PWA).
 */

async function sha256Hex(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Fingerprint is computed over categories + questions only — never over
 * mutable metadata like published_at, so re-publishing with the same
 * content doesn't spuriously change the fingerprint. */
export async function computeFingerprint(instrument: {
  categories: unknown;
  questions: unknown;
}): Promise<string> {
  const canonical = JSON.stringify({ categories: instrument.categories, questions: instrument.questions });
  return sha256Hex(canonical);
}

export async function verifyFingerprint(instrument: {
  categories: unknown;
  questions: unknown;
  source_file_fingerprint: string | null;
}): Promise<{ ok: true } | { ok: false; expected: string | null; actual: string }> {
  const actual = await computeFingerprint(instrument);
  if (instrument.source_file_fingerprint === null) {
    // Placeholder content has no fingerprint yet — this is allowed only
    // while content_status === 'placeholder' (enforced by the caller).
    return { ok: true };
  }
  if (actual !== instrument.source_file_fingerprint) {
    return { ok: false, expected: instrument.source_file_fingerprint, actual };
  }
  return { ok: true };
}
