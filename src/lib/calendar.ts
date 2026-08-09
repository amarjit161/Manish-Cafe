export type MonthKey = { year: number; month: number }; // month: 1-12

export function parseMonthParam(param: string | undefined): MonthKey {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthParam({ year, month }: MonthKey): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel({ year, month }: MonthKey): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth({ year, month }: MonthKey, delta: number): MonthKey {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Sunday-first calendar grid: array of weeks, each an array of 7 cells (null = padding). */
export function calendarGrid({ year, month }: MonthKey): (number | null)[][] {
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function todayDateStr(): string {
  const now = new Date();
  return dateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
