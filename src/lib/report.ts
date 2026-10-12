// Present-report card text: pulled from meeting notes, then curated by hand.
import { goalsFor, meetingsFor, notesFor } from './derive';
import { fmtShort } from './format';
import type { Player } from './types';

/** Rough per-section length that keeps 5–6 cards on a printed page. */
export const TARGET = { recent: 260, upcoming: 200 };

const ts = (s: string | null | undefined) => (s ? Date.parse(s) : 0);

/** True when meetings or notes changed after this card was last pulled. */
export function hasNewNotes(p: Player): boolean {
  const meetings = meetingsFor(p.id, true);
  if (!p.report_synced_at) return meetings.length > 0 || (!p.report_upcoming && !!p.talking_points.trim());
  const t = ts(p.report_synced_at);
  return meetings.some(m => ts(m.created_at) > t || notesFor(m.id).some(n => ts(n.updated_at) > t));
}

/**
 * Fresh card text from the notes. Recent = meetings newer than the last pull (or the
 * latest one), each author's "what we talked about". Up next = the latest meeting's open
 * next steps plus the player's talking points for the next meeting.
 */
export function pullFromNotes(p: Player): Partial<Player> {
  const all = meetingsFor(p.id, true);
  let picked = p.report_as_of ? all.filter(m => m.meeting_date > p.report_as_of!) : [];
  if (!picked.length) picked = all.slice(0, 1);
  picked = picked.slice(0, 3);

  const recent = picked
    .map(m => {
      const said = notesFor(m.id).map(n => n.discussed.trim()).filter(Boolean);
      return said.length ? `${fmtShort(m.meeting_date)} — ${said.join('\n')}` : '';
    })
    .filter(Boolean)
    .join('\n\n');

  const latest = picked[0];
  const steps = latest
    ? notesFor(latest.id).filter(n => !n.next_done).map(n => n.next_steps.trim()).filter(Boolean)
    : [];
  const upcoming = [...new Set([...steps, p.talking_points.trim()])].filter(Boolean).join('\n');

  // Stamp no earlier than the newest note pulled in, so a laptop clock running behind
  // the database can't leave the card looking stale right after an update.
  const newest = Math.max(
    Date.now(),
    ...all.flatMap(m => [ts(m.created_at), ...notesFor(m.id).map(n => ts(n.updated_at))]),
  );
  return {
    report_recent: recent,
    report_upcoming: upcoming,
    report_as_of: latest?.meeting_date ?? p.report_as_of,
    report_synced_at: new Date(newest).toISOString(),
  };
}

/** Current goals for the Goals column; not-started ones read as "next goals". */
export function reportGoals(p: Player) {
  const gs = goalsFor(p.id);
  return { current: gs.filter(g => g.status !== 'Not started'), next: gs.filter(g => g.status === 'Not started') };
}
