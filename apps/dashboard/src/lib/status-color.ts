const defaultStatusColors: Record<string, string> = {
  todo: '#8b8b8b',
  progress: '#d58a32',
  done: '#449a78'
};

/** Status colors are optional; keep every view in sync with the board defaults. */
export function statusColor(status?: { id: string; color?: string }) {
  if (!status) return 'var(--muted)';
  return status.color ?? defaultStatusColors[status.id] ?? '#8777b5';
}
