export function formatKzt(amount: number, freeLabel: string) {
  if (amount <= 0) return freeLabel;
  return `₸ ${new Intl.NumberFormat("ru-RU").format(amount)}`;
}

export function combineLocalDateTime(date: string, time: string) {
  return `${date}T${time}`;
}

export function addHoursLocal(date: string, time: string, hours: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  value.setHours(value.getHours() + hours);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
