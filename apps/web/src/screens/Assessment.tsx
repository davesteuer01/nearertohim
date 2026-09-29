import { useEffect, useMemo, useState } from 'react';
import type { Instrument } from '@nearertohim/content';
import type { AnswerValue } from '@nearertohim/scoring';
import { flattenQuestions } from '../lib/flatten';
import { answerRowId, db } from '../lib/db';
import { PauseExit } from './PauseExit';

const SCALE_OPTIONS: AnswerValue[] = [1, 2, 3, 4, 5, 6, 7];
const COVENANT_OPTIONS: AnswerValue[] = ['NEEDS_ATTENTION', 'STRIVING_FAITHFULLY', 'DEEPLY_ROOTED'];
const COVENANT_LABELS: Record<string, string> = {
  NEEDS_ATTENTION: 'Needs Attention',
  STRIVING_FAITHFULLY: 'Striving Faithfully',
  DEEPLY_ROOTED: 'Deeply Rooted',
};

export function Assessment({
  instrument,
  sessionId,
  onExit,
  onFinished,
}: {
  instrument: Instrument;
  sessionId: string;
  onExit: () => void;
  onFinished: (method: 'complete' | 'finished_with_unanswered') => void;
}) {
  const questions = useMemo(() => flattenQuestions(instrument), [instrument]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue | undefined>>({});
  const [mode, setMode] = useState<'question' | 'review'>('question');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.answers
      .where('session_id')
      .equals(sessionId)
      .toArray()
      .then((rows) => {
        const map: Record<string, AnswerValue | undefined> = {};
        for (const r of rows) map[r.question_id] = r.value;
        setAnswers(map);
        setLoaded(true);
      });
  }, [sessionId]);

  if (!loaded) return <div className="screen">Loading your saved progress…</div>;

  const current = questions[index];
  const unanswered = questions.filter((q) => answers[q.id] === undefined);

  async function handleAnswer(value: AnswerValue) {
    const now = new Date().toISOString();
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    await db.answers.put({
      id: answerRowId(sessionId, current.id),
      session_id: sessionId,
      question_id: current.id,
      value,
      answered_at: answers[current.id] === undefined ? now : now,
      updated_at: now,
    });
  }

  async function finalize(method: 'complete' | 'finished_with_unanswered') {
    await db.sessions.update(sessionId, {
      status: method,
      finalize_method: method,
      completed_at: new Date().toISOString(),
    });
    onFinished(method);
  }

  function requestFinish() {
    if (unanswered.length === 0) {
      finalize('complete');
    } else {
      setMode('review');
    }
  }

  if (mode === 'review') {
    return (
      <div className="screen">
        <PauseExit onExit={onExit} />
        <h2>Review unanswered items</h2>
        <p className="muted">
          {unanswered.length} of {questions.length} questions don't have an answer yet — including an explicit N/E,
          which is a valid answer. You can go back and answer any of these, or finish anyway and it will be marked
          honestly as an incomplete-coverage session, never averaged in as if it were complete.
        </p>
        <div className="card">
          <ul style={{ paddingLeft: 18 }}>
            {unanswered.map((q) => (
              <li key={q.id} style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className="btn btn-quiet"
                  style={{ padding: '4px 0' }}
                  onClick={() => {
                    setIndex(questions.findIndex((x) => x.id === q.id));
                    setMode('question');
                  }}
                >
                  {q.id} — {q.categoryTitle}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => setMode('question')}>
            Keep answering
          </button>
          <button type="button" className="btn btn-primary" onClick={() => finalize('finished_with_unanswered')}>
            Finish with unanswered
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <PauseExit onExit={onExit} />
      <div className="muted" aria-live="polite">
        Question {index + 1} of {questions.length}
      </div>
      <div className="card">
        <p className="muted" style={{ marginBottom: 4 }}>
          {current.categoryTitle}
        </p>
        <h2>{current.title}</h2>
        <p>{current.prompt}</p>
        {current.timeframe_text && <p className="muted">{current.timeframe_text}</p>}

        {current.anchors && (
          <>
            <div className="scale-row" role="group" aria-label="Response, 1 to 7">
              {SCALE_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="scale-option"
                  aria-pressed={answers[current.id] === v}
                  onClick={() => handleAnswer(v)}
                  title={current.anchors?.[v as 1 | 4 | 7] ?? undefined}
                >
                  {v}
                </button>
              ))}
              <button
                type="button"
                className="scale-option"
                aria-pressed={answers[current.id] === 'NE'}
                onClick={() => handleAnswer('NE')}
              >
                N/E
              </button>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              1: {current.anchors[1]} · 4: {current.anchors[4]} · 7: {current.anchors[7]} · N/E: not
              enough recent experience to answer honestly
            </p>
          </>
        )}

        {current.covenant_choices && (
          <div className="scale-row" role="group" aria-label="Response">
            {COVENANT_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                className="scale-option"
                style={{ minWidth: 140 }}
                aria-pressed={answers[current.id] === v}
                onClick={() => handleAnswer(v)}
              >
                {COVENANT_LABELS[v as string]}
              </button>
            ))}
            <button
              type="button"
              className="scale-option"
              style={{ minWidth: 140 }}
              aria-pressed={answers[current.id] === 'NOT_YET_APPLICABLE'}
              onClick={() => handleAnswer('NOT_YET_APPLICABLE')}
            >
              Not Yet Applicable
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <button type="button" className="btn" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          Back
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => setMode('review')}>
          Review unanswered ({unanswered.length})
        </button>
        {index < questions.length - 1 ? (
          <button type="button" className="btn" onClick={() => setIndex((i) => i + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={requestFinish}>
            Finish
          </button>
        )}
      </div>
    </div>
  );
}
