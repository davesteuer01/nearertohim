import { useEffect, useState } from 'react';
import type { Instrument } from '@nearertohim/content';
import { scoreSession, roundForDisplay, type AnswerValue } from '@nearertohim/scoring';
import { db, type SessionRow } from '../lib/db';
import { toCategoryDefinitions } from '../lib/instrument';

export function ReflectionResult({
  instrument,
  sessionId,
  onHome,
}: {
  instrument: Instrument;
  sessionId: string;
  onHome: () => void;
}) {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [result, setResult] = useState<ReturnType<typeof scoreSession> | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [settled, setSettled] = useState(false); // the "now set the score aside" beat

  useEffect(() => {
    (async () => {
      const s = await db.sessions.get(sessionId);
      const rows = await db.answers.where('session_id').equals(sessionId).toArray();
      const answers: Record<string, AnswerValue | undefined> = {};
      for (const r of rows) answers[r.question_id] = r.value;
      const catDefs = toCategoryDefinitions(instrument);
      setSession(s ?? null);
      setResult(scoreSession(catDefs, answers));
    })();
  }, [instrument, sessionId]);

  if (!session || !result) return <div className="screen">Loading…</div>;

  if (!settled) {
    return (
      <div className="screen" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p className="muted" style={{ fontSize: '1.1rem' }}>
          Now set the score aside for a moment.
        </p>
        <p>
          What matters most is what you noticed while answering — not a number. Take a breath before you look at
          anything else.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setSettled(true)}>
          Continue
        </button>
      </div>
    );
  }

  const catById = Object.fromEntries(instrument.categories.map((c) => [c.id, c]));
  const finalizeLabel =
    session.finalize_method === 'finished_with_unanswered' ? 'Finished with unanswered items' : 'Complete';

  return (
    <div className="screen">
      <h2>Your reflection</h2>
      <p className="muted">
        {finalizeLabel} · {result.coverage.answered} of {result.coverage.applicable} applicable questions answered ·
        instrument v{instrument.version}
      </p>

      <div className="card">
        <p>What is one thing you feel prompted to notice, study, repent of, practice, or change?</p>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          (Journaling that thought is optional and not built into this first slice yet — write it somewhere that's
          meaningful to you for now.)
        </p>
      </div>

      {!revealed ? (
        <button type="button" className="btn" onClick={() => setRevealed(true)}>
          Reveal the numbers
        </button>
      ) : (
        <div className="card">
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            This is a self-reported pattern on this assessment — never a measure of how close you are to Christ.
          </p>
          <h3>Overall: {result.overall === null ? 'Not enough answered yet' : `${roundForDisplay(result.overall)}`}</h3>
          <ul style={{ paddingLeft: 18 }}>
            {Object.entries(result.categories).map(([catId, cat]) => (
              <li key={catId}>
                {catById[catId]?.title ?? catId}:{' '}
                {cat.score === null ? 'not enough answered' : roundForDisplay(cat.score)}
                {!cat.eligible && cat.score !== null && ' (below the coverage threshold — shown for reference only)'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="btn btn-quiet" onClick={onHome}>
        ← Home
      </button>
    </div>
  );
}
