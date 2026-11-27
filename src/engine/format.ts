export const fmt = (n: number | null | undefined): string =>
  n == null || !Number.isFinite(n) ? '–' : Math.round(n).toLocaleString('en-IN');

export const inr = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '–';
  const rounded = Math.round(n);
  return rounded < 0
    ? '-₹' + Math.abs(rounded).toLocaleString('en-IN')
    : '₹' + rounded.toLocaleString('en-IN');
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtDate = (isoDate: string | null | undefined): string => {
  if (!isoDate || isoDate.length < 10) return isoDate || '–';
  const y = isoDate.slice(0, 4);
  const m = Number(isoDate.slice(5, 7)) - 1;
  const d = Number(isoDate.slice(8, 10));
  if (m < 0 || m > 11 || !Number.isFinite(d)) return isoDate;
  return `${MONTHS[m]} ${d}, ${y}`;
};

export const fmtTimestamp = (ts: string | null | undefined): string => {
  if (!ts) return '–';
  if (ts.length >= 16 && (ts[10] === 'T' || ts[10] === ' ')) {
    return `${fmtDate(ts.slice(0, 10))} · ${ts.slice(11, 16)}`;
  }
  return fmtDate(ts);
};

export const pct = (n: number | null | undefined): string =>
  n == null || !Number.isFinite(n) ? '–' : (n * 100).toFixed(1) + '%';

export const div = (a: number, b: number): number | null => (b ? a / b : null);

export const r2 = (n: number | null | undefined): number | null =>
  n == null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100;

export const r4 = (n: number | null | undefined): number | null =>
  n == null || !Number.isFinite(n) ? null : Math.round(n * 10000) / 10000;

export const dnum = (d: string): number =>
  Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5;

export const daysBetween = (a: string, b: string): number => dnum(b) - dnum(a);

export const addDays = (d: string, n: number): string =>
  new Date((dnum(d) + n) * 864e5).toISOString().slice(0, 10);

export const weekKey = (d: string): string =>
  addDays(d, -((new Date(dnum(d) * 864e5).getUTCDay() + 6) % 7));

export const validDate = (d: string | undefined | null): string | null =>
  d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= '2025-01-15' && d <= '2025-04-20' ? d : null;
