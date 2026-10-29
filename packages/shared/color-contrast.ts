/** WCAG 2.x colour contrast helpers for opaque sRGB colours. */

export type Rgb = { r: number; g: number; b: number };
export type ColorInput = string | Rgb;

/** WCAG AA minimum for normal-size text (1.4.3). */
export const WCAG_AA_TEXT_CONTRAST = 4.5;

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parses `#rgb` or `#rrggbb`; anything else (names, alpha, CSS functions) returns null. */
export function parseHexColor(value: unknown): Rgb | null {
  if (typeof value !== 'string') return null;
  const hex = value.trim();
  if (!HEX_COLOR.test(hex)) return null;
  const digits =
    hex.length === 4
      ? hex
          .slice(1)
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : hex.slice(1);
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16)
  };
}

function rgb(color: ColorInput): Rgb {
  const parsed = typeof color === 'string' ? parseHexColor(color) : color;
  if (!parsed) throw new TypeError(`Invalid color: ${JSON.stringify(color)}`);
  return parsed;
}

const channelHex = (value: number) =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0');

/** Formats a colour as lowercase `#rrggbb`, rounding and clamping each channel. */
export function toHexColor(color: ColorInput): string {
  const { r, g, b } = rgb(color);
  return `#${channelHex(r)}${channelHex(g)}${channelHex(b)}`;
}

/** Same result as CSS `color-mix(in srgb, a <amount>, b)` for opaque colours. */
export function mixColors(a: ColorInput, b: ColorInput, amount: number): Rgb {
  const first = rgb(a);
  const second = rgb(b);
  const weight = Math.min(1, Math.max(0, amount));
  return {
    r: first.r * weight + second.r * (1 - weight),
    g: first.g * weight + second.g * (1 - weight),
    b: first.b * weight + second.b * (1 - weight)
  };
}

function linearChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, from 0 (black) to 1 (white). */
export function relativeLuminance(color: ColorInput): number {
  const { r, g, b } = rgb(color);
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: ColorInput, b: ColorInput): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function lowestContrast(color: ColorInput, backgrounds: readonly ColorInput[]) {
  return Math.min(...backgrounds.map((background) => contrastRatio(color, background)));
}

/**
 * Returns `color` itself when it already reaches `minContrast` against every background;
 * otherwise the closest shade that does, made by mixing it towards black or white (whichever
 * contrasts more) so the hue is kept. Every background here is a light or dark near-surface
 * tint, so one of black and white always reaches the threshold.
 */
export function accessibleTextColor(
  color: ColorInput,
  background: ColorInput | readonly ColorInput[],
  minContrast = WCAG_AA_TEXT_CONTRAST
): string {
  const backgrounds: ColorInput[] = Array.isArray(background)
    ? [...background]
    : [background as ColorInput];
  const text = toHexColor(color);
  if (lowestContrast(text, backgrounds) >= minContrast) return text;
  const extreme =
    lowestContrast(BLACK, backgrounds) >= lowestContrast(WHITE, backgrounds) ? BLACK : WHITE;
  const shade = (amount: number) => toHexColor(mixColors(extreme, text, amount));
  // Contrast grows monotonically as the shade approaches the extreme, so bisect for the
  // smallest amount; checking the rounded hex keeps the returned colour above the threshold.
  let low = 0;
  let high = 1;
  for (let step = 0; step < 24; step++) {
    const middle = (low + high) / 2;
    if (lowestContrast(shade(middle), backgrounds) >= minContrast) high = middle;
    else low = middle;
  }
  const result = shade(high);
  return lowestContrast(result, backgrounds) >= minContrast ? result : shade(1);
}
