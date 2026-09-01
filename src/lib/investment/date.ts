const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function parseIsoDate(value: string): Date {
  if (!isIsoDate(value)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Returns the Friday label for the Monday-to-Sunday week containing `value`. */
export function weekEndingFriday(value: string): string {
  const date = parseIsoDate(value);
  const utcDay = date.getUTCDay();
  const isoDay = utcDay === 0 ? 7 : utcDay;
  date.setUTCDate(date.getUTCDate() + (5 - isoDay));
  return formatIsoDate(date);
}

export function roundNumber(value: number, precision = 6): number {
  const factor = 10 ** precision;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}
