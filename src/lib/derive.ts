// Everything the dashboards show is computed from the rows — never stored.
import { db } from '../stores/data';
import { daysBetween, parseISO, todayISO } from './format';
import type { Meeting, Note, Player, Tier } from './types';

export const player = (id: string) => db.players.find(p => p.id === id);
export const memberName = (id: string | null) =>
  id ? db.members.find(m => m.id === id)?.name ?? 'Former member' : 'Program notes';

export const sortedPlayers = () => [...db.players].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
export const playersIn = (group: string) => sortedPlayers().filter(p => p.player_group === group);
export const playerOrder = (p: Player) => playersIn(p.player_group).indexOf(p) + 1;

const byNewest = (a: Meeting, b: Meeting) =>
  b.meeting_date.localeCompare(a.meeting_date) || (b.meeting_time || '').localeCompare(a.meeting_time || '') ||
  b.created_at.localeCompare(a.created_at);

export function meetingsFor(playerId: string, completedOnly = false): Meeting[] {
  return db.meetings
    .filter(m => m.player_id === playerId && (!completedOnly || m.status === 'Completed'))
    .sort(byNewest);
}

/** Notes on a meeting — the original tracker's notes first, then by author name. */
export function notesFor(meetingId: string): Note[] {
  return db.notes
    .filter(n => n.meeting_id === meetingId)
    .sort((a, b) => (a.author_id ? 1 : 0) - (b.author_id ? 1 : 0) || memberName(a.author_id).localeCompare(memberName(b.author_id)));
}

export const goalsFor = (playerId: string) => db.goals.filter(g => g.player_id === playerId);

export function lastContact(playerId: string): string | null {
  return meetingsFor(playerId, true)[0]?.meeting_date ?? null;
}

export function daysSince(playerId: string): number | null {
  const d = parseISO(lastContact(playerId));
  return d ? daysBetween(d, parseISO(todayISO())!) : null;
}

export const cadenceFor = (p: Player) => db.settings?.cadence?.[p.tier] ?? 21;

export type ContactKey = 'never' | 'over' | 'soon' | 'ok';
export interface ContactState { key: ContactKey; label: string; cls: string; sort: number }

export function contactState(p: Player): ContactState {
  const ds = daysSince(p.id);
  if (ds === null) return { key: 'never', label: 'No contact yet', cls: 'never', sort: 99999 };
  const cad = cadenceFor(p);
  if (ds > cad) return { key: 'over', label: `${ds}d ago`, cls: 'due', sort: ds };
  if (ds > cad * 0.75) return { key: 'soon', label: `${ds}d ago`, cls: 'soon', sort: ds };
  return { key: 'ok', label: ds === 0 ? 'Today' : `${ds}d ago`, cls: 'ok', sort: ds };
}

export const needsAttention = (p: Player) => {
  const k = contactState(p).key;
  return k === 'over' || k === 'never';
};

export function openNextSteps(): { note: Note; meeting: Meeting }[] {
  const out: { note: Note; meeting: Meeting }[] = [];
  for (const note of db.notes) {
    if (note.next_done || !note.next_steps.trim()) continue;
    const meeting = db.meetings.find(m => m.id === note.meeting_id);
    if (meeting && meeting.status === 'Completed') out.push({ note, meeting });
  }
  return out.sort((a, b) =>
    (a.note.next_due || '9999').localeCompare(b.note.next_due || '9999') ||
    b.meeting.meeting_date.localeCompare(a.meeting.meeting_date));
}

export function recentActivity(n = 6): Meeting[] {
  return db.meetings.filter(m => m.status === 'Completed').sort(byNewest).slice(0, n);
}

/** One-line summary of a meeting for feeds: the first note that says anything. */
export function meetingSummary(meetingId: string): string {
  const notes = notesFor(meetingId);
  const n = notes.find(x => x.discussed.trim()) || notes.find(x => x.goal.trim());
  return n ? n.discussed.trim() || n.goal.trim() : '';
}

export const awaitingFirst = () => sortedPlayers().filter(p => lastContact(p.id) === null);
export const tierCount = (t: Tier) => db.players.filter(p => p.tier === t).length;
export const completedCount = () => db.meetings.filter(m => m.status === 'Completed').length;

export function tierCls(t: string): string {
  return ({ 'Contributing Now': 't-cn', 'Trending Up': 't-tu', 'Foundation Build': 't-fb' } as Record<string, string>)[t] || 't-co';
}
export const statusCls = (s: string) => 's-' + s.toLowerCase().replace(/\s+/g, '-');
export function goalPill(s: string): string {
  return s === 'Achieved' ? 'ok' : s === 'At risk' ? 'due' : s === 'On track' ? 'soon' : 'never';
}
export function goalCls(s: string): string {
  return s === 'Achieved' ? 'done' : s === 'On track' ? 'track' : s === 'Not started' ? 'none' : '';
}
