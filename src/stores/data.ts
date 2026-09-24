import { reactive, ref } from 'vue';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { fetchAll, supabase } from '../lib/supabase';
import type { Goal, Meeting, Member, Note, Player, Settings, Staff } from '../lib/types';

type Row = { id: string };
type ListKey = 'members' | 'staff' | 'players' | 'meetings' | 'notes' | 'goals';
const TABLES: Record<string, ListKey | 'settings'> = {
  members: 'members', staff: 'staff', players: 'players', meetings: 'meetings',
  meeting_notes: 'notes', goals: 'goals', settings: 'settings',
};

export const db = reactive({
  loaded: false,
  live: 'offline' as 'connecting' | 'live' | 'offline',
  settings: null as Settings | null,
  members: [] as Member[],
  staff: [] as Staff[],
  players: [] as Player[],
  meetings: [] as Meeting[],
  notes: [] as Note[],
  goals: [] as Goal[],
  /** id -> ms timestamp, for rows that arrived live from someone else */
  fresh: {} as Record<string, number>,
});

const FRESH_MS = 90_000;
const clock = ref(Date.now());
setInterval(() => (clock.value = Date.now()), 5_000);
/** True for ~90s after a row arrives live from someone else. */
export const isFresh = (id: string) => (db.fresh[id] ?? 0) > clock.value - FRESH_MS;
/** Changes when a row arrives live — use in :key to replay the highlight. */
export const freshKey = (id: string) => `${id}:${db.fresh[id] ?? 0}`;

// Rows this tab just wrote, so their realtime echo isn't flagged as "new".
const mine = new Map<string, number>();
const markMine = (id: string) => mine.set(id, Date.now());

function upsert<T extends Row>(list: T[], row: T) {
  const i = list.findIndex(x => x.id === row.id);
  if (i >= 0) list[i] = row;
  else list.push(row);
}
function drop<T extends Row>(list: T[], id: string) {
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) list.splice(i, 1);
}

export async function loadAll() {
  const [settings, members, staff, players, meetings, notes, goals] = await Promise.all([
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
    fetchAll<Member>('members', 'name'),
    fetchAll<Staff>('staff', 'sort'),
    fetchAll<Player>('players', 'sort'),
    fetchAll<Meeting>('meetings', 'meeting_date'),
    fetchAll<Note>('meeting_notes', 'created_at'),
    fetchAll<Goal>('goals', 'updated_at'),
  ]);
  if (settings.error) throw settings.error;
  Object.assign(db, { settings: settings.data, members, staff, players, meetings, notes, goals, loaded: true });
}

export function clearData() {
  Object.assign(db, {
    loaded: false, settings: null, members: [], staff: [], players: [], meetings: [], notes: [], goals: [], fresh: {},
  });
}

// ------------------------------------------------------------------ realtime

let channel: RealtimeChannel | null = null;

function apply(table: string, p: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  const key = TABLES[table];
  if (!key) return;
  if (key === 'settings') {
    if (p.eventType !== 'DELETE') db.settings = p.new as unknown as Settings;
    return;
  }
  const list = db[key] as unknown as Row[];
  if (p.eventType === 'DELETE') {
    const id = (p.old as Partial<Row>).id;
    if (id) drop(list, id);
    return;
  }
  const row = p.new as unknown as Row;
  upsert(list, row);
  const t = mine.get(row.id);
  if (!t || Date.now() - t > 15_000) {
    db.fresh[row.id] = Date.now();
    clock.value = Date.now();
  }
}

export function startLive() {
  stopLive();
  db.live = 'connecting';
  const ch = supabase.channel('mine-live');
  for (const table of Object.keys(TABLES)) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, p => apply(table, p));
  }
  ch.subscribe(status => {
    if (status === 'SUBSCRIBED') {
      const reconnect = db.live === 'offline';
      db.live = 'live';
      if (reconnect && db.loaded) loadAll().catch(() => {}); // catch up on anything missed while offline
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      db.live = 'offline';
    }
  });
  channel = ch;
}

export function stopLive() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  db.live = 'offline';
}

// ------------------------------------------------------------------ writes
// Each write updates local state from the returned row right away; the
// realtime echo that follows is idempotent.

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function save<T extends Row>(table: string, list: T[], row: Partial<T>): Promise<T> {
  const { id, ...rest } = row as Partial<T> & { id?: string };
  const fields = rest as never; // untyped client: tables aren't generated types
  const q = id
    ? supabase.from(table).update(fields).eq('id', id).select().single()
    : supabase.from(table).insert(fields).select().single();
  const saved = must<T>(await q);
  markMine(saved.id);
  upsert(list, saved);
  return saved;
}

async function remove<T extends Row>(table: string, list: T[], id: string) {
  must(await supabase.from(table).delete().eq('id', id));
  drop(list, id);
}

export const savePlayer = (p: Partial<Player>) => save('players', db.players, p);
export const deletePlayer = async (id: string) => {
  await remove('players', db.players, id);
  const gone = new Set(db.meetings.filter(m => m.player_id === id).map(m => m.id));
  db.meetings = db.meetings.filter(m => !gone.has(m.id));
  db.notes = db.notes.filter(n => !gone.has(n.meeting_id));
  db.goals = db.goals.filter(g => g.player_id !== id);
};
export const saveGoal = (g: Partial<Goal>) => save('goals', db.goals, { ...g, updated_at: new Date().toISOString() });
export const deleteGoal = (id: string) => remove('goals', db.goals, id);
export const saveStaff = (s: Partial<Staff>) => save('staff', db.staff, s);
export const deleteStaff = (id: string) => remove('staff', db.staff, id);
export const saveMeeting = (m: Partial<Meeting>) => save('meetings', db.meetings, m);
export const deleteMeeting = async (id: string) => {
  await remove('meetings', db.meetings, id);
  db.notes = db.notes.filter(n => n.meeting_id !== id);
};
export const saveNote = (n: Partial<Note>) => save('meeting_notes', db.notes, n);
export const deleteNote = (id: string) => remove('meeting_notes', db.notes, id);

export async function saveSettings(patch: Partial<Settings>) {
  const saved = must<Settings>(await supabase.from('settings').update(patch).eq('id', 1).select().single());
  db.settings = saved;
}

export interface NewMeeting {
  player: string; date: string; time: string | null; type: string; status: string; attendees: string;
  goal: string; discussed: string; nextSteps: string; nextOwner: string; nextDue: string | null;
  nextDone: boolean; clearTalkingPoints: boolean;
}

/** Creates the meeting and the caller's notes together (one transaction). */
export async function logMeeting(m: NewMeeting): Promise<string> {
  const id = must<string>(await supabase.rpc('log_meeting', {
    p_player: m.player, p_date: m.date, p_time: m.time || null, p_type: m.type, p_status: m.status,
    p_attendees: m.attendees, p_goal: m.goal, p_discussed: m.discussed, p_next_steps: m.nextSteps,
    p_next_owner: m.nextOwner, p_next_due: m.nextDue || null, p_next_done: m.nextDone,
    p_clear_talking_points: m.clearTalkingPoints,
  }));
  const [meeting, notes, player] = await Promise.all([
    supabase.from('meetings').select('*').eq('id', id).single(),
    supabase.from('meeting_notes').select('*').eq('meeting_id', id),
    supabase.from('players').select('*').eq('id', m.player).single(),
  ]);
  const row = must<Meeting>(meeting);
  markMine(row.id);
  upsert(db.meetings, row);
  for (const n of must<Note[]>(notes)) { markMine(n.id); upsert(db.notes, n); }
  const p = must<Player>(player);
  markMine(p.id);
  upsert(db.players, p);
  return id;
}

// ------------------------------------------------------------------ admin

export async function getJoinCode(): Promise<string> {
  return must<string>(await supabase.rpc('get_join_code'));
}
export async function setJoinCode(code: string) {
  must(await supabase.rpc('set_join_code', { p_code: code }));
}
