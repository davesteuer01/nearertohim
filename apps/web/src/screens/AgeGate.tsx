import { useState } from 'react';
import { db, type AccessRow } from '../lib/db';

const CONSENT_STATEMENT_VERSION = '1.0';

/**
 * Launch-time age gate + guardian consent, per Dave's 29 Sep 2026 decision:
 * 18+ to begin, with a guardian-consent path for a minor rather than a
 * flat lockout. Shown once per device before Home; recorded in the
 * `access` table (see lib/db.ts) so it never repeats after the first visit.
 */
export function AgeGate({ onDone }: { onDone: () => void }) {
  const [path, setPath] = useState<'ask' | 'guardian-form'>('ask');
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmAdult() {
    const row: AccessRow = {
      id: 'device',
      status: 'adult_confirmed',
      confirmed_at: new Date().toISOString(),
    };
    await db.access.put(row);
    onDone();
  }

  async function submitGuardianConsent() {
    if (!guardianName.trim() || !guardianEmail.trim() || !relationship.trim() || !attested) {
      setError('Every field is needed, and the consent statement has to be checked, before continuing.');
      return;
    }
    const now = new Date().toISOString();
    const row: AccessRow = {
      id: 'device',
      status: 'minor_with_guardian_consent',
      confirmed_at: now,
      guardian_consent: {
        guardian_name: guardianName.trim(),
        guardian_email: guardianEmail.trim(),
        relationship_to_minor: relationship.trim(),
        consent_statement_version: CONSENT_STATEMENT_VERSION,
        consented_at: now,
      },
    };
    await db.access.put(row);
    onDone();
  }

  if (path === 'guardian-form') {
    return (
      <div className="screen">
        <h1>A parent or guardian's consent</h1>
        <p className="muted">
          Because this reflects on personal, faith-centered material, a person under 18 needs a parent or guardian
          to review this app and agree before using it — not as a formality, but so an adult who knows this person
          is aware of what they're doing here.
        </p>
        <div className="card">
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span className="muted" style={{ display: 'block', marginBottom: 4 }}>
              Parent/guardian full name
            </span>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span className="muted" style={{ display: 'block', marginBottom: 4 }}>
              Parent/guardian email
            </span>
            <input
              type="email"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span className="muted" style={{ display: 'block', marginBottom: 4 }}>
              Relationship to the person using this app
            </span>
            <input
              type="text"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. parent, legal guardian"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              style={{ marginTop: 4 }}
            />
            <span>
              I am this person's parent or legal guardian. I have reviewed this app — a private, non-judgmental
              self-assessment tool with no accounts, no sharing, and no leader visibility into any answer — and I
              consent to their use of it.
            </span>
          </label>
          {error && (
            <p className="muted" style={{ color: 'var(--accent-strong)' }}>
              {error}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => setPath('ask')}>
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={submitGuardianConsent}>
            Give consent & continue
          </button>
        </div>
        <p className="muted" style={{ fontSize: '0.8rem' }}>
          This consent is recorded on this device only — it isn't verified against any ID or sent anywhere. That
          limit is worth knowing plainly rather than implying more certainty than this first version actually has.
        </p>
      </div>
    );
  }

  return (
    <div className="screen" style={{ alignItems: 'center', textAlign: 'center' }}>
      <h1>Before you begin</h1>
      <p className="muted" style={{ maxWidth: '34rem' }}>
        This app is currently intended for people 18 and older. If you're younger than that, you can still use it —
        with a parent or guardian's consent first.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={confirmAdult}>
          I am 18 or older
        </button>
        <button type="button" className="btn" onClick={() => setPath('guardian-form')}>
          I am under 18
        </button>
      </div>
    </div>
  );
}
