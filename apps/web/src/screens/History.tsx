import { useEffect, useState } from 'react';
import { db, type SessionRow } from '../lib/db';

export function History({ onOpen, onHome }: { onOpen: (sessionId: string) => void; onHome: () => void }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    db.sessions
      .toArray()
      .then((rows) => setSessions(rows.filter((r) => r.status !== 'draft').sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))));
  }, []);

  return (
    <div className="screen">
      <h2>History</h2>
      {sessions.length === 0 && <p className="muted">No finished assessments yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sessions.map((s) => (
          <button key={s.id} type="button" className="card" style={{ textAlign: 'left' }} onClick={() => onOpen(s.id)}>
            <div>{s.completed_at ? new Date(s.completed_at).toLocaleDateString() : 'In progress'}</div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              {s.finalize_method === 'finished_with_unanswered' ? 'Finished with unanswered items' : 'Complete'} ·
              instrument v{s.instrument_version}
            </div>
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-quiet" onClick={onHome}>
        ← Home
      </button>
    </div>
  );
}
