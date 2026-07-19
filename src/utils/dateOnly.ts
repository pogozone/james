export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysDateOnly(value: string, days: number): string {
  const dt = parseDateOnly(value);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDateOnly(dt);
}

export function addMonthsDateOnly(value: string, months: number): string {
  const dt = parseDateOnly(value);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth();
  const d = dt.getUTCDate();

  const targetMonthIndex = m + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(d, daysInTargetMonth);

  return formatDateOnly(new Date(Date.UTC(targetYear, targetMonth, clampedDay)));
}

export function isDueTodayDateOnly(value: string): boolean {
  const now = new Date();
  const today = formatDateOnly(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
  return value === today;
}

export function isBeforeTodayDateOnly(value: string): boolean {
  const now = new Date();
  const today = formatDateOnly(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
  return value < today;
}
