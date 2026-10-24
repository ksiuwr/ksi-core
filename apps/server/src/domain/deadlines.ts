const day = 86400000;
export function reminderInterval(dueAt: Date, now: Date): number | null {
  const remaining = dueAt.getTime() - now.getTime();
  if (remaining > 7 * day) return null;
  if (remaining > 3 * day) return 7;
  if (remaining > day) return 3;
  return remaining > 0 ? 1 : 0;
}
