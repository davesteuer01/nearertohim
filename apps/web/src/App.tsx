import { useEffect, useState } from 'react';
import type { Instrument } from '@nearertohim/content';
import { getInstrument } from './lib/instrument';
import { db } from './lib/db';
import { Home } from './screens/Home';
import { Assessment } from './screens/Assessment';
import { ReflectionResult } from './screens/ReflectionResult';
import { History } from './screens/History';

type Route =
  | { name: 'home' }
  | { name: 'assessment'; sessionId: string }
  | { name: 'result'; sessionId: string }
  | { name: 'history' };

export function App() {
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    getInstrument()
      .then(setInstrument)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    db.sessions
      .where('status')
      .notEqual('draft')
      .count()
      .then((n) => setHasHistory(n > 0));
  }, [route]);

  if (error) {
    return (
      <div className="screen">
        <h1>Something needs attention before this can score anything</h1>
        <p className="muted">
          The instrument bundle failed its integrity check, so the app is refusing to proceed rather than show you a
          score it can't stand behind:
        </p>
        <pre className="card" style={{ whiteSpace: 'pre-wrap' }}>
          {error}
        </pre>
      </div>
    );
  }

  if (!instrument) {
    return <div className="screen">Loading…</div>;
  }

  async function startAssessment() {
    const id = crypto.randomUUID();
    await db.sessions.add({
      id,
      instrument_version: instrument!.version,
      started_at: new Date().toISOString(),
      status: 'draft',
      scoring_policy_version: instrument!.scoring_policy_version,
    });
    setRoute({ name: 'assessment', sessionId: id });
  }

  switch (route.name) {
    case 'home':
      return (
        <Home
          instrument={instrument}
          hasHistory={hasHistory}
          onBegin={startAssessment}
          onViewHistory={() => setRoute({ name: 'history' })}
        />
      );
    case 'assessment':
      return (
        <Assessment
          instrument={instrument}
          sessionId={route.sessionId}
          onExit={() => setRoute({ name: 'home' })}
          onFinished={() => setRoute({ name: 'result', sessionId: route.sessionId })}
        />
      );
    case 'result':
      return (
        <ReflectionResult
          instrument={instrument}
          sessionId={route.sessionId}
          onHome={() => setRoute({ name: 'home' })}
        />
      );
    case 'history':
      return (
        <History
          onOpen={(sessionId) => setRoute({ name: 'result', sessionId })}
          onHome={() => setRoute({ name: 'home' })}
        />
      );
  }
}
