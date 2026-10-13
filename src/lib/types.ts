export const TIERS = ['Contributing Now', 'Trending Up', 'Foundation Build', 'Carryover'] as const;
export const GROUPS = ['Rookie', 'Carryover'] as const;
export const STATUSES = ['Active', 'Injured', 'IR', 'Practice Squad'] as const;
export const MEETING_TYPES = ['1-on-1', 'Check-in', 'Coach conversation', 'Staff conversation', 'Phone / text', 'Group session'] as const;
export const MEETING_STATUSES = ['Completed', 'Planned'] as const;
export const CATEGORIES = ['Body', 'Mind', 'Football IQ', 'Technique', 'Special Teams', 'Life'] as const;
export const GOAL_STATUSES = ['Not started', 'In progress', 'On track', 'At risk', 'Achieved'] as const;

export type Tier = (typeof TIERS)[number];
export type Group = (typeof GROUPS)[number];
export type PlayerStatus = (typeof STATUSES)[number];
export type MeetingStatus = (typeof MEETING_STATUSES)[number];
export type Category = (typeof CATEGORIES)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export interface Member {
  id: string;
  name: string;
  user_id: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Settings {
  id: number;
  season: string;
  maintainers: string;
  summary: string;
  quote: string;
  quote_attrib: string;
  cadence: Record<string, number>;
  summary_bullets: string[];
  core_message?: string; // absent until migration 0005 has run
  updated_at: string;
}

export interface Staff {
  id: string;
  role: string;
  name: string;
  responsibility: string;
  sort: number;
}

export interface Player {
  id: string;
  legacy_id: string | null;
  name: string;
  player_group: Group;
  tier: Tier;
  status: PlayerStatus;
  focus: string;
  notes: string;
  talking_points: string;
  owner: string;
  sort: number;
  espn_id: string | null;
  position: string;
  jersey: string;
  headshot_url: string; // manual override; empty = ESPN headshot from espn_id
  report_recent: string;
  report_upcoming: string;
  report_as_of: string | null; // newest meeting date pulled into the report card
  report_synced_at: string | null;
  report_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  player_id: string;
  meeting_date: string; // YYYY-MM-DD
  meeting_time: string | null; // HH:MM:SS
  meeting_type: string;
  status: MeetingStatus;
  attendees: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  meeting_id: string;
  author_id: string | null; // null = notes from the original tracker
  goal: string;
  discussed: string;
  next_steps: string;
  next_owner: string;
  next_due: string | null;
  next_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  player_id: string;
  title: string;
  category: Category;
  target: string;
  status: GoalStatus;
  progress: string;
  updated_at: string;
}
