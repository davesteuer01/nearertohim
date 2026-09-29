/**
 * Persistent, low-emphasis pause/exit control — per the v1.2 review's
 * screen-flow addition: available on every screen of the assessment, not
 * only at the start, so no one has to hunt for a way out mid-question.
 */
export function PauseExit({ onExit }: { onExit: () => void }) {
  return (
    <div className="pause-exit">
      <button type="button" className="btn btn-quiet" onClick={onExit}>
        ← Pause / Home
      </button>
    </div>
  );
}
