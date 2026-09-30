import { useEffect, useState } from 'react';
import type { Instrument } from '@nearertohim/content';
import { scoreSession, roundForDisplay, type AnswerValue } from '@nearertohim/scoring';
import { db, type SessionRow } from '../lib/db';
import { toCategoryDefinitions } from '../lib/instrument';

export function ReflectionResult({
  instrument,
  sessionId,
  onHome,
  onOpenMentor,
}: {
  instrument: Instrument;
  sessionId: string;
  onHome: () => void;
  onOpenMentor: (categoryId: string) => void;
}) {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [result, setResult] = useState<ReturnType<typeof scoreSession> | null>(null);
  const [settled, setSettled] = useState(false); // the "now set the score aside" beat
  const [promptText, setPromptText] = useState('');
  const [promptSaved, setPromptSaved] = useState(false);

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
    // The source document's own "Now Set the Score Aside" closing section, quoted verbatim
    // (see instrument.outro) rather than paraphrased — per the project's rule that nothing in
    // this app invents doctrine or wording. outro[0] is the heading itself; the rest is body.
    const outro = instrument.outro && instrument.outro.length > 1 ? instrument.outro : null;

    return (
      <div className="screen" style={{ alignItems: 'center', textAlign: 'center' }}>
        {outro ? (
          <>
            <h2 style={{ marginBottom: 0 }}>{outro[0]}</h2>
            <div style={{ maxWidth: '38rem' }}>
              {outro.slice(1).map((line, i) => {
                const isShout = line === line.toUpperCase() && /[A-Z]/.test(line) && line.length > 3;
                const isQuote = line.startsWith('"');
                return (
                  <p
                    key={i}
                    style={{
                      fontWeight: isShout ? 700 : undefined,
                      fontStyle: isQuote ? 'italic' : undefined,
                      fontSize: isShout ? '1.15rem' : undefined,
                    }}
                  >
                    {line}
                  </p>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: '1.1rem' }}>
              Now set the score aside for a moment.
            </p>
            <p>
              What matters most is what you noticed while answering — not a number. Take a breath before you look at
              anything else.
            </p>
          </>
        )}
        <button type="button" className="btn btn-primary" onClick={() => setSettled(true)}>
          Continue
        </button>
      </div>
    );
  }

  const catById = Object.fromEntries(instrument.categories.map((c) => [c.id, c]));
  const finalizeLabel =
    session.finalize_method === 'finished_with_unanswered' ? 'Finished with unanswered items' : 'Complete';

  async function savePrompt() {
    if (!promptText.trim()) return;
    const now = new Date().toISOString();
    await db.journalEntries.add({
      id: `session:${sessionId}:${now}`,
      text: promptText.trim(),
      created_at: now,
      updated_at: now,
    });
    setPromptText('');
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2500);
  }

  return (
    <div className="screen">
      <h2>Your reflection</h2>
      <p className="muted">
        {finalizeLabel} · {result.coverage.answered} of {result.coverage.applicable} applicable questions answered ·
        instrument v{instrument.version}
      </p>

      <div className="card">
        <p>What is one thing you feel prompted to notice, study, repent of, practice, or change?</p>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
          placeholder="Write it here to keep it..."
        />
        <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" className="btn" onClick={savePrompt}>
            Save
          </button>
          {promptSaved && <span className="muted">Saved.</span>}
        </div>
      </div>

      {/*
        Shown directly, unapologetically — per the leadership consensus of 29 Sep 2026: a
        person can't be honest with themselves about where they are if the number is hidden
        behind a click. The disclaimer below is what carries the care, not a hide/reveal step.
      */}
      <div className="card">
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          This score is not a measure of your worth, and it never measures your standing before
          God. It exists for one reason: to help point you to the material and practices that can
          best serve you right now, wherever "right now" honestly is. Presented with the same
          love regardless of the number.
        </p>
        <h3>Overall: {result.overall === null ? 'Not enough answered yet' : `${roundForDisplay(result.overall)}`}</h3>
        <ul style={{ paddingLeft: 18 }}>
          {Object.entries(result.categories).map(([catId, cat]) => (
            <li key={catId} style={{ marginBottom: 4 }}>
              {catById[catId]?.title ?? catId}:{' '}
              {cat.score === null ? 'not enough answered' : roundForDisplay(cat.score)}
              {!cat.eligible && cat.score !== null && ' (below the coverage threshold — shown for reference only)'}
              {' · '}
              <button
                type="button"
                className="btn btn-quiet"
                style={{ padding: '2px 0', minHeight: 'auto', fontSize: '0.85rem' }}
                onClick={() => onOpenMentor(catId)}
              >
                Reflect further →
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="btn btn-quiet" onClick={onHome}>
        ← Home
      </button>
    </div>
  );
}
