export function formatDateDivider(date: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) {
    return "Today";
  }
  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isDifferentDay(date1: Date, date2: Date) {
  return !isSameDay(date1, date2);
}

export function isYesterday(date: Date) {
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  return isSameDay(date, y);
}

export function formatSeenAt(raw: string | number | Date | null | undefined) {
  if (!raw) return "Seen";
  const d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d.getTime())) return "Seen";

  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (isSameDay(d, new Date())) {
    return `Seen at ${time}`;
  }
  if (isYesterday(d)) {
    return `Seen Yesterday at ${time}`;
  }

  const datePart = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `Seen on ${datePart} at ${time}`;
}