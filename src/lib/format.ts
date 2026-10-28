export const EVENT_TIME_ZONE = "Asia/Almaty";
const ALMATY_OFFSET = "+05:00";

export function formatKzt(amount: number, freeLabel: string) {
  if (amount <= 0) return freeLabel;
  return `₸ ${new Intl.NumberFormat("ru-RU").format(amount)}`;
}

export function dateTimeParts(value: Date) {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    formatted.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour").padStart(2, "0")}:${part("minute").padStart(2, "0")}`,
  };
}

export function combineLocalDateTime(date: string, time: string) {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return `${date}T${normalized}${ALMATY_OFFSET}`;
}

export function addHoursLocal(date: string, time: string, hours: number) {
  const value = new Date(combineLocalDateTime(date, time));
  value.setTime(value.getTime() + hours * 60 * 60 * 1000);
  const parts = dateTimeParts(value);
  return combineLocalDateTime(parts.date, parts.time);
}

export function formatEventDate(
  value: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
) {
  return new Intl.DateTimeFormat(locale, { timeZone: EVENT_TIME_ZONE, ...options }).format(value);
}

export function formatEventTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: EVENT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
