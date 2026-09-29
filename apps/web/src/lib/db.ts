import Dexie, { type EntityTable } from 'dexie';
import type { AnswerValue } from '@nearertohim/scoring';

/**
 * Device-local storage, per blueprint Section 6 + the v1.2 review's
 * additions (finalize_method). Versioned so future schema changes are
 * real Dexie migrations, not silent breakage — see MIGRATION NOTES below
 * before ever bumping DB_VERSION.
 *
 * Note encryption (Web Crypto, from the v1.2 review) is intentionally NOT
 * wired in yet for this first buildable slice — `note_ciphertext` is
 * stored as plain text for now, clearly labeled below, so it's an
 * explicit decision to pick up before shipping beyond your own device.
 */

export interface SessionRow {
  id: string;
  instrument_version: string;
  started_at: string;
  completed_at?: string;
  status: 'draft' | 'complete' | 'finished_with_unanswered';
  finalize_method?: 'complete' | 'finished_with_unanswered';
  scoring_policy_version: string;
}

export interface AnswerRow {
  /** Composite key `${session_id}:${question_id}` set as `id`. */
  id: string;
  session_id: string;
  question_id: string;
  value: AnswerValue;
  // TODO before any multi-device or shared-storage use: encrypt this with
  // Web Crypto (AES-GCM), per the v1.2 architecture review's "local note
  // encryption" recommendation. Plain text is acceptable only for this
  // single-user, local-only, on-your-own-device build.
  note_plaintext?: string;
  answered_at: string;
  updated_at: string;
}

class NearerToHimDB extends Dexie {
  sessions!: EntityTable<SessionRow, 'id'>;
  answers!: EntityTable<AnswerRow, 'id'>;

  constructor() {
    super('nearertohim');
    // MIGRATION NOTES: this is version 1. When the schema changes, add a
    // new `.version(N).stores({...}).upgrade(tx => {...})` block below
    // rather than editing this one, so existing sessions/answers on a
    // person's device survive the upgrade (Phase 2 exit test).
    this.version(1).stores({
      sessions: 'id, status, started_at',
      answers: 'id, session_id, question_id',
    });
  }
}

export const db = new NearerToHimDB();

export function answerRowId(sessionId: string, questionId: string): string {
  return `${sessionId}:${questionId}`;
}
