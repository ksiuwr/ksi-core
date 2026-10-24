export type BoardLabel = {
  name: string;
  color?: string;
  description?: string;
};

export const DEFAULT_LABEL_COLOR = '#6b7280';

export function normalizeBoardLabel(label: string | BoardLabel): BoardLabel {
  if (typeof label === 'string') {
    return { name: label.trim(), color: DEFAULT_LABEL_COLOR };
  }
  return {
    name: label.name.trim(),
    color:
      label.color && /^#[0-9a-fA-F]{6}$/.test(label.color)
        ? label.color.toLowerCase()
        : DEFAULT_LABEL_COLOR,
    description: label.description?.trim() || undefined
  };
}

export function validBoardLabels(labels: (string | BoardLabel)[]): boolean {
  if (!Array.isArray(labels) || labels.length > 50) return false;
  const names = new Set<string>();
  for (const raw of labels) {
    const label = typeof raw === 'string' ? { name: raw } : raw;
    const name = label?.name?.trim();
    if (!name || name.length > 50) return false;
    const lower = name.toLowerCase();
    if (names.has(lower)) return false;
    names.add(lower);
    if (label.color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(label.color)) return false;
    if (label.description !== undefined && label.description.length > 200) return false;
  }
  return true;
}

export function boardLabelNames(labels: (string | BoardLabel)[]): string[] {
  return labels.map((t) => (typeof t === 'string' ? t.trim() : t.name.trim()));
}
