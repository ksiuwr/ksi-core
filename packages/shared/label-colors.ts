import {
  accessibleTextColor,
  mixColors,
  parseHexColor,
  toHexColor,
  WCAG_AA_TEXT_CONTRAST
} from './color-contrast';

/** Colour used for labels without a stored (valid) colour; matches the server default. */
export const DEFAULT_LABEL_COLOR = '#6b7280';

/** Swatches offered by the label editor. Any other `#rrggbb` colour can still be picked. */
export const PRESET_LABEL_COLORS = [
  '#6b7280', // Gray (default)
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#374151' // Slate
] as const;

/**
 * Effective `--surface` of the dashboard platform kit in each theme (the last layer that sets
 * it). Pill backgrounds are emitted as opaque colours, so text contrast also holds where a pill
 * sits on another surface.
 */
export const LABEL_SURFACES = { light: '#ffffff', dark: '#16191c' } as const;

export type LabelTheme = keyof typeof LABEL_SURFACES;

/**
 * Share of the label colour in each pill background, mirroring the `color-mix` weights in
 * `dashboard.css`, `KanbanBoard.svelte`, `TaskActivity.svelte` and `NewTaskView.svelte`.
 */
export const LABEL_PILL_TINTS = {
  base: 0,
  hover: 0.1,
  soft: 0.12,
  badge: 0.14,
  selected: 0.22
} as const;

export type LabelPillState = keyof typeof LABEL_PILL_TINTS;
export type LabelThemeColor = Record<LabelTheme, string>;

export type LabelPillColors = {
  /** Normalized lowercase `#rrggbb` label colour. */
  color: string;
  /** Opaque background for every rendered pill state, per theme. */
  backgrounds: Record<LabelPillState, LabelThemeColor>;
  /** Text colour that reaches WCAG AA against every background above, per theme. */
  text: LabelThemeColor;
};

const DEFAULT_LABEL_RGB = { r: 107, g: 114, b: 128 };

/** Lowercase `#rrggbb` for valid hex input, otherwise `fallback`. */
export function normalizeLabelColor(color: unknown, fallback: string = DEFAULT_LABEL_COLOR) {
  return toHexColor(parseHexColor(color) ?? parseHexColor(fallback) ?? DEFAULT_LABEL_RGB);
}

/**
 * Tinted backgrounds and WCAG AA (4.5:1) text colours for a label pill in both themes. The text
 * keeps the label hue where it is already readable and is otherwise darkened (light theme) or
 * lightened (dark theme) just enough to pass against every pill state.
 */
export function labelPillColors(
  color: unknown,
  minContrast = WCAG_AA_TEXT_CONTRAST
): LabelPillColors {
  const base = normalizeLabelColor(color);
  const backgrounds = {} as Record<LabelPillState, LabelThemeColor>;
  for (const state of Object.keys(LABEL_PILL_TINTS) as LabelPillState[]) {
    const tint = LABEL_PILL_TINTS[state];
    backgrounds[state] = {
      light: toHexColor(mixColors(base, LABEL_SURFACES.light, tint)),
      dark: toHexColor(mixColors(base, LABEL_SURFACES.dark, tint))
    };
  }
  return {
    color: base,
    backgrounds,
    text: {
      light: accessibleTextColor(
        base,
        Object.values(backgrounds).map((pair) => pair.light),
        minContrast
      ),
      dark: accessibleTextColor(
        base,
        Object.values(backgrounds).map((pair) => pair.dark),
        minContrast
      )
    }
  };
}

const lightDark = (pair: LabelThemeColor) => `light-dark(${pair.light},${pair.dark})`;

/**
 * Inline custom properties for a label pill: `--label-color` (raw colour, for dots and borders),
 * opaque backgrounds for each state, and `--label-fg` (AA text). Backgrounds and text use
 * `light-dark()`, so they follow the `color-scheme` that the platform theme sets together with
 * `data-theme`. Values are deterministic, so server-rendered markup hydrates unchanged.
 */
export function labelColorStyle(color: unknown, prefix = 'label'): string {
  const { color: base, backgrounds, text } = labelPillColors(color);
  return [
    `--${prefix}-color:${base}`,
    `--${prefix}-bg:${lightDark(backgrounds.badge)}`,
    `--${prefix}-bg-base:${lightDark(backgrounds.base)}`,
    `--${prefix}-bg-hover:${lightDark(backgrounds.hover)}`,
    `--${prefix}-bg-soft:${lightDark(backgrounds.soft)}`,
    `--${prefix}-bg-selected:${lightDark(backgrounds.selected)}`,
    `--${prefix}-fg:${lightDark(text)}`
  ].join(';');
}
