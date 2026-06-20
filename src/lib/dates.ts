import { format, startOfDay, subDays } from 'date-fns';

export const todayKey = () => format(new Date(), 'yyyy-MM-dd');

export const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');

export const startOfTodayISO = () => startOfDay(new Date()).toISOString();

export const daysAgoKey = (n: number) => format(subDays(new Date(), n), 'yyyy-MM-dd');

/** ISO weekday: 1 = Monday … 7 = Sunday */
export const isoWeekday = (d: Date = new Date()) => {
  const day = d.getDay();
  return day === 0 ? 7 : day;
};

export const formatDuration = (minutes: number | null | undefined): string => {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export const formatMl = (ml: number): string =>
  ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)}L` : `${ml}ml`;

export const formatTimeShort = (iso: string): string => format(new Date(iso), 'h:mm a');

export const greetingForNow = (): string => {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
