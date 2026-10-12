// Headshots, positions and numbers from ESPN's public 49ers roster (CORS-open).
import type { Player } from './types';

const ROSTER = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/25/roster';

interface Athlete {
  id: string;
  fullName: string;
  lastName: string;
  jersey?: string;
  position?: { abbreviation?: string };
}

let roster: Promise<Athlete[]> | null = null;
function fetchRoster(): Promise<Athlete[]> {
  roster ??= fetch(ROSTER)
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(`ESPN roster: ${r.status}`))))
    .then((d: { athletes: { items: Athlete[] }[] }) => d.athletes.flatMap(g => g.items))
    .catch(e => {
      roster = null;
      throw e;
    });
  return roster;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '').replace(/[^a-z]/g, '');

export interface EspnFields { espn_id: string; position: string; jersey: string }

/** Match by full name ("C.J." = "CJ", suffixes ignored), else by a unique last name. */
export async function lookupEspn(name: string): Promise<EspnFields | null> {
  const all = await fetchRoster();
  const key = norm(name);
  let a = all.find(x => norm(x.fullName) === key);
  if (!a) {
    const last = norm(name.trim().split(/\s+/).pop() || '');
    const hits = all.filter(x => norm(x.lastName) === last);
    a = hits.length === 1 ? hits[0] : undefined;
  }
  return a ? { espn_id: a.id, position: a.position?.abbreviation ?? '', jersey: a.jersey ?? '' } : null;
}

export function headshotUrl(p: Pick<Player, 'headshot_url' | 'espn_id'>): string {
  if (p.headshot_url) return p.headshot_url;
  if (p.espn_id) return `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${p.espn_id}.png&w=240&h=175`;
  return '';
}
