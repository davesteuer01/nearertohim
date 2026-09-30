import { useEffect, useState } from 'react';
import type { Instrument } from '@nearertohim/content';
import { getConferenceTalks, talksForCategory } from '../lib/conferenceTalks';
import { db } from '../lib/db';

const MONTH_LABEL: Record<string, string> = { '04': 'April', '10': 'October' };

/**
 * M2 mentor screen — per Dave's 30 Sep 2026 decision. For one category:
 * conference talks whose PRIMARY TOPIC (per the Church's own official
 * topic index, never a value Claude assigns) matches this category, a
 * place to note where the person sees themselves right now, and a
 * journal/notes area. Everything written here is the person's own words,
 * saved locally, never generated or inferred from their answers.
 */
export function MentorCategory({
  instrument,
  categoryId,
  sessionId,
  onBack,
}: {
  instrument: Instrument;
  categoryId: string;
  sessionId?: string;
  onBack: () => void;
}) {
  const category = instrument.categories.find((c) => c.id === categoryId);
  const [talks, setTalks] = useState<ReturnType<typeof talksForCategory> | null>(null);
  const [bundleStatus, setBundleStatus] = useState<string | null>(null);
  const [stateText, setStateText] = useState('');
  const [journalText, setJournalText] = useState('');
  const [savedNote, setSavedNote] = useState(false);
  const [savedJournal, setSavedJournal] = useState(false);

  useEffect(() => {
    getConferenceTalks().then((bundle) => {
      setTalks(talksForCategory(bundle, categoryId));
      setBundleStatus(bundle.content_status);
    });
  }, [categoryId]);

  async function saveStateNote() {
    if (!stateText.trim()) return;
    const now = new Date().toISOString();
    await db.doctrinalStateNotes.add({
      id: `${categoryId}:${now}`,
      category_id: categoryId,
      session_id: sessionId,
      state_text: stateText.trim(),
      talk_ids: (talks ?? []).map((t) => t.id),
      created_at: now,
      updated_at: now,
    });
    setStateText('');
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2500);
  }

  async function saveJournal() {
    if (!journalText.trim()) return;
    const now = new Date().toISOString();
    await db.journalEntries.add({
      id: `${categoryId}:${now}`,
      category_id: categoryId,
      text: journalText.trim(),
      created_at: now,
      updated_at: now,
    });
    setJournalText('');
    setSavedJournal(true);
    setTimeout(() => setSavedJournal(false), 2500);
  }

  return (
    <div className="screen">
      <button type="button" className="btn btn-quiet" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        ← Back
      </button>
      <h2>{category?.title ?? categoryId}</h2>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Where do I see myself right now?</h3>
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Not a score — your own words, at this moment, about this part of your walk with Christ. Nothing here is
          read by anyone but you, and nothing here is generated for you.
        </p>
        <textarea
          value={stateText}
          onChange={(e) => setStateText(e.target.value)}
          rows={4}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
          placeholder="Right now, this feels to me like..."
        />
        <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={saveStateNote}>
            Save
          </button>
          {savedNote && <span className="muted">Saved.</span>}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Conference talks on this topic</h3>
        {bundleStatus === 'curated_starter_slice' && (
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            This is a starting slice, not the full conference archive — more talks are added over time. Topic
            classification comes directly from the Church's own general-conference topic pages, never assigned by
            this app.
          </p>
        )}
        {talks === null ? (
          <p className="muted">Loading…</p>
        ) : talks.length === 0 ? (
          <p className="muted">No curated talks for this category yet.</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {talks.map((t) => (
              <li key={t.id} style={{ marginBottom: 8 }}>
                <strong>{t.title}</strong> — {t.speaker} ({MONTH_LABEL[t.conference_month]} {t.conference_year})
                <br />
                <a href={t.topic_index_url} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: '0.85rem' }}>
                  See on churchofjesuschrist.org
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Journal</h3>
        <textarea
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
          rows={4}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
          placeholder="Write anything you want to remember from this..."
        />
        <div style={{ marginTop: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" className="btn" onClick={saveJournal}>
            Save note
          </button>
          {savedJournal && <span className="muted">Saved.</span>}
        </div>
      </div>
    </div>
  );
}
