import type { Instrument } from '@nearertohim/content';

export function Home({
  instrument,
  hasHistory,
  onBegin,
  onViewHistory,
}: {
  instrument: Instrument;
  hasHistory: boolean;
  onBegin: () => void;
  onViewHistory: () => void;
}) {
  return (
    <div className="screen">
      <header>
        <h1>Nearer to Him</h1>
        <p className="muted">
          A private, non-judgmental space to reflect on your walk with Christ. This is a reflective tool, not a
          judgment.
        </p>
      </header>

      {instrument.content_status === 'placeholder' && (
        <div className="placeholder-banner">
          This build uses placeholder question text. The real 103-question instrument has not been loaded yet — see
          Phase&nbsp;0 (source freeze) in the build plan. Nothing shown here should be treated as the actual
          assessment content.
        </div>
      )}
      {instrument.content_status === 'extracted_pending_review' && (
        <div className="placeholder-banner">
          This build uses the real question text extracted from the source document, but it has not yet had a final
          human line-by-line check against the source PDF (Phase&nbsp;0's sign-off). Treat wording as provisional
          until that review closes.
        </div>
      )}

      <div className="card">
        <h2>Full assessment</h2>
        <p className="muted">
          All {instrument.questions.length} questions, at your own pace. You can pause, skip, or leave at any time —
          nothing is required.
        </p>
        <button type="button" className="btn btn-primary" onClick={onBegin}>
          Begin the full assessment
        </button>
      </div>

      {hasHistory && (
        <div className="card">
          <h2>Your history</h2>
          <p className="muted">See how your own reflections have changed over time.</p>
          <button type="button" className="btn" onClick={onViewHistory}>
            View history
          </button>
        </div>
      )}

      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Independent, noncommercial personal discipleship project. No Church sponsorship or endorsement. Everything
        you enter stays on this device.
      </p>
    </div>
  );
}
