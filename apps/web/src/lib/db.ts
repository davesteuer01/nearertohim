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

/**
 * M2 mentor layer — 30 Sep 2026 decision. Modeled on Resolyra's CoachMemory
 * shape, but rebuilt natively here (not a Base44 remix) so it stays local
 * to the device, consistent with the same privacy-first architecture as
 * everything else in this app. `memory_type` is deliberately narrower than
 * Resolyra's — no behavior-inference or mood-detection categories — because
 * Section 7's rule against inferring spiritual standing from behavior
 * applies here too: everything in this table is something the person
 * stated about themselves, never something derived from their answers or
 * usage patterns.
 */
export interface MentorMemoryRow {
  id: string;
  memory_type: 'goal' | 'motivation' | 'barrier' | 'preference' | 'context' | 'privacy_boundary';
  category_id?: string; // optional link to one of the instrument's 12 categories
  title: string;
  detail: string;
  created_at: string;
  updated_at: string;
}

/**
 * "Where I see myself" — the person's own notation of their current state
 * for a category, distinct from a score. Always self-declared text, never
 * generated or inferred by the app. category_id links to the instrument's
 * category ids; talk_ids records which conference talks (if any) the
 * person was pointed to alongside this note.
 */
export interface DoctrinalStateNoteRow {
  id: string;
  category_id: string;
  session_id?: string;
  state_text: string;
  talk_ids: string[];
  created_at: string;
  updated_at: string;
}

/** Freeform journal/notes, optionally tied to a category or question. */
export interface JournalEntryRow {
  id: string;
  category_id?: string;
  question_id?: string;
  text: string;
  created_at: string;
  updated_at: string;
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
  mentorMemory!: EntityTable<MentorMemoryRow, 'id'>;
  doctrinalStateNotes!: EntityTable<DoctrinalStateNoteRow, 'id'>;
  journalEntries!: EntityTable<JournalEntryRow, 'id'>;

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
    this.version(3).stores({
      sessions: 'id, status, started_at',
      answers: 'id, session_id, question_id',
      access: 'id',
      mentorMemory: 'id, memory_type, category_id',
      doctrinalStateNotes: 'id, category_id, session_id',
      journalEntries: 'id, category_id, question_id, created_at',
    });
  }
}

export const db = new NearerToHimDB();

export function answerRowId(sessionId: string, questionId: string): string {
  return `${sessionId}:${questionId}`;
}
