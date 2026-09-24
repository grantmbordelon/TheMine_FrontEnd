const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => (n < 10 ? '0' : '') + n;

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local-midnight Date for a YYYY-MM-DD string (or a timestamp's date part). */
export function parseISO(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

export function fmtDate(s: string | null | undefined): string {
  const d = parseISO(s);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '—';
}

export function fmtShort(s: string | null | undefined): string {
  const d = parseISO(s);
  return d ? `${d.getMonth() + 1}.${d.getDate()}` : '—';
}

/** '14:30:00' -> '2:30 PM' */
export function fmtTime(t: string | null | undefined): string {
  const m = /^(\d{2}):(\d{2})/.exec(t || '');
  if (!m) return '';
  const h = +m[1];
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function pad2(n: number): string {
  return pad(n);
}
