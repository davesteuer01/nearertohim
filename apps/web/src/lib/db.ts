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

/**
 * Age gate + guardian consent, per Dave's 29 Sep 2026 decision: launch is
 * 18+ by default, and a person who is under 18 may proceed only with a
 * recorded guardian consent. One row per device (singleton, id: 'device').
 * This is a first real version of the consent system, not a stub — but it
 * is intentionally still local-only (no verification that the "guardian"
 * filling this in is actually an adult, no email confirmation sent). That
 * gap is flagged explicitly in the README rather than glossed over, since
 * Section 1's "never make the judgment call alone" rule applies here too:
 * a truly verified consent flow (e.g. a confirmation email round-trip) is a
 * decision for a human reviewer to design, not something to fake locally.
 */
export interface AccessRow {
  id: 'device';
  status: 'adult_confirmed' | 'minor_with_guardian_consent';
  confirmed_at: string;
  guardian_consent?: {
    guardian_name: string;
    guardian_email: string;
    relationship_to_minor: string;
    consent_statement_version: string;
    consented_at: string;
  };
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
  access!: EntityTable<AccessRow, 'id'>;

  constructor() {
    super('nearertohim');
    // MIGRATION NOTES: additive only. Each new version adds a new
    // `.version(N).stores({...})` block rather than editing an old one, so
    // existing sessions/answers on a person's device survive the upgrade
    // (Phase 2 exit test). Dexie carries forward any store unchanged
    // between versions automatically.
    this.version(1).stores({
      sessions: 'id, status, started_at',
      answers: 'id, session_id, question_id',
    });
    this.version(2).stores({
      sessions: 'id, status, started_at',
      answers: 'id, session_id, question_id',
      access: 'id',
    });
  }
}

export const db = new NearerToHimDB();

export function answerRowId(sessionId: string, questionId: string): string {
  return `${sessionId}:${questionId}`;
}
