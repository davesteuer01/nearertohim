import { useEffect, useState } from 'react';
import type { Instrument } from '@nearertohim/content';
import { getInstrument } from './lib/instrument';
import { db } from './lib/db';
import { Home } from './screens/Home';
import { Assessment } from './screens/Assessment';
import { ReflectionResult } from './screens/ReflectionResult';
import { History } from './screens/History';
import { AgeGate } from './screens/AgeGate';

/**
 * crypto.randomUUID() is only defined in a secure context (https:// or
 * localhost) in every major browser — on a plain http:// origin it's
 * simply undefined, so calling it throws and silently breaks whatever
 * button triggered it. Fall back to crypto.getRandomValues() (which has
 * no such restriction) rather than depend on the app always being served
 * over https.
 */
function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Last resort — not cryptographically strong, but this app only uses the id
  // as a local IndexedDB key, never for anything security-sensitive.
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    getInstrument()
      .then(setInstrument)
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  useEffect(() => {
    db.access
      .get('device')
      .then((row) => {
        setAccessGranted(!!row);
        setAccessChecked(true);
      })
      .catch(() => setAccessChecked(true));
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

  if (!instrument || !accessChecked) {
    return <div className="screen">Loading…</div>;
  }

  if (!accessGranted) {
    return <AgeGate onDone={() => setAccessGranted(true)} />;
  }

  async function startAssessment() {
    try {
      const id = newSessionId();
      await db.sessions.add({
        id,
        instrument_version: instrument!.version,
        started_at: new Date().toISOString(),
        status: 'draft',
        scoring_policy_version: instrument!.scoring_policy_version,
      });
      setRoute({ name: 'assessment', sessionId: id });
    } catch (e) {
      // Never fail silently — a broken tap that "does nothing" is worse than
      // an honest error, since it looks like the app ignored the person.
      setError(`Couldn't start a new assessment: ${String((e as Error)?.message ?? e)}`);
    }
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
