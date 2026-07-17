export function formatMessageTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" })} ${time}`;
}

export function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
