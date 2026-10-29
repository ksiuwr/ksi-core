import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { contrastRatio, toHexColor, WCAG_AA_TEXT_CONTRAST } from './color-contrast.ts';
import {
  DEFAULT_LABEL_COLOR,
  LABEL_PILL_TINTS,
  LABEL_SURFACES,
  PRESET_LABEL_COLORS,
  labelColorStyle,
  labelPillColors,
  normalizeLabelColor,
  type LabelPillState
} from './label-colors.ts';

const EDGE_COLORS = [
  '#ffff00', // very light yellow
  '#fffde7', // near-white yellow
  '#fffff0', // ivory
  '#ffffff',
  '#fefefe',
  '#000000',
  '#0b0b0b',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#2563eb', // server default blue
  '#7c3aed', // server default violet
  '#16a34a',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
  '#374151',
  '#abcdef',
  '#123456'
];

const STATE_TINTS = Object.entries(LABEL_PILL_TINTS) as [LabelPillState, number][];

function readCssToken(source: string, selector: string, token: string): string {
  const selectorIndex = source.indexOf(selector);
  if (selectorIndex < 0) throw new Error(`Missing CSS selector ${selector}`);
  const block = source.slice(selectorIndex + selector.length, source.indexOf('}', selectorIndex));
  const value = block.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1]?.trim();
  if (!value) throw new Error(`Missing --${token} in ${selector}`);
  return value;
}

function cssFile(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

function generatedHexColors(): string[] {
  const channels = [0, 51, 102, 153, 204, 255];
  const colors: string[] = [];
  for (const r of channels)
    for (const g of channels)
      for (const b of channels)
        colors.push(
          `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        );
  return colors;
}

function randomHexColors(count: number): string[] {
  const colors: string[] = [];
  let seed = 20261029;
  for (let index = 0; index < count; index++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    colors.push(`#${(seed & 0xffffff).toString(16).padStart(6, '0')}`);
  }
  return colors;
}

test('label surfaces mirror the effective dashboard platform tokens', () => {
  const platformKit = cssFile('../ui/platform-kit.css');
  expect(toHexColor(readCssToken(platformKit, ':root {', 'surface'))).toBe(LABEL_SURFACES.light);
  expect(toHexColor(readCssToken(platformKit, ":root[data-theme='dark'] {", 'surface'))).toBe(
    LABEL_SURFACES.dark
  );
});

test('presets are unique valid colours and include the defaults', () => {
  const presets = PRESET_LABEL_COLORS.map((color) => normalizeLabelColor(color));
  expect(new Set(presets).size).toBe(presets.length);
  expect(presets).toContain(DEFAULT_LABEL_COLOR);
  for (const preset of PRESET_LABEL_COLORS) expect(preset).toMatch(/^#[0-9a-f]{6}$/);
});

test('normalization accepts hex input and falls back for unsafe values', () => {
  expect(normalizeLabelColor('#ABC')).toBe('#aabbcc');
  expect(normalizeLabelColor('  #ABCDEF ')).toBe('#abcdef');
  expect(normalizeLabelColor('red')).toBe(DEFAULT_LABEL_COLOR);
  expect(normalizeLabelColor(undefined)).toBe(DEFAULT_LABEL_COLOR);
  expect(normalizeLabelColor(null, '#2563EB')).toBe('#2563eb');
  expect(normalizeLabelColor('invalid', 'also-invalid')).toBe(DEFAULT_LABEL_COLOR);
});

test('every preset and edge colour reaches AA in both themes and all pill states', () => {
  for (const color of [...PRESET_LABEL_COLORS, ...EDGE_COLORS]) {
    const pill = labelPillColors(color);
    for (const [state] of STATE_TINTS) {
      const background = pill.backgrounds[state];
      expect(contrastRatio(pill.text.light, background.light)).toBeGreaterThanOrEqual(
        WCAG_AA_TEXT_CONTRAST
      );
      expect(contrastRatio(pill.text.dark, background.dark)).toBeGreaterThanOrEqual(
        WCAG_AA_TEXT_CONTRAST
      );
    }
  }
});

test('the whole sRGB channel grid and arbitrary colours reach AA', () => {
  for (const color of [...generatedHexColors(), ...randomHexColors(256)]) {
    const pill = labelPillColors(color);
    for (const [state] of STATE_TINTS) {
      expect(contrastRatio(pill.text.light, pill.backgrounds[state].light)).toBeGreaterThanOrEqual(
        WCAG_AA_TEXT_CONTRAST
      );
      expect(contrastRatio(pill.text.dark, pill.backgrounds[state].dark)).toBeGreaterThanOrEqual(
        WCAG_AA_TEXT_CONTRAST
      );
    }
  }
});

test('pill backgrounds preserve the label colour tint and surface', () => {
  const pill = labelPillColors('#2563eb');
  expect(pill.color).toBe('#2563eb');
  for (const [state, tint] of STATE_TINTS) {
    if (tint === 0) {
      expect(pill.backgrounds[state]).toEqual({
        light: LABEL_SURFACES.light,
        dark: LABEL_SURFACES.dark
      });
    } else {
      expect(pill.backgrounds[state].light).not.toBe(LABEL_SURFACES.light);
      expect(pill.backgrounds[state].dark).not.toBe(LABEL_SURFACES.dark);
    }
  }
});

test('inline style exposes deterministic light-dark custom properties', () => {
  const style = labelColorStyle('#F59E0B');
  const variables = Object.fromEntries(
    style.split(';').map((entry) => {
      const separator = entry.indexOf(':');
      return [entry.slice(0, separator), entry.slice(separator + 1)];
    })
  );
  expect(variables['--label-color']).toBe('#f59e0b');
  for (const name of [
    '--label-bg',
    '--label-bg-base',
    '--label-bg-hover',
    '--label-bg-soft',
    '--label-bg-selected',
    '--label-fg'
  ])
    expect(variables[name]).toMatch(/^light-dark\(#[0-9a-f]{6},#[0-9a-f]{6}\)$/);
  expect(labelColorStyle('#f59e0b')).toBe(style);
  expect(labelColorStyle('not-a-colour')).toBe(labelColorStyle(DEFAULT_LABEL_COLOR));
});

test('dashboard label styles use the shared AA variables instead of hsl lightening', () => {
  const files = [
    '../../apps/dashboard/src/lib/dashboard.css',
    '../../apps/dashboard/src/lib/KanbanBoard.svelte',
    '../../apps/dashboard/src/lib/TaskActivity.svelte',
    '../../apps/dashboard/src/lib/views/NewTaskView.svelte'
  ];
  for (const file of files) {
    const source = cssFile(file);
    expect(source).not.toContain('hsl(from');
    expect(source).toContain('var(--label-fg');
  }
});
