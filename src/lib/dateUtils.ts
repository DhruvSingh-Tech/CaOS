/**
 * Safe local Date utilities that avoid UTC-vs-Local timezone shifting issues.
 */

// Semester Commencement: Monday, August 3, 2026
export const SEMESTER_START_DATE = '2026-08-03';

/**
 * Format a Date object to 'YYYY-MM-DD' in local timezone.
 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse a 'YYYY-MM-DD' string safely into a local midnight Date object.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }
  }
  return new Date(dateStr);
}

/**
 * Returns today's date in local 'YYYY-MM-DD' format.
 */
export function getTodayDateStr(): string {
  return formatLocalDate(new Date());
}

/**
 * Formats a 'YYYY-MM-DD' date string to human-friendly local text (e.g. "Monday, Aug 3, 2026")
 */
export function formatHumanDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns the exact Monday-to-Sunday date range and label for any semester week number (1-16).
 */
export function getWeekDateRange(weekNumber: number): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const semStart = parseLocalDate(SEMESTER_START_DATE);
  const start = new Date(semStart);
  start.setDate(semStart.getDate() + (weekNumber - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startStr = formatLocalDate(start);
  const endStr = formatLocalDate(end);
  const startFormatted = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endFormatted = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    startDate: startStr,
    endDate: endStr,
    label: `Week ${weekNumber} (${startFormatted} – ${endFormatted})`,
  };
}

/**
 * Calculates which semester week number (1-16) contains the given date.
 */
export function getWeekNumberFromDate(dateStr: string): number {
  const d = parseLocalDate(dateStr);
  const semStart = parseLocalDate(SEMESTER_START_DATE);
  const diffTime = d.getTime() - semStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 1;
  const weekNum = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(16, weekNum));
}
